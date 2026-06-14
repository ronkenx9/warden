import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve("packages/dashboard/public");
const out = resolve(process.argv[2] || "warden_demo.mp4");
const fps = Number(process.env.WARDEN_DEMO_FPS || 15);
const width = Number(process.env.WARDEN_DEMO_WIDTH || 1280);
const height = Number(process.env.WARDEN_DEMO_HEIGHT || 720);
const chromePath =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

if (!existsSync(chromePath)) {
  throw new Error(`Chrome not found at ${chromePath}. Set CHROME_PATH to override.`);
}

function once(proc, event) {
  return new Promise((resolveOnce, reject) => {
    proc.once(event, resolveOnce);
    proc.once("error", reject);
  });
}

async function withServer() {
  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const pathname = url.pathname === "/" ? "/demo.html" : url.pathname;
    const file = resolve(root, `.${decodeURIComponent(pathname)}`);

    if (!file.startsWith(root) || !existsSync(file)) {
      res.writeHead(404);
      res.end("not found");
      return;
    }

    res.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream" });
    createReadStream(file).pipe(res);
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  return { server, port: address.port };
}

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed ${response.status}: ${url}`);
  return response.json();
}

async function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolveOpen, reject) => {
    ws.addEventListener("open", resolveOpen, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve: resolveMsg, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message}: ${msg.error.data || ""}`));
      else resolveMsg(msg.result);
    }
  });

  return {
    send(method, params = {}) {
      const msgId = ++id;
      ws.send(JSON.stringify({ id: msgId, method, params }));
      return new Promise((resolveMsg, reject) => pending.set(msgId, { resolve: resolveMsg, reject }));
    },
    close() {
      ws.close();
    },
  };
}

async function main() {
  const frameDir = join(tmpdir(), `warden-demo-frames-${Date.now()}`);
  await mkdir(frameDir, { recursive: true });

  const { server, port } = await withServer();
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--mute-audio",
    "--remote-debugging-port=9223",
    "--user-data-dir=/tmp/warden-demo-chrome",
    `--window-size=${width},${height}`,
    `http://127.0.0.1:${port}/demo.html?capture=1&t=0`,
  ], { stdio: "ignore" });

  try {
    let pageWs;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        const pages = await fetchJson("http://127.0.0.1:9223/json");
        pageWs = pages.find((page) => page.type === "page")?.webSocketDebuggerUrl;
        if (pageWs) break;
      } catch {
        await sleep(250);
      }
    }
    if (!pageWs) throw new Error("Could not connect to Chrome DevTools.");

    const cdp = await connectCdp(pageWs);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}/demo.html?capture=1&t=0` });

    for (let attempt = 0; attempt < 80; attempt += 1) {
      const ready = await cdp.send("Runtime.evaluate", {
        expression: "Boolean(window.__WARDEN_CAPTURE_READY)",
        returnByValue: true,
      });
      if (ready.result.value) break;
      await sleep(100);
    }

    const duration = await cdp.send("Runtime.evaluate", {
      expression: "window.__WARDEN_DEMO_DURATION_MS",
      returnByValue: true,
    });
    const durationMs = Number(duration.result.value);
    const frames = Math.ceil((durationMs / 1000) * fps);

    for (let frame = 0; frame < frames; frame += 1) {
      const ms = Math.round((frame / fps) * 1000);
      await cdp.send("Runtime.evaluate", {
        expression: `window.__WARDEN_RENDER_AT(${ms})`,
        awaitPromise: true,
      });
      const shot = await cdp.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
      });
      await writeFile(join(frameDir, `frame-${String(frame).padStart(5, "0")}.png`), Buffer.from(shot.data, "base64"));
      if (frame % fps === 0) {
        process.stdout.write(`Rendered ${Math.round(frame / fps)}s / ${Math.ceil(durationMs / 1000)}s\r`);
      }
    }
    process.stdout.write("\n");
    cdp.close();

    await new Promise((resolveFfmpeg, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-y",
        "-framerate",
        String(fps),
        "-i",
        join(frameDir, "frame-%05d.png"),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        out,
      ], { stdio: "inherit" });
      ffmpeg.once("exit", (code) => (code === 0 ? resolveFfmpeg() : reject(new Error(`ffmpeg exited ${code}`))));
      ffmpeg.once("error", reject);
    });

    console.log(`Wrote ${out}`);
  } finally {
    chrome.kill("SIGTERM");
    server.close();
    await rm(frameDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { quoteMonitorReward, verifyX402Payment } from "./index.js";
import { loadDotEnv, monitorQuoteConfig, submitViolationFromEnv } from "./live-submit.js";

type Json = Record<string, unknown>;

function send(res: ServerResponse, status: number, body: Json) {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(json),
  });
  res.end(json);
}

async function readJson(req: IncomingMessage): Promise<Json> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Json;
}

function bodyEnv(body: Json): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const [key, value] of Object.entries(body)) {
    if (!key.startsWith("WARDEN_")) continue;
    if (typeof value === "string") env[key] = value;
  }
  return env;
}

await loadDotEnv();

const port = Number(process.env.WARDEN_MONITOR_PORT ?? "8787");
const acceptUnpaid = process.env.WARDEN_ACCEPT_UNPAID_MONITOR_REQUESTS === "1";

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      send(res, 200, { status: "ok", service: "warden-monitor" });
      return;
    }

    if (req.method === "GET" && req.url === "/quote") {
      const quote = monitorQuoteConfig();
      send(res, 402, quoteMonitorReward(quote.resource, quote.asset, quote.payTo));
      return;
    }

    if (req.method === "POST" && req.url === "/violations") {
      const quote = monitorQuoteConfig();
      const paymentQuote = quoteMonitorReward(quote.resource, quote.asset, quote.payTo);
      if (!acceptUnpaid && !req.headers["x-payment"]) {
        send(res, 402, paymentQuote);
        return;
      }
      if (!acceptUnpaid) {
        try {
          verifyX402Payment(String(req.headers["x-payment"]), paymentQuote);
        } catch (error) {
          send(res, 402, {
            error: error instanceof Error ? error.message : String(error),
            ...paymentQuote,
          });
          return;
        }
      }

      const body = await readJson(req);
      const result = await submitViolationFromEnv(bodyEnv(body));
      send(res, 202, { status: "submitted", ...result });
      return;
    }

    send(res, 404, { error: "not found" });
  } catch (error) {
    send(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`WARDEN monitor listening on http://127.0.0.1:${port}`);
  console.log("POST /violations requires x-payment unless WARDEN_ACCEPT_UNPAID_MONITOR_REQUESTS=1.");
});

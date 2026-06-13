import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

type Step = {
  name: string;
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
};

const intervalMs = Number(process.env.WARDEN_DEMO_INTERVAL_MS ?? "900000");
const includeHeavyLocalProofs = process.env.WARDEN_DEMO_HEAVY_LOCAL_PROOFS === "1";
const runOnce = process.env.WARDEN_DEMO_RUN_ONCE === "1";
const stateDir = new URL("../../../.warden/", import.meta.url);

function timestamp() {
  return new Date().toISOString();
}

function runStep(step: Step): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = timestamp();
    console.log(`\n[${startedAt}] ${step.name}`);
    const child = spawn(step.command, step.args, {
      cwd: new URL("../../..", import.meta.url),
      env: { ...process.env, ...step.env },
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        console.log(`[${timestamp()}] PASS ${step.name}`);
        resolve();
      } else {
        reject(new Error(`${step.name} exited with code ${code}`));
      }
    });
    child.on("error", reject);
  });
}

async function cycle(cycleNumber: number) {
  const steps: Step[] = [
    { name: "Live Robinhood read-only status", command: "pnpm", args: ["status:robinhood"] },
    { name: "Policy + x402 monitor demo", command: "pnpm", args: ["demo"] },
  ];

  if (includeHeavyLocalProofs) {
    steps.push(
      { name: "Local E2E slash proof", command: "pnpm", args: ["e2e"] },
      {
        name: "Adversarial swarm proof",
        command: "pnpm",
        args: ["swarm:ci"],
        env: { WARDEN_SWARM_GENERATED_AT: "2026-06-12T00:00:00.000Z" },
      },
    );
  }

  const startedAt = timestamp();
  console.log(`\nWARDEN 24/7 demo operator cycle ${cycleNumber} started at ${startedAt}`);
  for (const step of steps) {
    await runStep(step);
  }

  await mkdir(stateDir, { recursive: true });
  await writeFile(
    new URL("demo-operator.json", stateDir),
    JSON.stringify(
      {
        status: "ok",
        cycle: cycleNumber,
        startedAt,
        completedAt: timestamp(),
        heavyLocalProofs: includeHeavyLocalProofs,
      },
      null,
      2,
    ),
  );
  console.log(`\nWARDEN demo operator cycle ${cycleNumber} complete.`);
}

let cycleNumber = 1;
while (true) {
  try {
    await cycle(cycleNumber);
  } catch (error) {
    console.error(`[${timestamp()}] FAIL demo operator cycle ${cycleNumber}`);
    console.error(error);
  }

  if (runOnce) {
    break;
  }

  cycleNumber += 1;
  console.log(`Sleeping ${Math.round(intervalMs / 1000)}s before next cycle.`);
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}

import { readFile } from "node:fs/promises";
import { getAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const defaultExpectedDeployer = "0x6727A665ef9257E2A4e9A4ED58B9136f62b0E1b1" as const satisfies Address;

async function loadDotEnv() {
  if (process.env.WARDEN_SKIP_DOTENV === "1") {
    return;
  }

  try {
    const env = await readFile(new URL("../../../.env", import.meta.url), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        continue;
      }

      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw error;
    }
  }
}

function privateKeyAccount(name: string) {
  const value = process.env[name];
  if (!value?.match(/^0x[0-9a-fA-F]{64}$/)) {
    throw new Error(`${name} must be set to a hex private key in local .env`);
  }

  return privateKeyToAccount(value as Hex);
}

async function main() {
  await loadDotEnv();

  const deployer = privateKeyAccount("DEPLOYER_PRIVATE_KEY");
  const expectedDeployer = process.env.WARDEN_EXPECTED_DEPLOYER_ADDRESS
    ? getAddress(process.env.WARDEN_EXPECTED_DEPLOYER_ADDRESS)
    : defaultExpectedDeployer;
  const agentKey = process.env.WARDEN_AGENT_PRIVATE_KEY;
  const agent = agentKey ? privateKeyAccount("WARDEN_AGENT_PRIVATE_KEY") : deployer;
  const watchedAgent = process.env.WARDEN_AGENT_ADDRESS
    ? getAddress(process.env.WARDEN_AGENT_ADDRESS)
    : deployer.address;

  console.log("WARDEN Robinhood env check");
  console.log(`DEPLOYER_PRIVATE_KEY address: ${deployer.address}`);
  console.log(`Expected funded deployer: ${expectedDeployer}`);
  console.log(`Agent address: ${agent.address}${agent.address === deployer.address ? " (deployer fallback)" : ""}`);
  console.log(`Watched agent address: ${watchedAgent}`);

  const checks = [
    ["deployer key matches expected deployer wallet", deployer.address.toLowerCase() === expectedDeployer.toLowerCase()],
    ["watched agent matches signing agent", watchedAgent.toLowerCase() === agent.address.toLowerCase()],
  ] as const;

  console.log("");
  console.log("Checks:");
  for (const [label, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  }

  if (checks.some(([, ok]) => !ok)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

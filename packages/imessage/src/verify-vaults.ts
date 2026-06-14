import { createPublicClient, http, type Address } from "viem";
import { robinhood } from "./config.js";

const VAULTS: Record<string, { vault: Address; expectAsset: Address }> = {
  TSLA: { vault: "0x02e658d8F20bbF94d85D0eCC0365Ab4aa5c26Daf", expectAsset: "0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E" },
  AMD: { vault: "0x7f8E3269f6c2DE4394d46c3dacBF12DA21dd2092", expectAsset: "0x71178BAc73cBeb415514eB542a8995b82669778d" },
  AMZN: { vault: "0x212f89c78f6E98AB82B76b9b9f3652b48a16526e", expectAsset: "0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02" },
  PLTR: { vault: "0xb7cbF30123382E7d29E127e974b53868a16Aa20d", expectAsset: "0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0" },
  NFLX: { vault: "0xAA976c519485465f299853019AA780AbD47F77F9", expectAsset: "0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93" },
};
const EXPECT_PE = "0x049527f5331FaeA8f0e9E86be8FDdCB86BdeE1ba".toLowerCase();

const ABI = [
  { type: "function", name: "asset", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "permissionEngine", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

const client = createPublicClient({ chain: robinhood, transport: http(robinhood.rpcUrls.default.http[0]) });

let ok = true;
for (const [sym, { vault, expectAsset }] of Object.entries(VAULTS)) {
  try {
    const [asset, pe] = await Promise.all([
      client.readContract({ address: vault, abi: ABI, functionName: "asset" }) as Promise<Address>,
      client.readContract({ address: vault, abi: ABI, functionName: "permissionEngine" }) as Promise<Address>,
    ]);
    const assetOk = asset.toLowerCase() === expectAsset.toLowerCase();
    const peOk = pe.toLowerCase() === EXPECT_PE;
    if (!assetOk || !peOk) ok = false;
    console.log(
      `${sym.padEnd(5)} vault=${vault}  asset ${assetOk ? "✓" : `✗ got ${asset}`}  PE ${peOk ? "✓" : `✗ got ${pe}`}`,
    );
  } catch (e) {
    ok = false;
    console.log(`${sym.padEnd(5)} vault=${vault}  ✗ read failed: ${(e as Error).message.split("\n")[0]}`);
  }
}
console.log(ok ? "\nALL VAULTS OK — safe to wire single PermissionEngine domain" : "\nMISMATCH — do not wire");
process.exit(ok ? 0 : 1);

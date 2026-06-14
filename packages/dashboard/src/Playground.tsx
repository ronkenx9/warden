import React, { useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  encodeFunctionData,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { ArrowUpRight, Check, Wallet, Zap } from "lucide-react";
import {
  FAUCETS,
  KNOWN_ASSETS,
  POLICY_DOMAIN,
  POLICY_TYPES,
  ROUTER_ABI,
  VAULT_ABI,
  deployment,
  maxEurWei,
  parsePolicy,
  robinhood,
} from "./playground-config.js";

type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
declare global {
  interface Window { ethereum?: Eip1193; }
}

const publicClient = createPublicClient({ chain: robinhood, transport: http() });
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const txUrl = (h: string) => `${robinhood.blockExplorers.default.url}/tx/${h}`;

type Status = { kind: "idle" | "busy" | "ok" | "err"; msg?: string };

export function Playground() {
  const [account, setAccount] = useState<Address | null>(null);
  const [text, setText] = useState("TSLA only, max €50 per trade, no trades between 22:00 and 06:00, valid for 7 days");
  const draft = parsePolicy(text);
  const asset = KNOWN_ASSETS[draft.assetSymbol];

  const [connecting, setConnecting] = useState(false);
  const [activate, setActivate] = useState<Status>({ kind: "idle" });
  const [activateTx, setActivateTx] = useState<Hex | null>(null);
  const [breakStatus, setBreakStatus] = useState<Status>({ kind: "idle" });

  function wallet() {
    if (!window.ethereum) throw new Error("No wallet found. Install MetaMask (or any EIP-1193 wallet) to try this.");
    return createWalletClient({ chain: robinhood, transport: custom(window.ethereum) });
  }

  async function ensureChain() {
    try {
      await window.ethereum!.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xb626" }] });
    } catch {
      await window.ethereum!.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0xb626",
          chainName: robinhood.name,
          nativeCurrency: robinhood.nativeCurrency,
          rpcUrls: robinhood.rpcUrls.default.http,
          blockExplorerUrls: [robinhood.blockExplorers.default.url],
        }],
      });
    }
  }

  async function connect() {
    setConnecting(true);
    try {
      const w = wallet();
      const [addr] = await w.requestAddresses();
      await ensureChain();
      setAccount(addr);
    } catch (e) {
      setActivate({ kind: "err", msg: errMsg(e) });
    } finally {
      setConnecting(false);
    }
  }

  async function signAndActivate() {
    if (!account) return;
    setActivate({ kind: "busy", msg: "Sign the policy in your wallet…" });
    setActivateTx(null);
    try {
      await ensureChain();
      const w = wallet();
      const block = await publicClient.getBlock();
      const policy = {
        owner: account,
        agent: account, // you act as both owner and agent in the playground
        allowedAsset: asset.token,
        maxTradeValueEur: maxEurWei(draft),
        forbiddenStartMinute: draft.forbiddenStartMinute,
        forbiddenEndMinute: draft.forbiddenEndMinute,
        validUntil: block.timestamp + BigInt(draft.validForDays) * 86_400n,
        nonce: BigInt(Date.now()),
      } as const;

      const signature = await w.signTypedData({
        account,
        domain: POLICY_DOMAIN,
        types: POLICY_TYPES,
        primaryType: "Policy",
        message: policy,
      });

      const hash = await w.writeContract({
        account,
        chain: robinhood,
        address: asset.vault,
        abi: VAULT_ABI,
        functionName: "activatePolicy",
        args: [policy, signature],
      });
      setActivate({ kind: "busy", msg: "Activating on Robinhood Chain…" });
      await publicClient.waitForTransactionReceipt({ hash });
      setActivateTx(hash);
      setActivate({ kind: "ok", msg: `Leash active. ${draft.assetSymbol} agent can trade — inside your rule.` });
      setBreakStatus({ kind: "idle" });
    } catch (e) {
      setActivate({ kind: "err", msg: errMsg(e) });
    }
  }

  async function breakIt() {
    if (!account) return;
    setBreakStatus({ kind: "busy", msg: "Attempting a trade above your limit…" });
    try {
      const routerCall = encodeFunctionData({
        abi: ROUTER_ABI,
        functionName: "executeTrade",
        args: [asset.token, parseEther("0.01"), 0n, deployment.usdg, account],
      });
      // valueEur deliberately way over the signed limit -> vault must reject.
      const trade = {
        asset: asset.token,
        valueEur: maxEurWei(draft) + parseEther("1000000"),
        amountIn: parseEther("0.01"),
        minAmountOut: 0n,
        target: deployment.mockRouter,
        data: routerCall,
      } as const;

      // Simulate (eth_call) — reverts before any token moves, no gas, no tx.
      await publicClient.simulateContract({
        account,
        address: asset.vault,
        abi: VAULT_ABI,
        functionName: "execute",
        args: [account, trade],
      });
      // If we get here the vault did NOT block it — should never happen.
      setBreakStatus({ kind: "err", msg: "Unexpected: the trade was not blocked. Did you activate a policy first?" });
    } catch (e) {
      const m = errMsg(e);
      const reason =
        /TradeValueTooHigh/.test(m) ? "TradeValueTooHigh()" :
        /TradingWindowClosed/.test(m) ? "TradingWindowClosed()" :
        /AssetNotAllowed/.test(m) ? "AssetNotAllowed()" :
        /UnauthorizedAgent/.test(m) ? "UnauthorizedAgent()" :
        /PolicyExpired/.test(m) ? "PolicyExpired()" : null;
      if (reason) {
        setBreakStatus({ kind: "ok", msg: `Reverted: ${reason} — 0 tokens moved. The vault enforced your rule.` });
      } else {
        setBreakStatus({ kind: "err", msg: m });
      }
    }
  }

  return (
    <section className="section playground" id="playground">
      <div className="wrap">
        <div className="section-head">
          <span className="section-kicker">Playground · live testnet</span>
          <h2>Put a leash on-chain yourself.</h2>
          <p>
            Connect a wallet, write a rule in plain English, sign it, then try to break it. Everything
            runs on Robinhood Chain testnet — no real funds, and the vault rejects anything outside your
            policy.
          </p>
        </div>

        <div className="pg-grid">
          {/* 1 — faucet */}
          <div className="bezel">
            <div className="core pg-step">
              <div className="pg-num">1</div>
              <h3>Get testnet gas</h3>
              <p className="pg-sub">You only need a little testnet ETH for gas. Grab some from a faucet:</p>
              <div className="pg-faucets">
                {FAUCETS.map((f) => (
                  <a className="pg-faucet" key={f.url} href={f.url} target="_blank" rel="noreferrer">
                    <div>
                      <strong>{f.name}</strong>
                      <span>{f.note}</span>
                    </div>
                    <ArrowUpRight size={16} strokeWidth={1.8} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* 2 — connect */}
          <div className="bezel" data-delay="1">
            <div className="core pg-step">
              <div className="pg-num">2</div>
              <h3>Connect your wallet</h3>
              <p className="pg-sub">We&apos;ll add Robinhood Chain testnet if you don&apos;t have it yet.</p>
              {account ? (
                <div className="pg-connected">
                  <Check size={16} strokeWidth={2} /> {short(account)} · Robinhood Chain
                </div>
              ) : (
                <button className="btn btn-primary pg-btn" onClick={connect} disabled={connecting}>
                  <Wallet size={16} strokeWidth={1.8} /> {connecting ? "Connecting…" : "Connect wallet"}
                </button>
              )}
            </div>
          </div>

          {/* 3 — policy */}
          <div className="bezel col-span" data-delay="2">
            <div className="core pg-step">
              <div className="pg-num">3</div>
              <h3>Write the leash</h3>
              <textarea
                className="pg-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                spellCheck={false}
              />
              <div className="pg-policy">
                <div><span>Asset</span><strong>{draft.assetSymbol}{asset ? "" : " (unsupported)"}</strong></div>
                <div><span>Max / trade</span><strong>€{draft.maxEurLabel}</strong></div>
                <div><span>Blocked hours</span><strong>{draft.forbiddenLabel ?? "none"}</strong></div>
                <div><span>Expires</span><strong>{draft.validForDays}d</strong></div>
              </div>
              <button
                className="btn btn-primary pg-btn"
                onClick={signAndActivate}
                disabled={!account || activate.kind === "busy" || !asset}
              >
                Sign &amp; activate on-chain
              </button>
              <StatusLine s={activate} tx={activateTx} />
            </div>
          </div>

          {/* 4 — break it */}
          <div className="bezel col-span" data-delay="2">
            <div className="core pg-step">
              <div className="pg-num">4</div>
              <h3>Now try to break it</h3>
              <p className="pg-sub">
                We&apos;ll attempt a trade far above your limit. The vault checks the policy in Solidity and
                reverts before any token moves.
              </p>
              <button
                className="btn btn-ghost pg-btn"
                onClick={breakIt}
                disabled={!account || activate.kind !== "ok" || breakStatus.kind === "busy"}
              >
                <Zap size={16} strokeWidth={1.8} /> Attempt an over-limit trade
              </button>
              {activate.kind !== "ok" && (
                <p className="pg-hint">Activate a leash in step 3 first.</p>
              )}
              <StatusLine s={breakStatus} />
            </div>
          </div>
        </div>

        <p className="pg-foot">
          Testnet only · not financial advice · contracts at{" "}
          <a href="https://github.com/ronkenx9/warden" target="_blank" rel="noreferrer">github.com/ronkenx9/warden</a>
        </p>
      </div>
    </section>
  );
}

function StatusLine({ s, tx }: { s: Status; tx?: Hex | null }) {
  if (s.kind === "idle") return null;
  return (
    <div className={`pg-status ${s.kind}`}>
      {s.kind === "busy" && <span className="pg-spin" />}
      {s.kind === "ok" && <Check size={15} strokeWidth={2} />}
      <span>{s.msg}</span>
      {tx && (
        <a href={txUrl(tx)} target="_blank" rel="noreferrer" className="pg-txlink">
          view tx <ArrowUpRight size={13} strokeWidth={2} />
        </a>
      )}
    </div>
  );
}

function errMsg(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  if (/User rejected|denied/i.test(raw)) return "You rejected the request in your wallet.";
  if (/No wallet found/i.test(raw)) return raw;
  // keep it short — surface the first line / revert reason
  return raw.split("\n")[0].slice(0, 160);
}

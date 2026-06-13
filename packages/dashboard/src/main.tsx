import React from "react";
import { createRoot } from "react-dom/client";
import { Bot, Check, CircleDollarSign, Gauge, LockKeyhole, ShieldCheck, X } from "lucide-react";
import swarm from "./swarm-data.json";
import "./styles.css";

const icon = {
  vault: "/img/icon-vault.png",
  incident: "/img/icon-incident.png",
  monitor: "/img/icon-monitor.png",
  slash: "/img/icon-slash.png",
  deploy: "/img/icon-deploy.png",
  permission: "/img/icon-permission.png",
};

type GuardrailStatus = "pass" | "fail";

const policyRules = [
  { label: "Asset", value: "Official Robinhood stock vault", status: "pass" as GuardrailStatus },
  { label: "Max notional", value: "50 EUR per trade", status: "pass" as GuardrailStatus },
  { label: "Blocked window", value: "22:00-06:00 CET", status: "fail" as GuardrailStatus },
  { label: "Delegated caller", value: "YieldAgent session key", status: "pass" as GuardrailStatus },
];

const liveDeployment = [
  { label: "Chain", value: "Robinhood testnet 46630" },
  { label: "TSLA Vault", value: "0x02e6...6Daf" },
  { label: "AMD Vault", value: "0x7f8E...2092" },
  { label: "AMZN Vault", value: "0x212f...526e" },
  { label: "PLTR Vault", value: "0xb7cb...a20d" },
  { label: "NFLX Vault", value: "0xAA97...77F9" },
  { label: "USDG Slash Pool", value: "0x6745...7bbE" },
];

// Agent marketplace + demo timeline are fed by a real autonomous swarm run
// (packages/agent/src/swarm-local.ts -> swarm-data.json). Regenerate with `pnpm swarm`.
const agents = swarm.agents;
const auditTrail = swarm.timeline;

function StatusPill({ status }: { status: GuardrailStatus }) {
  return (
    <span className={`status ${status}`}>
      {status === "pass" ? <Check size={14} /> : <X size={14} />}
      {status === "pass" ? "Satisfied" : "Blocked"}
    </span>
  );
}

function App() {
  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Arbitrum Open House London Buildathon</p>
          <h1 className="heroWordmark">WARDEN</h1>
          <p className="subtitle">Trustless Agent Vault for Tokenized Real-World Assets</p>
          <p className="tagline">Cute agent. Hard leash.</p>
          <div className="heroMetrics" aria-label="demo status">
            <div>
              <ShieldCheck size={24} />
              <strong>27</strong>
              <span>contract tests</span>
            </div>
            <div>
              <LockKeyhole size={24} />
              <strong>0</strong>
              <span>funds moved on violation</span>
            </div>
            <div>
              <CircleDollarSign size={24} />
              <strong>1</strong>
              <span>stock vaults funded</span>
            </div>
          </div>
        </div>
        <div className="heroArt">
          <img
            className="heroGuardian"
            src="/img/mascot-warden-guardian.png"
            alt="WARDEN guardian mascot"
          />
        </div>
      </section>

      <section className="grid topGrid">
        <div className="panel vaultPanel">
          <div className="panelHeader">
            <div>
              <p>Sarah's Vault</p>
              <h2>Official stock policy guard</h2>
            </div>
            <img className="headerIcon" src={icon.vault} alt="" />
          </div>
          <div className="vaultValue">
            <span>Deposited</span>
            <strong>5 vaults</strong>
          </div>
          <div className="rules">
            {policyRules.map((rule) => (
              <div className="rule" key={rule.label}>
                <div>
                  <span>{rule.label}</span>
                  <strong>{rule.value}</strong>
                </div>
                <StatusPill status={rule.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="panel incidentPanel">
          <div className="panelHeader">
            <div>
              <p>Live Incident</p>
              <h2>01:30 CET attempt</h2>
            </div>
            <img className="headerIcon" src={icon.incident} alt="" />
          </div>
          <div className="incidentTop">
            <p className="subhint">Agent tried a blocked-hours swap. The vault said no.</p>
            <img
              className="incidentAgent"
              src="/img/mascot-agent-slashed.png"
              alt="Agent denied and slashed"
            />
          </div>
          <div className="incidentFlow">
            <div>
              <Bot size={19} />
              <span>YieldAgent calls execute()</span>
            </div>
            <div>
              <Gauge size={19} />
              <span>Vault evaluates policy</span>
            </div>
            <div className="reverted">
              <X size={19} />
              <span>TradingWindowClosed()</span>
            </div>
          </div>
          <div className="proofBox">
            <span>Proof hash</span>
            <code>0xdcaadfb1e15b...c12434eb</code>
          </div>
        </div>
      </section>

      <section className="grid middleGrid">
        <div className="panel">
          <div className="panelHeader">
            <div>
              <p>Monitor Market</p>
              <h2>Paid proof submission</h2>
            </div>
            <img className="headerIcon" src={icon.monitor} alt="" />
          </div>
          <div className="monitorRows">
            <div><span>Endpoint</span><strong>/violations/submit</strong></div>
            <div><span>Payment</span><strong>HTTP 402 exact</strong></div>
            <div><span>Network</span><strong>x402-shaped quote</strong></div>
            <div><span>Reward quote</span><strong>1 USDG</strong></div>
          </div>
        </div>

        <div className="panel slashingPanel">
          <div className="panelHeader">
            <div>
              <p>Slash Pool</p>
              <h2>Verified Robinhood deployment</h2>
            </div>
            <img className="headerIcon" src={icon.slash} alt="" />
          </div>
          <div className="slashSplit">
            <div>
              <span>Live readiness</span>
              <strong>100 USDG</strong>
              <small>funded on watched agent</small>
            </div>
            <div>
              <span>After signed proof</span>
              <strong>1 violation</strong>
              <small>recorded by SlashPool</small>
            </div>
          </div>
        </div>

        <div className="panel liveDeployment">
          <div className="panelHeader">
            <div>
              <p>Robinhood Chain</p>
              <h2>Live verified stack</h2>
            </div>
            <img className="headerIcon" src={icon.deploy} alt="" />
          </div>
          <div className="monitorRows">
            {liveDeployment.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <div>
              <p>Permission Engine</p>
              <h2>One signature session</h2>
            </div>
            <img className="headerIcon" src={icon.permission} alt="" />
          </div>
          <div className="signatureBox">
            <span>EIP-712 policy</span>
            <strong>owner + agent + asset + max notional + blocked window + expiry + nonce</strong>
          </div>
        </div>
      </section>

      <section className="grid bottomGrid">
        <div className="panel marketplace">
          <div className="panelHeader">
            <div>
              <p>Agent Marketplace · live swarm</p>
              <h2>Portable identity and reputation</h2>
              <p className="swarmCaption">
                {swarm.agentCount} agents · {swarm.rounds} rounds · {swarm.metrics.allowedTrades} allowed /{" "}
                {swarm.metrics.violationAttempts} blocked · {swarm.metrics.fundsMovedOnViolation} funds moved
              </p>
            </div>
            <img className="headerIcon" src={icon.deploy} alt="" />
          </div>
          <div className="agentList">
            {agents.map((agent) => (
              <div className="agent" key={agent.name}>
                <div className="agentScore">{agent.score}</div>
                <div>
                  <strong>{agent.name}</strong>
                  <span>
                    {agent.personality} · {agent.stake} stake
                  </span>
                </div>
                <div className="agentMeta">
                  <span>{agent.violations} violations</span>
                  <b>{agent.state}</b>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel audit">
          <div className="panelHeader">
            <div>
              <p>Demo Timeline · live swarm</p>
              <h2>Autonomous agents vs. policy</h2>
            </div>
          </div>
          <div className="timeline">
            {auditTrail.map((item) => (
              <div className="timelineItem" key={`${item.time}-${item.actor}`}>
                <span>{item.time}</span>
                <div>
                  <strong>{item.actor}</strong>
                  <p>{item.action}</p>
                </div>
                <em>{item.result}</em>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

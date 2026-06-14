import React, { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Gauge,
  Home,
  LayoutGrid,
  ShieldCheck,
  Star,
  TerminalSquare,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import swarm from "./swarm-data.json";
import { Playground } from "./Playground.js";

const ASSETS = ["TSLA", "AMD", "AMZN", "PLTR", "NFLX"];

export type Listing = {
  name: string;
  strategy: string;
  asset: string;
  reputation: number;
  feeBps: number;
  bond: string;
  allowed: number;
  violations: number;
  trend: number; // 30d, percent
  active: boolean;
};

// Marketplace listings, derived from the live swarm run + deterministic synthetic
// market fields (fee, asset, 30d trend). Reputation/bond/violations are real.
const LISTINGS: Listing[] = swarm.agents.map((a, i) => ({
  name: a.name,
  strategy: a.personality,
  asset: ASSETS[i % ASSETS.length],
  reputation: a.score,
  feeBps: 25 + (i % 5) * 10,
  bond: a.stake,
  allowed: 40 - a.violations * 6,
  violations: a.violations,
  trend: a.violations > 0 ? -(1 + (i % 4)) - 0.4 : 1.2 + (i % 5) * 0.7,
  active: a.violations === 0,
}));

function go(hash: string) {
  window.location.hash = hash;
}

function Sidebar({ active }: { active: "marketplace" | "playground" }) {
  return (
    <aside className="app-sidebar">
      <a className="app-brand" href="#/">
        <span className="leash" /> WARDEN
        <em>v2 · testnet</em>
      </a>
      <nav className="app-nav">
        <a className={active === "marketplace" ? "on" : ""} href="#/marketplace">
          <LayoutGrid size={17} strokeWidth={1.7} /> Marketplace
        </a>
        <a className={active === "playground" ? "on" : ""} href="#/playground">
          <TerminalSquare size={17} strokeWidth={1.7} /> Playground
        </a>
        <a href="#/">
          <Home size={17} strokeWidth={1.7} /> Back to home
        </a>
      </nav>
      <div className="app-side-foot">
        <div className="dot-row"><span className="dot live" /> Robinhood Chain · 46630</div>
        <p>Bonded agents. Policy-enforced. Slashing-backed.</p>
      </div>
    </aside>
  );
}

function Topbar({ title, sub }: { title: string; sub: string }) {
  return (
    <header className="app-topbar">
      <div>
        <span className="app-kick">{sub}</span>
        <h1>{title}</h1>
      </div>
      <div className="app-top-actions">
        <span className="app-badge"><span className="dot live" /> testnet</span>
        <a className="btn btn-primary app-cta" href="#/playground">
          Open Playground
          <span className="cap"><ArrowUpRight size={15} strokeWidth={2} /></span>
        </a>
      </div>
    </header>
  );
}

function FeaturedCard({ l }: { l: Listing }) {
  const up = l.trend >= 0;
  return (
    <div className="mk-card">
      <div className="mk-card-top">
        <div className="mk-tick">{l.asset.slice(0, 4)}</div>
        <div>
          <span className="mk-strategy">{l.strategy} strategy</span>
          <strong>{l.name}</strong>
        </div>
        <span className={`mk-rep ${l.active ? "ok" : "bad"}`}>
          <Star size={12} strokeWidth={2} /> {l.reputation}
        </span>
      </div>
      <div className="mk-stat">
        <span className="k">Usage fee</span>
        <div className="mk-fee">{l.feeBps} <em>bps</em></div>
      </div>
      <div className="mk-card-foot">
        <div className={`mk-trend ${up ? "up" : "down"}`}>
          {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {up ? "+" : ""}{l.trend.toFixed(1)}% 30d
        </div>
        <div className="mk-meta">bond {l.bond}</div>
      </div>
      {l.active ? (
        <a className="mk-rent" href="#/playground">Rent agent</a>
      ) : (
        <span className="mk-slashed">slashed · {l.violations}</span>
      )}
    </div>
  );
}

export function MarketplacePage() {
  const [sort, setSort] = useState<"reputation" | "feeBps" | "bond">("reputation");
  const [asset, setAsset] = useState<string | null>(null);

  const rows = useMemo(() => {
    let r = [...LISTINGS];
    if (asset) r = r.filter((l) => l.asset === asset);
    r.sort((a, b) =>
      sort === "bond" ? Number(b.bond.replace(/\D/g, "")) - Number(a.bond.replace(/\D/g, "")) : (b[sort] as number) - (a[sort] as number),
    );
    return r;
  }, [sort, asset]);

  const featured = useMemo(() => [...LISTINGS].filter((l) => l.active).sort((a, b) => b.reputation - a.reputation).slice(0, 3), []);

  return (
    <div className="app">
      <Sidebar active="marketplace" />
      <main className="app-main">
        <Topbar title="Agent Marketplace" sub="Rent a bonded trading agent" />
        <div className="app-content">
          <section className="mk-section">
            <div className="mk-section-head">
              <h2>Top agents</h2>
              <span className="mk-note">Ranked by on-chain reputation · {LISTINGS.length} listed</span>
            </div>
            <div className="mk-featured">
              {featured.map((l) => <FeaturedCard l={l} key={l.name} />)}
            </div>
          </section>

          <section className="mk-section">
            <div className="mk-section-head">
              <h2>All listings</h2>
              <div className="mk-controls">
                <div className="mk-chips">
                  <button className={asset === null ? "on" : ""} onClick={() => setAsset(null)}>All</button>
                  {ASSETS.map((a) => (
                    <button key={a} className={asset === a ? "on" : ""} onClick={() => setAsset(a)}>{a}</button>
                  ))}
                </div>
                <select className="mk-select" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                  <option value="reputation">Sort: Reputation</option>
                  <option value="feeBps">Sort: Fee</option>
                  <option value="bond">Sort: Bond</option>
                </select>
              </div>
            </div>

            <div className="mk-table">
              <div className="mk-tr mk-th">
                <span>Agent</span><span>Asset</span><span>Reputation</span><span>Bond</span><span>Fee</span><span>30d</span><span></span>
              </div>
              {rows.map((l) => {
                const up = l.trend >= 0;
                return (
                  <div className="mk-tr" key={l.name}>
                    <span className="mk-agent">
                      <span className="mk-tick sm">{l.asset.slice(0, 3)}</span>
                      <span><strong>{l.name}</strong><em>{l.strategy}</em></span>
                    </span>
                    <span className="mono">{l.asset}</span>
                    <span className={`mk-rep ${l.active ? "ok" : "bad"}`}><Star size={11} strokeWidth={2} /> {l.reputation}</span>
                    <span className="mono">{l.bond}</span>
                    <span className="mono">{l.feeBps} bps</span>
                    <span className={`mk-trend ${up ? "up" : "down"}`}>{up ? "+" : ""}{l.trend.toFixed(1)}%</span>
                    <span>
                      {l.active
                        ? <a className="mk-rent sm" href="#/playground">Rent</a>
                        : <span className="mk-slashed sm">slashed</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mk-trust">
            <div className="mk-trust-item"><ShieldCheck size={18} strokeWidth={1.6} /><div><strong>Policy-enforced</strong><span>Every trade reverts on-chain if it breaks your rule.</span></div></div>
            <div className="mk-trust-item"><Gauge size={18} strokeWidth={1.6} /><div><strong>Bond-backed</strong><span>Operators stake collateral; violations pay you.</span></div></div>
            <div className="mk-trust-item"><Check size={18} strokeWidth={1.6} /><div><strong>Reputation that travels</strong><span>ERC-8004 identity carries the track record.</span></div></div>
          </section>
        </div>
      </main>
    </div>
  );
}

export function PlaygroundPage() {
  return (
    <div className="app">
      <Sidebar active="playground" />
      <main className="app-main">
        <Topbar title="Playground" sub="Put a leash on-chain yourself" />
        <div className="app-content">
          {/* the Playground section renders its own full flow */}
          <Playground />
        </div>
      </main>
    </div>
  );
}

export { go };

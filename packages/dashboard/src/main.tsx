import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  Ban,
  Check,
  Fingerprint,
  MessageSquare,
  Radio,
  ScrollText,
  Vault,
} from "lucide-react";
import swarm from "./swarm-data.json";
import "./styles.css";

/* ----------------------------------------------------------------
   Live data. Vault addresses are the on-chain per-asset ERC-4626
   vaults verified in packages/imessage (verify:vaults). Marketplace
   + timeline come from a real autonomous swarm run (pnpm swarm).
   ---------------------------------------------------------------- */
const vaults = [
  { sym: "TSLA", addr: "0x02e6…6Daf" },
  { sym: "AMD", addr: "0x7f8E…2092" },
  { sym: "AMZN", addr: "0x212f…526e" },
  { sym: "PLTR", addr: "0xb7cb…a20d" },
  { sym: "NFLX", addr: "0xAA97…77F9" },
];

const steps = [
  {
    idx: "01",
    title: "Sign one policy",
    body: "The owner signs a single EIP-712 policy: which asset, max notional per trade, blocked hours, expiry. One signature, no per-trade approvals.",
    code: "PermissionEngine",
  },
  {
    idx: "02",
    title: "The agent is delegated",
    body: "A session key lets the agent act — but only through the vault. It never holds the keys to the funds. Self-custody stays with the owner.",
    code: "session key",
  },
  {
    idx: "03",
    title: "Violations revert",
    body: "Every trade is checked in Solidity before execution. Wrong asset, over-limit, or off-hours and the vault reverts. No funds move.",
    code: "TradingWindowClosed()",
  },
  {
    idx: "04",
    title: "Slash and remember",
    body: "A monitor proves the attempt, the agent's collateral is slashed to the owner, and the violation is recorded on its portable ERC-8004 identity.",
    code: "SlashPool",
  },
];

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    el.querySelectorAll(".reveal").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return ref;
}

function Nav() {
  return (
    <nav className="nav">
      <a className="brand" href="#top">
        <span className="leash" /> WARDEN
      </a>
      <div className="nav-links">
        <a href="#mechanism">Mechanism</a>
        <a href="#live">Live on Robinhood</a>
        <a href="#swarm">Swarm</a>
        <a href="#waitlist">Text the leash</a>
      </div>
    </nav>
  );
}

function Hero() {
  const ref = useReveal<HTMLElement>();
  return (
    <header className="hero" id="top" ref={ref}>
      <div className="hero-plate" aria-hidden />
      <div className="wrap hero-inner">
        <h1 className="hero-wordmark">WARDEN</h1>
      </div>
    </header>
  );
}

const INTRO_TEXT =
  "WARDEN is the hard leash for autonomous money. Your agent gets room to move, but a wall it can't cross. You sign the policy once; the vault enforces it on every trade, onchain, before a single token leaves.";
const INTRO_EMPHASIS = new Set(["leash", "wall", "cross", "onchain", "vault"]);

function Intro() {
  const ref = useRef<HTMLDivElement>(null);
  const words = INTRO_TEXT.split(" ");

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const spans = Array.from(section.querySelectorAll<HTMLElement>(".w"));
    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      const p = total > 0 ? scrolled / total : 0;
      // light slightly ahead of scroll so the last words finish before the section leaves
      const lit = Math.round(p * spans.length * 1.18);
      spans.forEach((s, i) => s.classList.toggle("lit", i < lit));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="intro" id="intro" ref={ref}>
      <div className="intro-sticky">
        <div className="wrap">
          <span className="section-kicker">What WARDEN is</span>
          <p className="intro-copy">
            {words.map((word, i) => {
              const clean = word.replace(/[^a-zA-Z-]/g, "").toLowerCase();
              const em = INTRO_EMPHASIS.has(clean);
              return (
                <span className={`w${em ? " em" : ""}`} key={`${word}-${i}`}>
                  {word}
                  {i < words.length - 1 ? " " : ""}
                </span>
              );
            })}
          </p>
        </div>
      </div>
    </section>
  );
}

function Mechanism() {
  const ref = useReveal<HTMLElement>();
  return (
    <section className="section mechanism" id="mechanism" ref={ref}>
      <div className="plate-bg plate-constraint" aria-hidden />
      <div className="wrap">
        <div className="section-head reveal">
          <span className="section-kicker">The mechanism</span>
          <h2>A policy the agent cannot break.</h2>
          <p>
            Autonomy is useful right up until it isn&apos;t. WARDEN gives an agent room to act and a
            wall it can&apos;t cross — enforced on-chain, not by trust in the bot.
          </p>
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <div className="step bezel reveal" data-delay={String((i % 3) + 1)} key={s.idx}>
              <div className="core">
                <span className="idx">{s.idx}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <code>{s.code}</code>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Live() {
  const ref = useReveal<HTMLElement>();
  return (
    <section className="section" id="live" ref={ref}>
      <div className="wrap">
        <div className="section-head reveal">
          <span className="section-kicker">Live · Robinhood Chain testnet 46630</span>
          <h2>Five tokenized stocks. One hard leash each.</h2>
          <p>
            Each asset has its own ERC-4626 vault, every one verified on-chain to share a single
            permission engine. This is deployed and running — not a slide.
          </p>
        </div>

        <div className="bento">
          <div className="col-5 bezel reveal">
            <div className="core">
              <div className="card-label">
                <div>
                  <span className="k">Per-asset vaults</span>
                  <h3>Funded &amp; verified</h3>
                </div>
                <Vault size={22} strokeWidth={1.5} />
              </div>
              <div className="vaults">
                {vaults.map((v) => (
                  <div className="vault-row" key={v.sym}>
                    <span className="sym">
                      <span className="tick">{v.sym.slice(0, 4)}</span>
                      {v.sym}
                    </span>
                    <span className="addr">{v.addr}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-7 bezel reveal" data-delay="1">
            <div className="core">
              <div className="card-label">
                <div>
                  <span className="k">Live incident · 01:30 CET</span>
                  <h3>The agent tried. The vault said no.</h3>
                </div>
                <Ban size={22} strokeWidth={1.5} />
              </div>
              <div className="revert-flow">
                <div className="flow-step">
                  <Radio size={18} strokeWidth={1.5} /> YieldAgent calls execute() on a blocked-hours swap
                </div>
                <div className="flow-step">
                  <ScrollText size={18} strokeWidth={1.5} /> Vault evaluates the signed policy in Solidity
                </div>
                <div className="flow-step revert">
                  <Ban size={18} strokeWidth={1.5} /> revert TradingWindowClosed() — 0 tokens moved
                </div>
              </div>
              <div className="proof">
                <span className="k">On-chain proof hash</span>
                <code>0xdcaadfb1e15b…c12434eb</code>
              </div>
            </div>
          </div>

          <div className="col-4 bezel reveal">
            <div className="core">
              <div className="card-label">
                <div>
                  <span className="k">Slash pool</span>
                  <h3>Skin in the game</h3>
                </div>
              </div>
              <div className="split">
                <div>
                  <span className="k">Collateral</span>
                  <strong>100</strong>
                  <small>USDG staked on the watched agent</small>
                </div>
                <div>
                  <span className="k">On proof</span>
                  <strong>1</strong>
                  <small>violation slashed to the owner</small>
                </div>
              </div>
            </div>
          </div>

          <div className="col-4 bezel reveal" data-delay="1">
            <div className="core">
              <div className="card-label">
                <div>
                  <span className="k">Monitor market</span>
                  <h3>Paid proof submission</h3>
                </div>
              </div>
              <div className="kv">
                <div>
                  <span className="k">endpoint</span>
                  <span className="v mono">/violations/submit</span>
                </div>
                <div>
                  <span className="k">payment</span>
                  <span className="v">HTTP 402 exact</span>
                </div>
                <div>
                  <span className="k">network</span>
                  <span className="v">x402-shaped quote</span>
                </div>
                <div>
                  <span className="k">reward</span>
                  <span className="v">1 USDG</span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-4 bezel reveal" data-delay="2">
            <div className="core">
              <div className="card-label">
                <div>
                  <span className="k">Permission engine</span>
                  <h3>One signature</h3>
                </div>
                <Fingerprint size={22} strokeWidth={1.5} />
              </div>
              <div className="policy-string">
                owner + agent + asset + maxNotional + blockedWindow + expiry + nonce
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Swarm() {
  const ref = useReveal<HTMLElement>();
  const m = swarm.metrics;
  return (
    <section className="section" id="swarm" ref={ref}>
      <div className="wrap">
        <div className="section-head reveal">
          <span className="section-kicker">Autonomous swarm · {swarm.agentCount} agents · {swarm.rounds} rounds</span>
          <h2>We let a swarm of agents attack it.</h2>
          <p>
            {m.allowedTrades} allowed trades, {m.violationAttempts} violation attempts,{" "}
            {m.fundsMovedOnViolation} funds moved. Reputation tracks the leash — automatically.
          </p>
        </div>
        <div className="swarm-grid">
          <div className="bezel reveal">
            <div className="core">
              <div className="card-label">
                <div>
                  <span className="k">Agent marketplace</span>
                  <h3>Portable identity &amp; reputation</h3>
                </div>
              </div>
              <div className="agent-list">
                {swarm.agents.map((a) => (
                  <div className="agent" key={a.name}>
                    <div className="score">{a.score}</div>
                    <div className="who">
                      <strong>{a.name}</strong>
                      <span>
                        {a.personality} · {a.stake} stake
                      </span>
                    </div>
                    <div className="meta">
                      <span>{a.violations} violations</span>
                      <b className={a.violations > 0 ? "bad" : "ok"}>{a.state}</b>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bezel reveal" data-delay="1">
            <div className="core">
              <div className="card-label">
                <div>
                  <span className="k">Demo timeline</span>
                  <h3>Agents vs. policy, live</h3>
                </div>
              </div>
              <div className="timeline">
                {swarm.timeline.map((t) => (
                  <div className="tl-item" key={`${t.time}-${t.actor}`}>
                    <time>{t.time}</time>
                    <div className="body">
                      <strong>{t.actor}</strong>
                      <p>{t.action}</p>
                    </div>
                    <span className="res">{t.result}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WAITLIST_ENDPOINT = import.meta.env.VITE_WAITLIST_ENDPOINT as string | undefined;
const STORE_KEY = "warden_waitlist";

function Waitlist() {
  const ref = useReveal<HTMLElement>();
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(() =>
    typeof localStorage !== "undefined" && Boolean(localStorage.getItem(STORE_KEY)),
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email so we can reach you.");
      return;
    }
    setError("");
    setSubmitting(true);
    const payload = { email: email.trim(), imessage: handle.trim(), source: "warden-landing", ts: Date.now() };
    try {
      if (WAITLIST_ENDPOINT) {
        const res = await fetch(WAITLIST_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(String(res.status));
      }
      // Persist locally either way so the slot is held and the demo is repeatable.
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(payload));
      } catch {
        /* storage may be blocked; non-fatal */
      }
      setDone(true);
    } catch {
      setError("We couldn't reach the waitlist. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section waitlist" id="waitlist" ref={ref}>
      <div className="plate-bg plate-bloom" aria-hidden />
      <div className="wrap">
        <div className="core-grid">
          <div className="reveal">
            <span className="coming-badge">
              <MessageSquare size={13} strokeWidth={1.8} /> Coming soon
            </span>
            <h2>Set up an agent by texting.</h2>
            <p className="lede">
              The next WARDEN front door is iMessage. Describe the leash in plain English; we turn it
              into a signed on-chain policy and spin up your agent. No dashboard, no seed phrase
              gymnastics. Join the waitlist for early access.
            </p>
            <div className="imsg" aria-hidden>
              <div className="bubble in">TSLA only, max €50 a trade, nothing between 10pm and 6am.</div>
              <div className="bubble out">Leash set. Sign to activate your agent on Robinhood Chain →</div>
            </div>
          </div>

          <div className="form-card bezel reveal" data-delay="1">
            <div className="core">
              {done ? (
                <div className="success">
                  <span className="ring">
                    <Check size={26} strokeWidth={2} />
                  </span>
                  <h3>You&apos;re on the list.</h3>
                  <p>We&apos;ll text you the moment the iMessage front door opens.</p>
                </div>
              ) : (
                <form onSubmit={submit} noValidate>
                  <label htmlFor="wl-email">Email</label>
                  <input
                    id="wl-email"
                    className={`field${error && !EMAIL_RE.test(email.trim()) ? " invalid" : ""}`}
                    type="email"
                    inputMode="email"
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={Boolean(error)}
                  />
                  <label htmlFor="wl-handle">iMessage number · optional</label>
                  <input
                    id="wl-handle"
                    className="field"
                    type="tel"
                    placeholder="+1 …"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                  />
                  {error && <span className="field-error">{error}</span>}
                  <button className="btn btn-primary" type="submit" disabled={submitting}>
                    {submitting ? "Joining…" : "Join the waitlist"}
                  </button>
                  <p className="form-note">
                    Early access to the texting front door. No spam — one message when it ships.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="leash-beam" aria-hidden />
        <div className="footer-top">
          <div className="brand-xl">
            WARDEN
            <span>Cute agent. Hard leash.</span>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <span className="h">Protocol</span>
              <a href="#mechanism">Mechanism</a>
              <a href="#live">Live deployment</a>
              <a href="#swarm">Swarm proof</a>
            </div>
            <div className="footer-col">
              <span className="h">Coming soon</span>
              <a href="#waitlist">Text the leash</a>
              <a href="#waitlist">Join waitlist</a>
            </div>
            <div className="footer-col">
              <span className="h">Chain</span>
              <a href="https://explorer.testnet.chain.robinhood.com" target="_blank" rel="noreferrer">
                Robinhood explorer
              </a>
            </div>
          </div>
        </div>
        <div className="footer-base">
          <span>Built for the Arbitrum Open House London Buildathon · Robinhood Chain testnet 46630.</span>
          <span>Testnet only. Not financial advice.</span>
        </div>
      </div>
    </footer>
  );
}

function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Intro />
        <Mechanism />
        <Live />
        <Swarm />
        <Waitlist />
      </main>
      <Footer />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

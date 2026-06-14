# WARDEN v2 — Product Requirements Document

**Bonded agent marketplace for tokenized real-world assets.**

> v1 was "put a leash on your agent." v2 is the realization that the leash only
> has teeth between strangers. WARDEN v2 is a **two-sided marketplace**: builders
> publish trading agents and stake a bond; users rent those agents under a policy
> the vault enforces. Good agents earn fees and reputation; agents that break the
> policy are slashed and remembered.

Status: PRD / in progress. Supersedes the solo framing in `docs/final-submission.md` (kept as the v1 record).

---

## 1. The insight that drives v2

Slashing is meaningless when the agent operator and the fund owner are the same
person — you'd be slashing yourself. Collateral + slashing is a **trust bridge
between strangers**. It only creates value when:

- a **third party** built the agent and staked the bond, and
- a **different user** is the one whose funds are at risk.

That single observation reshapes the product. WARDEN isn't a personal safety
wrapper — it's the **trust layer for an agent rental economy**. Every
accountability primitive already shipped (SlashPool bond, ERC-8004 *portable*
reputation, x402 monitor market, multi-agent swarm) only fully makes sense in a
marketplace. v2 names the market and closes the economic loop with fees.

---

## 2. The two-sided market

### Supply side — Agent Operators (builders)
- Build a trading agent (off-chain logic; any strategy).
- Register an **ERC-8004 identity** (portable, carries reputation across every
  user and vault it serves).
- Stake a **bond** (USDG) in `SlashPool` — skin in the game.
- **List** the agent in the marketplace: strategy description, asset scope, and
  **fee terms**.
- Earn **rental/usage fees** from every renter. The most-used, best-behaved
  agents earn the most.

### Demand side — Renters (users)
- Don't know how to build an agent — and shouldn't have to.
- Browse the marketplace, rank by **reputation, bond size, fee, and track record**.
- Deposit funds, pick an agent, and sign a **policy** scoping exactly what that
  agent may do (asset, max/trade, hours, expiry).
- Pay the agent's **fee** for the service.
- Are protected: the vault reverts any off-policy action, and if the agent
  cheats, **its bond pays the renter** and the violation scars its reputation.

### The self-regulating loop
```
good behavior → reputation ↑ → more renters → more fees → bigger bond → higher rank
bad behavior  → slash → reputation ↓ → fewer renters → less fees → delisted
```
The market prices trust. Users never have to trust a stranger's code — they
trust the bond and the on-chain track record.

---

## 3. The fee model (the v2 addition)

Fees are what make the supply side rational. v2 ships **one** fee mechanism;
the others are roadmap.

| Model | How it works | v2? |
|---|---|---|
| **Per-use fee** (chosen for v2) | A basis-point cut of each *allowed* trade's value is routed to the operator at execution. Blocked trades pay nothing. | ✅ MVP |
| Subscription | Renter escrows a flat fee per period; streams to operator while active. | roadmap |
| Performance fee | Operator takes a cut of realized PnL (needs oracle valuation). | roadmap |

**Per-use fee rules:**
- Fee is charged **only on successful `execute()`** — a reverted (policy-violating)
  trade earns the operator nothing. Operators are paid for *useful, compliant*
  actions only.
- Fee bps is set by the operator at listing, bounded by a protocol cap
  (e.g. ≤ 100 bps) so listings can't be predatory.
- Fee is taken from the trade flow inside the vault and credited to the operator's
  claimable balance (pull-payment, not push — reentrancy-safe).
- The renter sees the fee **before** signing the policy. No surprise fees.

This makes the incentives align perfectly with the safety model: **the only way an
operator earns is by acting inside the user's policy.** Cheating earns zero and
costs the bond.

---

## 4. Lifecycle (end to end)

1. **Operator onboarding** — register ERC-8004 identity → stake bond → list
   (strategy, asset scope, fee bps).
2. **Discovery** — renter browses marketplace, sorted by reputation/bond/fee.
3. **Rent** — renter deposits into the asset vault, signs an EIP-712 policy naming
   the chosen agent, accepts the fee.
4. **Operation** — agent calls `execute()`; allowed trades run and pay the fee;
   off-policy trades revert with a stable reason code (`TradeValueTooHigh`,
   `TradingWindowClosed`, …).
5. **Enforcement** — a monitor proves any violation (x402 paid submission) →
   `SlashPool` slashes the agent's bond to the renter → violation recorded on the
   agent's ERC-8004 identity.
6. **Settlement** — operator claims accrued fees; renter withdraws funds anytime
   (withdrawals are never gated by policy).

---

## 5. Contracts

### Existing (reused unchanged)
- `WARDENVault` (ERC-4626) — custody + policy-gated execution.
- `PermissionEngine` — EIP-712 signed policy.
- `AgentIdentityRegistry` (ERC-8004) — portable identity + violation history → the
  marketplace's reputation/rating layer.
- `SlashPool` (Solidity + Rust/Stylus) — the bond and slashing → the marketplace's
  trust collateral.
- Monitor (x402) — incentivized violation catching.

### New in v2
- **`AgentMarketplace`** — listing registry: `agentId → {operator, asset scope,
  feeBps, minBond, strategyURI, active}`. Enforces the fee cap and minimum bond.
  Read-heavy; ranking computed off-chain from reputation + bond + usage.
- **Fee accounting** — extend the execution path so each *allowed* `execute()`
  credits `feeBps` of trade value to `operatorFees[operator]` (claimable, pull
  payment). New event `FeeAccrued(agentId, operator, amount)`.
- **`FeeVault`/claim** — operators call `claimFees()` to withdraw accrued fees.

> **Security note:** these contracts move money. They must be implemented with
> tests + invariants and pass an independent review **before** any deployment to a
> live chain. Per-use fee math, the fee cap, pull-payment claim, and the
> interaction with slashing are the high-risk surfaces. Do **not** deploy
> fee contracts to prod until audited.

### Invariants to test
- Fee accrues **iff** the trade was allowed (no fee on revert).
- `feeBps ≤ CAP` always; listing with a higher fee reverts.
- `operatorFees` can only be increased by the router on allowed execution, and
  decreased only by the operator claiming exactly their balance.
- A slashed agent's renter is made whole from the bond; fee balances are untouched
  by slashing (separate ledgers).
- Renter withdrawals are never blocked by policy, fees, or pause of new activity.

---

## 6. Frontend (v2)

- **Agent Marketplace** section (reframes the existing swarm panel): each agent
  card shows operator, strategy, **bond**, **fee**, **reputation score**,
  violations, and a **Rent** affordance.
- **Playground → "rent an agent"**: pick a listed agent, set your policy, sign,
  and watch enforcement — the existing playground flow, now framed as renting.
- **Operator view (roadmap)**: list an agent, stake a bond, claim fees.
- Copy across hero/intro/mechanism reframed to the two-sided market: *"You don't
  build the agent. Someone else does — and stakes a bond so you can trust it."*

---

## 7. Scope — in vs out for v2 submission

**In (this iteration):**
- PRD (this doc).
- Marketplace **frontend** reframe + rent framing.
- Fee/marketplace **contract spec + invariants** (above).

**Out (gated next steps, require audit-before-deploy):**
- Deploying `AgentMarketplace` + fee accounting to Robinhood Chain.
- Subscription / performance-fee models.
- Operator onboarding UI (list/stake/claim).
- On-chain ranking.

---

## 7b. Self-audit findings (AgentMarketplace)
A `/code-review` pass on the fee contract surfaced four items; the security-
relevant ones are now fixed:
- ✅ **Fixed** — listing hijack: `list()` binds an `agentId` to its first
  operator; others can't overwrite it.
- ✅ **Fixed** — budget scoping: `feeBudget` is now per `(renter, agentId)`.
  Deposits/withdrawals/recording are agent-scoped, so a router can only spend a
  renter's budget on an agent they explicitly funded. (`testBudgetIsScopedPerAgent`)
- ✅ **Clarified** — `recordTrade`'s value param is `tradeValueInFeeToken`: the
  router converts the EUR policy value to fee-token units; the contract never
  mixes decimals.
- 📝 **Assumption** — the conservation invariant assumes a non-deflationary fee
  token (USDG qualifies).

16 tests pass, incl. fuzz fee-math/conservation, per-agent isolation, and the
fee-iff-allowed integration test. No external audit needed for testnet.

## 8. Risks & mitigations
- **Money-contract risk** — new fee logic is the highest-risk surface. Mitigation:
  tests + invariants + independent audit before deploy; pull-payments; fee cap.
- **Predatory listings** — fee cap + minimum bond + visible fee before signing.
- **Sybil agents** — bond requirement raises the cost of fake listings; reputation
  is earned over real usage, not claimable.
- **Over-claiming at hackathon** — ship the marketplace *primitives* + narrative,
  not a fully built operator economy. The swarm demo stands in as multi-agent proof.

---

## 9. Differentiation vs single-user covenants
Competing "enforceable authority" projects are **single-user**: I write a covenant
for *my* agent. WARDEN v2 is a **market**: bonded third-party agents, portable
cross-user reputation, usage fees, and slashing that actually pays a counterparty.
That two-sided economy — not policy-feature count — is the defensible position.

---

## 10. Milestones
1. ✅ PRD + marketplace frontend + fee spec (this iteration).
2. ⏳ `AgentMarketplace` + fee accounting contracts + tests/invariants.
3. ⏳ Independent audit of the fee/marketplace contracts.
4. ⏳ Deploy to Robinhood Chain testnet (gated on audit).
5. ⏳ Operator onboarding UI (list / stake / claim).

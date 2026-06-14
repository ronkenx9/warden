import { parseEther } from "viem";
import { parsePolicy } from "./parse.js";
import { newSession, reduce } from "./session.js";
import { ASSET_VAULTS, deployment } from "./config.js";

let passed = 0;
let failed = 0;

function assert(cond: boolean, label: string) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

function eq<T>(actual: T, expected: T, label: string) {
  assert(actual === expected, `${label} (got ${String(actual)}, want ${String(expected)})`);
}

// --- Parser: the canonical Sarah policy ---
{
  const p = parsePolicy("TSLA only, max €50 per trade, no trades between 22:00 and 06:00, valid for 7 days");
  eq(p.assetSymbol, "TSLA", "asset symbol");
  eq(p.allowedAsset, deployment.tsla, "asset address resolves to live TSLA");
  eq(p.maxTradeValueEur, parseEther("50"), "max value 50 EUR");
  eq(p.forbiddenStartMinute, 22 * 60, "forbidden start 22:00");
  eq(p.forbiddenEndMinute, 6 * 60, "forbidden end 06:00");
  eq(p.validForDays, 7, "validity 7 days");
  assert(p.understood.includes("tradingWindow"), "trading window understood");
}

// --- Parser: each asset routes to its OWN vault (not a shared one) ---
{
  const tsla = parsePolicy("TSLA only, €50");
  eq(tsla.vault, ASSET_VAULTS.tsla, "TSLA -> TSLA vault");
  const amd = parsePolicy("AMD only, €50");
  eq(amd.allowedAsset, deployment.amd, "AMD asset resolves");
  eq(amd.vault, ASSET_VAULTS.amd, "AMD -> AMD vault");
  const nflx = parsePolicy("just NFLX, max €20");
  eq(nflx.vault, ASSET_VAULTS.nflx, "NFLX -> NFLX vault");
  assert(amd.vault !== tsla.vault, "different assets get different vaults");
}

// --- Parser: switching asset mid-edit re-routes the vault ---
{
  let r = reduce(newSession("+1"), "TSLA, €50, no trades 22:00 to 06:00");
  eq(r.session.draft!.vault, ASSET_VAULTS.tsla, "starts on TSLA vault");
  r = reduce(r.session, "actually use AMZN instead");
  eq(r.session.draft!.allowedAsset, deployment.amzn, "edit switches asset to AMZN");
  eq(r.session.draft!.vault, ASSET_VAULTS.amzn, "edit re-routes to AMZN vault");
  eq(r.session.draft!.forbiddenStartMinute, 22 * 60, "edit preserves prior window");
}

// --- Parser: 12h clock + 'don't trade from X to Y' phrasing ---
{
  const p = parsePolicy("max 100 eur, don't trade from 10pm to 6am");
  eq(p.maxTradeValueEur, parseEther("100"), "max 100 EUR");
  eq(p.forbiddenStartMinute, 22 * 60, "10pm -> 1320");
  eq(p.forbiddenEndMinute, 6 * 60, "6am -> 360");
}

// --- Parser: defaults when fields omitted ---
{
  const p = parsePolicy("just trade TSLA for me");
  eq(p.maxTradeValueEurLabel, "50", "default max 50");
  eq(p.forbiddenLabel, null, "no window -> always-on");
  assert(p.defaulted.includes("maxTradeValue"), "max value defaulted");
  assert(p.defaulted.includes("tradingWindow"), "window defaulted");
}

// --- Parser: weeks validity ---
{
  const p = parsePolicy("TSLA, €25, valid for 2 weeks");
  eq(p.validForDays, 14, "2 weeks -> 14 days");
}

// --- Parser: official Robinhood stock token aliases ---
{
  const amd = parsePolicy("AMD only, max €20");
  eq(amd.assetSymbol, "AMD", "AMD asset symbol");
  eq(amd.allowedAsset, deployment.amd, "AMD resolves to official Robinhood CA");
  assert(amd.assetLive, "AMD is marked live");

  const amzn = parsePolicy("AMZN only, max €20");
  eq(amzn.assetSymbol, "AMZN", "AMZN asset symbol");
  eq(amzn.allowedAsset, deployment.amzn, "AMZN resolves to official Robinhood CA");
  assert(amzn.assetLive, "AMZN is marked live");

  const pltr = parsePolicy("PLTR only, max €20");
  eq(pltr.assetSymbol, "PLTR", "PLTR asset symbol");
  eq(pltr.allowedAsset, deployment.pltr, "PLTR resolves to official Robinhood CA");
  assert(pltr.assetLive, "PLTR is marked live");

  const nflx = parsePolicy("NFLX only, max €20");
  eq(nflx.assetSymbol, "NFLX", "NFLX asset symbol");
  eq(nflx.allowedAsset, deployment.nflx, "NFLX resolves to official Robinhood CA");
  assert(nflx.assetLive, "NFLX is marked live");
}

// --- Session: confirmation gate must precede commit ---
{
  let s = newSession("+15551234567");
  let r = reduce(s, "hi");
  assert(!r.reply.commit, "greeting does not commit");

  r = reduce(r.session, "TSLA only, max €50, no trades between 22:00 and 06:00");
  s = r.session;
  eq(s.stage, "drafted", "policy text -> drafted");
  assert(!r.reply.commit, "drafting does not commit");
  assert(r.reply.text.includes("Reply YES"), "draft asks for confirmation");

  // An edit before confirming re-drafts, never commits.
  r = reduce(s, "actually make it €30");
  s = r.session;
  eq(s.stage, "drafted", "edit stays drafted");
  eq(s.draft!.maxTradeValueEurLabel, "30", "edit updates max value");
  // Edit must PATCH, not replace: the 22:00–06:00 window set earlier survives.
  eq(s.draft!.forbiddenStartMinute, 22 * 60, "edit preserves prior window start");
  eq(s.draft!.forbiddenEndMinute, 6 * 60, "edit preserves prior window end");
  assert(!r.reply.commit, "edit does not commit");

  // YES commits.
  r = reduce(s, "yes");
  eq(r.session.stage, "signing", "YES -> signing");
  assert(r.reply.commit, "YES triggers commit");
}

// --- Session: NO cancels with nothing signed ---
{
  let r = reduce(newSession("+1"), "TSLA, €50");
  r = reduce(r.session, "no");
  eq(r.session.stage, "greeting", "NO resets to greeting");
  assert(!r.reply.commit, "NO never commits");
  assert(r.session.draft === null, "NO clears draft");
}

console.log(`\n@warden/imessage parse+session: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

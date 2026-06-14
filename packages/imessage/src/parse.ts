import { parseEther, type Address } from "viem";
import { KNOWN_ASSETS } from "./config.js";

// A DraftPolicy is the human-readable, pre-signature shape of a WARDEN policy.
// It maps 1:1 onto PolicyTypes.Policy, plus provenance so the confirmation
// message can tell the user which fields it understood vs. defaulted.
export type DraftPolicy = {
  assetSymbol: string;
  allowedAsset: Address;
  vault: Address; // the asset's dedicated ERC-4626 vault to activate the policy on
  assetLive: boolean;
  maxTradeValueEur: bigint; // 18-decimal wei, matching parseEther("50")
  maxTradeValueEurLabel: string; // e.g. "50"
  forbiddenStartMinute: number; // CET minute-of-day [0,1440)
  forbiddenEndMinute: number;
  forbiddenLabel: string | null; // e.g. "22:00–06:00 CET" or null if always-on
  validForDays: number;
  understood: string[]; // fields parsed from the text
  defaulted: string[]; // fields filled from defaults
};

const DEFAULTS = {
  assetSymbol: "TSLA",
  maxTradeValueEurLabel: "50",
  validForDays: 7,
  // No forbidden window by default — agent may trade any time unless told otherwise.
  forbiddenStartMinute: 0,
  forbiddenEndMinute: 0,
};

function clockToMinute(raw: string): number | null {
  // Accepts "22:00", "10pm", "10:30pm", "6am", "06:00", "9 pm".
  const m = raw
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  const mer = m[3];
  if (hour > 23 || minute > 59) return null;
  if (mer === "pm" && hour < 12) hour += 12;
  if (mer === "am" && hour === 12) hour = 0;
  return (hour * 60 + minute) % 1440;
}

function formatMinute(mins: number): string {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Deterministic natural-language policy parser. No network, no LLM — so the
 * onboarding demo runs offline and the parse is auditable in tests. An optional
 * LLM normalizer (Groq, as in PING) can pre-clean free text before this runs,
 * but this function is always the source of truth for the signed policy.
 */
export function parsePolicy(text: string): DraftPolicy {
  const lower = text.toLowerCase();
  const understood: string[] = [];
  const defaulted: string[] = [];

  // --- Asset ---
  let assetSymbol = DEFAULTS.assetSymbol;
  const assetMatch = Object.keys(KNOWN_ASSETS).find((sym) =>
    new RegExp(`\\b${sym.toLowerCase()}\\b`).test(lower),
  );
  if (assetMatch) {
    assetSymbol = assetMatch;
    understood.push("asset");
  } else {
    defaulted.push("asset");
  }
  const asset = KNOWN_ASSETS[assetSymbol] ?? KNOWN_ASSETS[DEFAULTS.assetSymbol];

  // --- Max trade value (EUR) ---
  let maxLabel = DEFAULTS.maxTradeValueEurLabel;
  // "max 50 eur", "€50", "50 eur per trade", "up to 100 euros"
  const valueMatch =
    lower.match(/(?:max|up to|limit(?:\s+of)?|cap(?:\s+at)?)\s*€?\s*(\d+(?:\.\d+)?)/) ??
    lower.match(/€\s*(\d+(?:\.\d+)?)/) ??
    lower.match(/(\d+(?:\.\d+)?)\s*(?:eur|euros?)\b/);
  if (valueMatch) {
    maxLabel = valueMatch[1];
    understood.push("maxTradeValue");
  } else {
    defaulted.push("maxTradeValue");
  }

  // --- Forbidden trading window ---
  let startMin = DEFAULTS.forbiddenStartMinute;
  let endMin = DEFAULTS.forbiddenEndMinute;
  let forbiddenLabel: string | null = null;
  // "no trades between 22:00 and 06:00", "don't trade from 10pm to 6am"
  const windowMatch = lower.match(
    /(?:no trad\w*|don'?t trade|not? between|avoid)\D{0,20}?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:and|to|-|until|till|–)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/,
  );
  if (windowMatch) {
    const s = clockToMinute(windowMatch[1]);
    const e = clockToMinute(windowMatch[2]);
    if (s !== null && e !== null) {
      startMin = s;
      endMin = e;
      forbiddenLabel = `${formatMinute(s)}–${formatMinute(e)} CET`;
      understood.push("tradingWindow");
    }
  }
  if (forbiddenLabel === null) defaulted.push("tradingWindow");

  // --- Validity period ---
  let validForDays = DEFAULTS.validForDays;
  const daysMatch =
    lower.match(/(?:for|expires? in|valid for)\s*(\d+)\s*days?/) ??
    lower.match(/(\d+)\s*days?\b/);
  const weekMatch = lower.match(/(?:for|valid for)?\s*(\d+)\s*weeks?/);
  if (daysMatch) {
    validForDays = Number(daysMatch[1]);
    understood.push("validity");
  } else if (weekMatch) {
    validForDays = Number(weekMatch[1]) * 7;
    understood.push("validity");
  } else {
    defaulted.push("validity");
  }

  return {
    assetSymbol,
    allowedAsset: asset.address,
    vault: asset.vault,
    assetLive: asset.live,
    maxTradeValueEur: parseEther(maxLabel),
    maxTradeValueEurLabel: maxLabel,
    forbiddenStartMinute: startMin,
    forbiddenEndMinute: endMin,
    forbiddenLabel,
    validForDays,
    understood,
    defaulted,
  };
}

// Field groups, ordered as they appear in `understood`/`defaulted`.
const FIELD_GROUPS = ["asset", "maxTradeValue", "tradingWindow", "validity"] as const;
type FieldGroup = (typeof FIELD_GROUPS)[number];

const GROUP_KEYS: Record<FieldGroup, (keyof DraftPolicy)[]> = {
  asset: ["assetSymbol", "allowedAsset", "vault", "assetLive"],
  maxTradeValue: ["maxTradeValueEur", "maxTradeValueEurLabel"],
  tradingWindow: ["forbiddenStartMinute", "forbiddenEndMinute", "forbiddenLabel"],
  validity: ["validForDays"],
};

/**
 * Merge an edit onto a prior draft: keep each field group from `next` only if
 * the edit actually specified it, otherwise carry `prev` forward. This is what
 * makes "actually make it €30" change only the price without wiping the window.
 */
export function mergeDraft(prev: DraftPolicy, next: DraftPolicy): DraftPolicy {
  const merged: DraftPolicy = { ...prev };
  const understood = new Set(prev.understood);
  const defaulted = new Set(prev.defaulted);

  for (const group of FIELD_GROUPS) {
    if (next.understood.includes(group)) {
      for (const key of GROUP_KEYS[group]) {
        (merged as Record<string, unknown>)[key] = next[key];
      }
      understood.add(group);
      defaulted.delete(group);
    }
  }
  merged.understood = [...understood];
  merged.defaulted = [...defaulted];
  return merged;
}

/** Human summary of the leash, used in the iMessage confirmation prompt. */
export function describePolicy(d: DraftPolicy): string {
  const lines = [
    `• Asset: ${d.assetSymbol} only${d.assetLive ? "" : " (⚠️ not live on this deployment yet)"}`,
    `• Max per trade: €${d.maxTradeValueEurLabel}`,
    `• Blocked hours: ${d.forbiddenLabel ?? "none (can trade any time)"}`,
    `• Leash expires: ${d.validForDays} day${d.validForDays === 1 ? "" : "s"}`,
  ];
  return lines.join("\n");
}

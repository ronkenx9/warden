# WARDEN

Trustless agent vault for tokenized real-world assets

## Status
Authoritative state: ~/brain/projects/WARDEN.md (read it before working here).

## Run
- `pnpm test` — contracts + iMessage + monitor tests
- `pnpm build` — all TypeScript/dashboard builds
- `pnpm demo` — local policy + monitor + iMessage narrative demo
- `pnpm e2e` — local Anvil Sarah/YieldAgent/monitor/slash/reputation proof
- `pnpm heartbeat:robinhood` — safe no-key Robinhood read-only status
- `pnpm heartbeat:robinhood:loop` — safe 24/7 demo heartbeat; does not read `.env`

## Rules
- Before marking anything shipped: run the pre-ship checklist in ~/brain/skills/ship-verification.md
- Deployed addresses and chain params belong in this file, not in chat.

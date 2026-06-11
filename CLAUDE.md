# WARDEN

Trustless agent vault for tokenized real-world assets

## Status
Authoritative state: ~/brain/projects/WARDEN.md (read it before working here).

## Run
- `npm run test` — pnpm --filter @warden/contracts test && pnpm --filter @warden/imessage test
- `npm run build` — pnpm --filter @warden/agent build && pnpm --filter @warden/monitor build && pnpm --filter @warden/imessage build && pnpm --filter @warden/dashboard build
- `npm run demo` — pnpm --filter @warden/agent demo && pnpm --filter @warden/monitor demo && pnpm --filter @warden/imessage demo
- `npm run imessage:demo` — pnpm --filter @warden/imessage demo
- `npm run imessage:live` — pnpm --filter @warden/imessage live
- `npm run e2e` — pnpm --filter @warden/contracts build && pnpm --filter @warden/agent e2e

## Rules
- Before marking anything shipped: run the pre-ship checklist in ~/brain/skills/ship-verification.md
- Deployed addresses and chain params belong in this file, not in chat.

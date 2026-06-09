# WARDEN — Image Generation Spec

> Hand-off doc for Codex to run image generation. Each asset below is self-contained:
> filename, purpose, size, where it lands in the dashboard, the prompt, and a negative prompt.
> Art direction matches the **Arbitrum Open House London Buildathon** brand: acid-lime on
> electric-blue, fat black outlines, monochrome-blue rubber-hose cartoon mascots, chunky
> condensed black display caps. Substance is serious (a guardrail that leashes an AI agent);
> the skin is playful. The recurring joke: the cute agent tries to break a rule and the
> WARDEN guardian SLAPS it / slashes it.

---

## Locked style block (prepend to EVERY prompt for consistency)

```
STYLE: bold modern sticker-graffiti illustration, web3 hackathon poster energy.
Thick uniform black outlines on every shape (4-6px equivalent). Flat fills, no gradients
inside characters. Monochrome blue character palette: fills in #BFE0FF / #1E66FF / #0B3FD6
with black linework, like a one-color screenprint. Single acid-lime accent #C6F24E used
sparingly for highlights, energy marks, and props. Optional cyan pop #22E0FF for "zap"
moments. Rubber-hose / retro-cartoon limbs, expressive faces, slight halftone or grain
texture allowed. Clean vector edges. NO photorealism, NO 3D render, NO soft shadows.
```

## Global negative prompt (append to EVERY prompt)

```
NEGATIVE: gradients inside subjects, photorealistic, 3D render, drop shadows, glow, lens
flare, watermark, signature, text artifacts, gibberish letters, extra fingers, muddy colors,
pastel, corporate stock vibe, overlay haze, busy background unless specified.
```

## Consistency rules for Codex
- Generate the **WARDEN guardian** and the **AGENT bot** first (assets 02 + 03). Lock a seed
  for each character and reuse that seed across every later image that includes them, so the
  characters stay on-model.
- All transparent-background assets: export PNG with alpha. Backgrounds/OG: export PNG (and
  WebP if the tool supports it).
- Deliver into `packages/dashboard/public/img/` using the exact filenames below.

---

## Assets

### 01 — `wordmark-warden.png`
- **Purpose:** Hero wordmark. Replaces the plain `<h1>WARDEN</h1>`.
- **Size:** 2400×700, transparent PNG.
- **Prompt:**
  ```
  The word "WARDEN" in one line, ultra-bold condensed block capitals, acid-lime #C6F24E
  letterfaces sitting on chunky black slab bars behind them, thick black outline around each
  letter, slight 3D extruded black side to give weight. Sticker/graffiti hackathon style.
  Transparent background.
  ```
- **Negative:** + `serif, thin strokes, lowercase`

### 02 — `mascot-warden-guardian.png`
- **Purpose:** The brand character. A friendly-but-stern vault bouncer/guardian. Used in hero
  and as the "enforcer" in the incident scene.
- **Size:** 1400×1600, transparent PNG.
- **Prompt:**
  ```
  Mascot character: a stocky cartoon guardian robot-bouncer, monochrome blue body with black
  outline, broad chest like a vault door with a small round dial on it, big confident grin,
  one acid-lime #C6F24E padlock emblem on the chest, thick crossed arms, tiny lime sparkle.
  Friendly authority, the adult in the room. Full body, front view, standing. Transparent
  background.
  ```

### 03 — `mascot-agent-confident.png`
- **Purpose:** The AI trading agent character, "before" state. Used in marketplace / hero.
- **Size:** 1200×1400, transparent PNG.
- **Prompt:**
  ```
  Mascot character: a sleek little cartoon AI trading-bot, monochrome blue with black outline,
  smug confident smirk, sunglasses, holding a glowing acid-lime #C6F24E candlestick chart,
  one antenna with a lime tip, hovering slightly. Cocky startup-founder energy. Full body.
  Transparent background.
  ```

### 04 — `mascot-agent-slashed.png`
- **Purpose:** The payoff gag — the agent caught breaking policy and getting slashed. Hero
  emotional beat + incident panel.
- **Size:** 1200×1400, transparent PNG.
- **Prompt:**
  ```
  Same monochrome-blue cartoon AI trading-bot as before, now BUSTED: sweating, wide panicked
  eyes, sunglasses cracked and sliding off, a big black-outlined "DENIED" stamp slapped across
  it in acid-lime, a cyan #22E0FF zap/slash mark cutting through, coins flying away. Comic
  caught-red-handed moment. Full body. Transparent background.
  ```
- **Note for Codex:** reuse the seed/character from asset 03 so it's clearly the same bot.

### 05 — `hero-scene.png`
- **Purpose:** Optional combined hero illustration — guardian blocking the agent. Use if a
  single hero image reads better than separate mascots.
- **Size:** 2400×1400, transparent PNG (or electric-blue bg if used full-bleed).
- **Prompt:**
  ```
  Dynamic cartoon scene: the blue guardian bouncer (chest padlock, lime emblem) holds up one
  flat palm STOP toward the smug little blue trading-bot who recoils mid-air, coins scattering.
  A big acid-lime #C6F24E "NOPE" / stop-bar between them, cyan #22E0FF impact marks. Thick black
  outlines, flat monochrome-blue fills, sticker-graffiti hackathon poster energy. Comedic,
  high-energy, the leash snapping tight.
  ```

### 06 — `bg-texture.png`
- **Purpose:** Page background behind the dashboard shell.
- **Size:** 2560×1600, full PNG (not transparent).
- **Prompt:**
  ```
  Electric royal-blue background, smooth vertical gradient from #0B3FD6 at edges to #1E66FF
  center, scattered subtle black-outline doodle stickers very faint and low-contrast (tiny
  padlocks, candlestick charts, treasure chests, lightning bolts) like a sticker-bombed wall
  pushed into the background, plenty of clean negative space in the middle for UI. Light grain.
  ```
- **Negative:** + `busy center, high-contrast foreground, text`

### 07 — `icon-set.png` (sprite sheet) — OPTIONAL
- **Purpose:** Replace lucide icons with on-brand sticker icons for the 4 panel headers:
  vault/policy, incident/alert, monitor/search, slash/bank, deployment/shield, permission/signature.
- **Size:** 2048×2048 grid, transparent PNG (Codex can also output one file per icon —
  preferred if the tool does clean single icons: `icon-vault.png`, `icon-incident.png`,
  `icon-monitor.png`, `icon-slash.png`, `icon-deploy.png`, `icon-permission.png`, 256×256 each).
- **Prompt (per icon, swap the noun):**
  ```
  Single flat sticker icon of a {VAULT DOOR | SIREN/ALERT TRIANGLE | MAGNIFYING GLASS OVER A
  RECEIPT | COIN BEING SLICED BY A LIME BLADE | SHIELD WITH A CHECK | PEN SIGNING A SCROLL},
  monochrome blue fill, thick black outline, one acid-lime #C6F24E highlight, centered,
  generous padding. Transparent background.
  ```

### 08 — `og-image.png`
- **Purpose:** Social / submission share card.
- **Size:** 1200×630, full PNG.
- **Prompt:**
  ```
  Social share card on electric-blue gradient #0B3FD6 to #1E66FF. Left: the "WARDEN" acid-lime
  block-cap wordmark on black slab bars, and below it small lime tagline text "CUTE AGENT.
  HARD LEASH." Right: the blue guardian bouncer holding a STOP palm to the recoiling little
  trading-bot, cyan zap marks. Thick black outlines, sticker-graffiti hackathon style, balanced
  composition, clean margins.
  ```
- **Negative:** + `cramped, cluttered, unreadable text` (Codex: verify the two text strings
  render cleanly; if the model garbles text, generate the art only and we'll overlay text in CSS/next-og.)

### 09 — `favicon.png`
- **Purpose:** Browser tab.
- **Size:** 512×512, transparent PNG.
- **Prompt:**
  ```
  App icon: the blue guardian's chest padlock emblem only — a chunky padlock, monochrome blue
  with thick black outline and an acid-lime #C6F24E keyhole, centered, bold and legible at small
  size. Transparent background.
  ```

---

## Delivery checklist for Codex
- [ ] 02 + 03 generated first; seeds recorded and reused for 04, 05, 08
- [ ] All files named exactly as above, placed in `packages/dashboard/public/img/`
- [ ] Transparent-bg assets verified to actually have alpha
- [ ] Text-bearing assets (01, 08) checked for clean lettering; fall back to art-only if garbled
- [ ] Note the recorded seeds back here or in the journal so reruns stay on-model

## After images land (my side, not Codex's)
Once assets are in `public/img/`, I'll rewrite `src/styles.css` + `src/main.tsx` to the
Arbitrum palette (bg #0B3FD6→#1E66FF, accent #C6F24E, black outlines, Anton/Druk-condensed
display), wire the wordmark + mascots into the hero, and use the slashed-agent in the incident
panel. The dashboard structure (hero, vault, incident, monitor, slash, deployment, permission,
marketplace, timeline) stays — only the skin changes.

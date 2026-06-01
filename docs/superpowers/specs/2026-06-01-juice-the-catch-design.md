# Tight Lines — "Juice the Catch" Design Spec

**Date:** 2026-06-01
**Status:** Draft for review
**Scope:** One focused round — make the core catch loop feel like a jackpot.

---

## Goal

Transform the **bite → set hook → reel fight → reveal** sequence from functional into
*thrilling*, using the honest engine of a slot machine — anticipation, escalation, and a
payoff that scales with the win — and **nothing predatory**: no money, no purchases, no
manipulation. Pure "one more cast" delight, in a game safe for a kid.

The chosen feel is **telegraph & escalate**: hints leak out *during* the fight so the
player feels something special coming before the card flips.

## Non-goals (explicitly out of scope this round)

- No monetization of any kind (no IAP, ads, loot boxes, real or in-game currency).
- No platform/packaging work (stays a single `index.html`, no build step, no deps).
- No new lakes, biomes, seasons, times of day, or new species.
- No progression economy (rods/lures/bait/upgrades) or quests.
- No multiplayer/turn-structure changes.
- No cross-session "daily/streak" meta layer (was the deferred higher tier).

## Design principles (must hold)

1. **Delight, not dependency.** Every hook is sensory, never financial or coercive.
2. **Preserve the no-rage-quit promise.** The reel fight still *always* lands the fish if
   the player just holds on; the 32s safety cap stays. We add drama, never losability.
3. **Stay single-file, zero-dependency.** All audio remains WebAudio-generated; all art
   remains procedural canvas.
4. **Respect the player.** Honor `prefers-reduced-motion` (no screen shake then); mute
   still silences everything; haptics are optional and feature-detected.

---

## The spine: a single "hype" value

Everything scales off one derived number computed the moment a fish is on the line.

- **Roll the fish *and its size* at bite time**, not at landing. Today `pickFish()` runs in
  `onBite()` but `rollSize()` only runs inside `landFish()` — so nothing downstream can
  react to how big the fish is. We move the size roll forward and store it
  (`G.fishSize`), so the bite cue, the fight, and the reveal all describe the *same* fish.
  **Invariant:** the size telegraphed during the fight === the size shown on the card.

- **`computeHype(sp, size)` → `{ h, tier }`** (new helper, near the game-flow section):
  - `sizePct = (size.len - sp.minLen) / (sp.maxLen - sp.minLen)`  (0..1, clamped)
  - `rarityBoost = common 0 · rare 0.30 · legendary 0.60`
  - `h = clamp(sizePct * 0.7 + rarityBoost, 0, 1)`  — continuous, for scaling effects
  - `tier`: `0 small` · `1 normal` · `2 big` (rare, or top-25% size) ·
    `3 monster` (legendary, or top-10% size, or rare-and-big)
- Stored as `G.hype = { h, tier }`, transient (never persisted). Cleared on `nextTurn()`.

---

## Changes by sequence stage

### 1. A bite that reads the fish — `onBite()` + the bite render in `drawAngler()`

- `onBite()` rolls fish + size + hype up front.
- The bobber reaction scales with `hype.h`. Today the bite render uses a fixed
  `dip = Math.sin(G.t*22)*4`. New: amplitude scales with hype; at `tier 3` the bobber gets
  *yanked fully under* with two or three sharp jerks before settling.
- `Sound.bite(intensity)` gains an intensity arg — bigger fish → lower pitch + a heavier
  second knock.
- The "!" indicator scales: `!` → `‼` → a bold splash for monsters.
- The hook window (`G.hookWindow = 1.6`) is **unchanged** — we add anticipation, not
  difficulty.

### 2. The fight *is* the reveal-in-progress — `drawFightUI()`

- The hooked fish is drawn as a **murky shadow**, not full color (full color is saved for
  the card). Reuse the silhouette idea from `drawFishSilhouette()` but darker/bluer.
- **Shadow size scales with the actual rolled length**: bigger fish = a visibly bigger,
  darker shape. Map length across species to a draw-length range
  (`L = lerp(54, 104, sizePct)`, nudged up for large species).
- **Depth murk:** a translucent water-colored veil over the shadow that *thins as
  `f.prog` rises* — blurry deep down, sharpening as it nears the surface. Never resolves to
  full color underwater.
- **Escalating caption** (replaces the static "Reeling in…"), gated by progress *and* tier:
  - `prog < 0.33`: "Something's on the line…"
  - `0.33–0.70`: tier ≥ 2 → "💪 This one's got some weight!" else "🎣 Reeling it in…"
  - `prog > 0.70`: tier 3 → "🌟 WHAT *IS* THAT?!" · tier 2 → "🔥 IT'S A BIG ONE!" · else
    "Almost up…"

### 3. Escalating drag + feel — `startFight()`, `updateFight()`, `frame()`

- **Drag scream scales:** `Sound.reelRun(intensity)` gains an intensity arg — higher hype
  → lower base frequency, longer tone, and a soft noise rumble layered under.
- **Runs feel bigger for big fish:** scale run frequency / bar-swing amplitude by `hype.h`
  so monsters thrash more.
  **Kid-proof invariant preserved:** tune so net line gained while simply holding remains
  positive at *every* hype level; the `f.prog>=1 || f.elapsed>32` safety still lands it.
  The fight is never actually losable — only more dramatic.
- **Screen shake:** add a decaying `G.shake` offset applied once in `frame()` render
  (a global `ctx.translate`). Triggered on run-starts and the surface break, scaled by
  hype. **Disabled entirely when `prefers-reduced-motion` is set.**
- **Optional haptics:** `navigator.vibrate` on run-starts and landing, feature-detected and
  gated by the mute toggle. No-op where unsupported.

### 4. The surface break = the jackpot — `landFish()` + `showCard()`

- On land: splash size and a shake spike scale with hype; the shadow "bursts" the
  surface (existing splash ring, scaled).
- **Reveal animation:** the card's fish canvas *develops* from silhouette → full color over
  ~350ms with a slight scale-pop (tween a reveal flag consumed by the card draw).
- **Confetti scales:** `spawnConfetti(n, palette)` gains count + palette args; legendary =
  more pieces, gold-heavy palette, optional second burst.
- **Fanfare scales:** new `Sound.fanfare(tier)` — a longer ascending arpeggio + sparkle for
  `tier 3`, the current chime for low tiers.
- **Banner precedence** (highest wins):
  `🌟 LEGENDARY!` (rarity) → `🏆 LUNKER!` (top-10% size) → `✨ New species!` →
  `🥇 New personal best!` → `Nice catch!`

### 5. A "how big?" meter on the card — `showCard()`

- A horizontal meter under the stats, filled to `sizePct` of the species' min→max range,
  with a tick at the player's **previous** personal best for that species.
- Capture `rec.bestLen` *before* `landFish()` updates it, so the tick shows the old best and
  the fill shows the new catch beating it.
- Endpoint labels (🐟 min … 🏆 max) and a callout for big ones ("Top 8%!"). This is the
  "so close to the jackpot" readout that makes players want to beat their best.

### 6. Near-miss, kid-safely — `missFish()` (hook-timeout path only)

- The only places a turn ends empty today: the **hook-set timeout** ("Too slow — it spit
  the hook!") and the **reel idle-timeout** ("Reel when it's green…"). The reel fight itself
  stays non-losable.
- Because the fish is now known at bite, the hook-timeout miss can show a **teasing glimpse**
  scaled by tier: tier ≥ 2 → a shadow darts away + "😮 That was a BIG one — it spit the
  hook!"; small fish → gentle "Aw, it nibbled and let go." Drives "one more cast" without
  punishing anyone.

---

## Audio additions (all WebAudio-generated, no files)

- `bite(intensity)` — pitch/knock scale with intensity.
- `reelRun(intensity)` — lower/longer + rumble for big fish.
- `fanfare(tier)` — ascending arpeggio + sparkle for the top tier.
- A short low rumble bed for monster runs.
- All respect the existing `muted` flag.

## Persistence impact

**None.** All new state (`G.fishSize`, `G.hype`, `G.shake`, reveal flags) is transient. The
save schema (`tightlines.v1`, the `collection` map) is unchanged, so existing saves keep
working.

## Verification plan

- **Telegraph integrity:** size shown on the card === `G.fishSize` rolled at bite (assert
  in a dev build / manual check).
- **Kid-proof invariant:** holding the reel straight through lands the fish across many
  trials at *every* hype tier; the 32s cap and hook window are unchanged.
- **Tier escalation:** a temporary debug hotkey to force a chosen species/size, to eyeball
  small vs. lunker vs. legendary escalation end-to-end.
- **Reduced motion:** with `prefers-reduced-motion`, no screen shake occurs; the rest still
  reads well.
- **Mute:** every new sound is silenced by the mute toggle.
- **Regression:** existing flow (spot select, charge-cast, perfect-cast, logbook, turn swap,
  persistence) still works.

## Touched code

Single file: `index.html` — sections 3 (Audio), 6 (Fight), 7 (Game flow), 8 (UI).
Functions: `onBite`, `setHook`, `startFight`, `updateFight`, `drawFightUI`, `landFish`
(now *consumes* the pre-rolled `G.fishSize` instead of rolling its own), `missFish`,
`showCard`, `spawnConfetti`, `frame`, the `Sound` module, and a new `computeHype` helper.
No new files; no dependencies added.

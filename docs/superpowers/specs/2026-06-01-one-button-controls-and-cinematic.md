# Tight Lines — One-Button Controls, Cinematic Break & Turn Polish

**Date:** 2026-06-01
**Status:** Approved (forks chosen by user), building.

## Goals (this round)

1. **Cinematic slow-mo surface break** — the climactic moment the fish breaches.
2. **One simple interface** — remove the 3 fishing-spot buttons AND merge Cast/Set-Hook/Reel
   into a SINGLE context button, all driven by the spacebar. Casting keeps **hold-to-power**.
   Fish are drawn from one merged pool so every species is still catchable.
3. **Must-see-your-fish** — mashing space to reel must not blow past the catch card.
4. **Prominent turn switch** — make the Dad ↔ Everett hand-off unmissable.

## Decisions (from the user)

- "Both": drop spot-picking + unify the action buttons → one button + space.
- Casting stays **hold-to-power** (sweet-zone = perfect cast, faster bite).

## Design

### One-button control model
- Remove `#spotRow`, `#castBtn`, `#hookBtn`, `#reelUI`/`#reelBtn`. Add a single
  `#actionBtn` plus the standalone `#reelBarWrap` meter and existing `#castUI` meter.
- `#actionBtn` is context-sensitive (label + style by `G.mode`), mirroring the spacebar:
  - idle → "HOLD TO CAST 🎣" (gold) — pointerdown starts charge, pointerup casts.
  - charging → "RELEASE! 🎣" + power meter.
  - bite → "SET THE HOOK!" (gold, pulsing) — tap.
  - fighting → "🎣 HOLD TO REEL!" / "✋ LET IT RUN!" (green/orange `.reel`/`.run`) — hold.
- Spacebar: hold in idle = charge, release = cast; tap in bite = hook; hold in fighting =
  reel. Enter = instant 0.82-power cast. Spot keys (1/2/3, ←/→) removed.
- `pickFish()` uses the **sum** of each fish's weeds+deep+lure weights → one pool, original
  rarity feel preserved, all 22 reachable.

### Cinematic surface break
- When `fight.prog` first reaches **0.86**, call `triggerBreak()`: set `fight.broke`, start
  `G.slowmo` (~0.6s), big splash + spray (`spawnSplash`), screen-shake, haptic.
- While `G.slowmo>0`, the fight runs at ~0.32× time (the fish lingers at the surface) and the
  render applies a gentle ease-in/out **zoom (~1.09×)** toward the break point (skipped for
  reduced-motion). `drawFightUI` paints bold expanding surface rings.
- While `fight.broke`, `prog` ramps decisively to 1 and `landFish()` fires — a guaranteed,
  climactic finish (keeps the kid-proof "always lands" guarantee).

### Must-see-your-fish
- `showCard()` sets `G.cardReadyAt = G.t + 0.8` and disables the "Next" button for that window.
- Dismiss (space/Enter or button) goes through `dismissCard()`, which ignores input until
  `cardReadyAt` AND ignores auto-repeat keydowns (`e.repeat`), so a held/mashed space can't
  skip the reveal.

### Prominent turn switch
- New `#turnBanner` overlay slides/pops in on every `nextTurn()` (and at boot): big
  "🧢 Everett, you're up!" with the angler's accent color, auto-hides after ~1.6s,
  `pointer-events:none`. The existing turn pill + name labels stay.

## Invariants preserved
- Reel fight always lands if you hold (now reinforced by the break ramp); 32s cap stays.
- `prefers-reduced-motion` disables shake AND the cinematic zoom. Mute silences all.
- Save schema unchanged. `computeHype` test stays green.

## Out of scope
Monetization, platform packaging, new lakes/fish, economy, daily/streak meta.

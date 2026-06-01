# Tight Lines — Medals, Trophy Wall & Goals

**Date:** 2026-06-01 · **Status:** Approved, building.

## Goal
Give players a reason to keep casting after the novelty: size medals to chase per
species, the Logbook reimagined as a trophy wall, and a set of goals/challenges —
all **derived from existing save data** (no schema change; old saves light up).

## Medals (balanced thresholds)
- `medalForLen(sp, len)` → 0/1/2/3 by size percentile within the species range:
  🥉 Bronze ≥ 0.50 · 🥈 Silver ≥ 0.75 · 🥇 Gold ≥ 0.92.
- A species' medal = `medalForLen(sp, rec.bestLen)` — pure function of saved best length.
- **Catch card:** a `#cardMedal` line ("🥇 Gold catch — NEW! ✨"); if the catch raises the
  medal tier (`medalForLen(prevBest) < medalForLen(len)`), the banner leads with the medal
  and confetti/fanfare bump.

## Trophy wall (in the Logbook)
- Header: `🥇 g  🥈 s  🥉 b · caught/total species`.
- Each caught cell shows a medal badge (bottom-right); gold catches get a gold glow.

## Goals (new 🎯 panel; 'G' to open/close)
Fixed list, live progress from the collection, ✓ when met, celebrated on the catch card
(`#cardGoal`) when newly completed during a catch:
1 First Catch · 2 Catch 5 · 3 Catch 10 · 4 Master Angler (all `FISH.length`) ·
5 Land a Rare · 6 Land a Legendary · 7 Earn a Silver · 8 Earn a Gold ·
9 Water Wolf (30″+ pike) · 10 Family Affair (Dad and Everett each land one, via `firstBy`).
- Each goal: `{id, name, hint, cur(collection)->n, max}`. `done = cur>=max`.
- Completion detected in `landFish`: snapshot `goalDoneSet` before vs after recording.

## Persistence
None added — medals and goals derive from `collection` (`bestLen`, `firstBy`, rarity).

## Invariants
Kid-proof landing, reduced-motion, mute, one-button controls all unchanged.
`computeHype` test stays green.

## Out of scope
Economy/currency, monetization, platform, new lakes/fish, daily resets.

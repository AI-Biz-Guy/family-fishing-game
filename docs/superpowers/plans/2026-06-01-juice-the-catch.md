# Juice the Catch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the bite → set-hook → reel → reveal sequence in `Tight Lines` feel like a jackpot — telegraphing the catch and escalating the payoff — with zero predatory mechanics.

**Architecture:** All work lives in the single file `index.html`. A new pure helper `computeHype(sp, size)` produces one value that every downstream effect scales off. The fish's size is rolled at *bite* time (not landing) so the bite cue, the underwater shadow, the drag, and the reveal all describe the same fish. Rendering/feel changes are verified by playing the game; the one pure function gets an automated Node test.

**Tech Stack:** Vanilla JS, Canvas 2D, WebAudio (all already in the project). Tests: Node's built-in `node:test` + `node:assert` (no dependencies installed).

**Spec:** `docs/superpowers/specs/2026-06-01-juice-the-catch-design.md`

**Invariants that MUST survive every task:**
- The reel fight is always winnable by holding (the 32s cap in `updateFight` stays; net line gained while holding stays positive at every hype tier).
- The size telegraphed underwater === the size shown on the card (one roll, stored in `G.fishSize`).
- `prefers-reduced-motion` disables screen shake. Mute silences all audio. Save schema (`tightlines.v1`) is unchanged.

---

## File Structure

- **Modify:** `index.html` — sections 3 (Audio), 6 (Fight), 7 (Game flow), 8 (UI). One file by design; we do not split it.
- **Create:** `tests/hype.test.mjs` — automated test for the pure `computeHype` helper.

Each task leaves the game fully playable. Manual verification = open `index.html` in a browser (e.g. `open index.html` on macOS) and observe.

---

## Task 0: Version control + baseline

**Files:** repo root.

- [ ] **Step 1: Initialize git and commit the current game as the baseline**

```bash
cd /Users/johnsamuelson/Code/everett
git init
printf '%s\n' 'node_modules/' '.DS_Store' > .gitignore
git add -A
git commit -m "chore: baseline before juice-the-catch"
```

- [ ] **Step 2: Confirm a clean tree**

Run: `git status`
Expected: `nothing to commit, working tree clean`

---

## Task 1: The hype spine — roll size early + `computeHype`

**Files:**
- Modify: `index.html` — `onBite`, `rollSize`, `landFish`, `nextTurn`, and `G` state object.
- Create: `tests/hype.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/hype.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');

const m = html.match(/\/\*<computeHype>\*\/([\s\S]*?)\/\*<\/computeHype>\*\//);
if (!m) throw new Error('computeHype markers not found in index.html');

// computeHype depends only on this trivial helper; define it for the sandbox.
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// Turn the function declaration into an expression and evaluate it.
const computeHype = eval('(' + m[1].trim().replace(/^function\s+computeHype/, 'function') + ')');

const bass   = { rarity: 'common',    minLen: 9,  maxLen: 21 };
const salmon = { rarity: 'rare',      minLen: 18, maxLen: 36 };
const musky  = { rarity: 'legendary', minLen: 30, maxLen: 52 };

test('small common -> tier 0', () => {
  assert.equal(computeHype(bass, { len: 9 }).tier, 0);
});
test('mid common -> tier 1', () => {
  assert.equal(computeHype(bass, { len: 15 }).tier, 1);
});
test('huge common -> tier 3 (lunker)', () => {
  assert.equal(computeHype(bass, { len: 21 }).tier, 3);
});
test('rare small -> tier 2', () => {
  assert.equal(computeHype(salmon, { len: 20 }).tier, 2);
});
test('rare big -> tier 3', () => {
  assert.equal(computeHype(salmon, { len: 34 }).tier, 3);
});
test('legendary always tier 3', () => {
  assert.equal(computeHype(musky, { len: 30 }).tier, 3);
});
test('hype h stays within [0,1] and sizePct is reported', () => {
  const r = computeHype(musky, { len: 52 });
  assert.ok(r.h >= 0 && r.h <= 1);
  assert.ok(r.sizePct >= 0 && r.sizePct <= 1);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/`
Expected: FAIL — `Error: computeHype markers not found in index.html`

- [ ] **Step 3: Add the `computeHype` helper (with extraction markers)**

In `index.html`, in section 7 just **above** `function rollSize(sp){`, add:

```js
/*<computeHype>*/
function computeHype(sp,size){
  const span=Math.max(0.001,sp.maxLen-sp.minLen);
  const sizePct=clamp((size.len-sp.minLen)/span,0,1);
  const rarityBoost=sp.rarity==='legendary'?0.60:sp.rarity==='rare'?0.30:0;
  const h=clamp(sizePct*0.7+rarityBoost,0,1);
  let tier=1;
  if(sp.rarity==='legendary'||sizePct>=0.90||(sp.rarity==='rare'&&sizePct>=0.75))tier=3;
  else if(sp.rarity==='rare'||sizePct>=0.75)tier=2;
  else if(sp.rarity==='common'&&sizePct<0.25)tier=0;
  return {h,tier,sizePct};
}
/*</computeHype>*/
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/`
Expected: PASS — 7/7 tests pass.

- [ ] **Step 5: Roll the fish's size at bite time and store hype**

In `index.html`, add fields to the `G` state object (near `fish:null, caught:null,`):

```js
  fish:null, fishSize:null, hype:null, caught:null,
```

Replace `onBite()`:

```js
function onBite(){
  G.fish=pickFish();
  G.fishSize=rollSize(G.fish);
  G.hype=computeHype(G.fish,G.fishSize);
  Sound.bite();
  G.hookWindow=1.6;setMode('bite');
}
```

- [ ] **Step 6: Make `landFish` consume the pre-rolled size instead of re-rolling**

Replace the first line of `landFish()` (`const sp=G.fish, sz=rollSize(sp);`) with:

```js
  const sp=G.fish, sz=G.fishSize||rollSize(sp);
```

And in `nextTurn()`, extend the reset line so stale state can't leak:

```js
  G.spot=null;G.fish=null;G.fishSize=null;G.hype=null;G.caught=null;
```

- [ ] **Step 7: Manual verify — nothing changed yet for the player**

Run: `open index.html`
Expected: Cast, catch a few fish. Game plays exactly as before (no visual change this task). The catch card still shows a sensible length/weight. No console errors.

- [ ] **Step 8: Commit**

```bash
git add index.html tests/hype.test.mjs
git commit -m "feat: roll fish size at bite + computeHype tiering (tested)"
```

---

## Task 2: A bite that reads the fish

**Files:** Modify `index.html` — `Sound.bite`, the bite branch of `drawAngler`, the `drawAngler` `!` indicator.

- [ ] **Step 1: Give `Sound.bite` an intensity argument**

In the `Sound` module, replace `bite()`:

```js
    bite(intensity=0){
      const lo=660-intensity*220;          // bigger fish -> lower, heavier knock
      tone(lo,0,.08,'sine',.18);
      tone(lo*1.33,.09,.10,'sine',.16);
      if(intensity>0.5){noise(.02,.12,.18+intensity*0.12,600);}
    },
```

- [ ] **Step 2: Pass hype into the bite sound**

In `onBite()`, change `Sound.bite();` to:

```js
  Sound.bite(G.hype?G.hype.h:0);
```

- [ ] **Step 3: Scale the bobber yank and the `!` with hype**

In `drawAngler`, find the bite dip line:

```js
    const bx=restX, dip=(active&&G.mode==='bite')?Math.sin(G.t*22)*4:0, by=restY+dip;
```

Replace with (bigger hype = deeper, harder yank):

```js
    const hH=(active&&G.hype)?G.hype.h:0;
    const yank=(active&&G.mode==='bite')?(4+hH*14)*Math.sin(G.t*(18+hH*10)):0;
    const bx=restX, dip=yank, by=restY+dip;
```

Then find the `!` indicator block:

```js
    if(active&&G.mode==='bite'){ctx.fillStyle='#ffe14d';ctx.font='bold 26px Segoe UI';ctx.textAlign='center';
      ctx.strokeStyle='#b8860b';ctx.lineWidth=4;ctx.strokeText('!',bx,by-18);ctx.fillText('!',bx,by-18);}
```

Replace the `'!'` string (both `strokeText` and `fillText`) with a hype-scaled mark and size:

```js
    if(active&&G.mode==='bite'){const mk=(G.hype&&G.hype.tier>=3)?'‼':(G.hype&&G.hype.tier>=2)?'!!':'!';
      const fs=22+ (G.hype?G.hype.h*14:0);
      ctx.fillStyle='#ffe14d';ctx.font='bold '+fs.toFixed(0)+'px Segoe UI';ctx.textAlign='center';
      ctx.strokeStyle='#b8860b';ctx.lineWidth=4;ctx.strokeText(mk,bx,by-18);ctx.fillText(mk,bx,by-18);}
```

- [ ] **Step 4: Manual verify — bites have weight**

Run: `open index.html`
Expected: Fish the **Deep Drop-off** / **Troll a Lure** spots to hit rares/legendaries. On a big bite, the bobber gets yanked harder and the sound drops lower; small panfish bites stay gentle. Tip: temporarily set `G.fishSize` high in the console to compare. No errors.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: bite cue scales with fish size/rarity"
```

---

## Task 3: The fight is the reveal-in-progress (underwater shadow)

**Files:** Modify `index.html` — `drawFightUI`.

- [ ] **Step 1: Draw the hooked fish as a depth-murked shadow that scales with size**

In `drawFightUI`, replace this block:

```js
  // the hooked fish, tilted & wiggling as it's pulled up
  ctx.save();ctx.translate(fx,fy);ctx.rotate(-0.5 + Math.sin(f.wob*0.8)*0.22);
  drawFish(ctx,G.fish,0,0,72,-1);ctx.restore();
```

with a silhouette whose length scales with the rolled size and whose murk thins as it rises:

```js
  // the hooked fish rises as a murky shadow — bigger/darker for bigger fish,
  // blurry deep down, sharpening (but never full colour) as it nears the surface.
  const pct=G.hype?G.hype.sizePct:0.4;
  const shadowL=lerp(54,104,pct)*(G.fish&&G.fish.depth<0.2?1.12:1);  // long fish read bigger
  const clarity=clamp((f.prog-0.15)/0.7,0,1);                        // 0 deep .. 1 near top
  ctx.save();ctx.translate(fx,fy);ctx.rotate(-0.5 + Math.sin(f.wob*0.8)*0.22);
  // soft dark blob behind the silhouette adds "depth blur" when deep
  ctx.fillStyle='rgba(8,22,30,'+(0.30*(1-clarity)).toFixed(3)+')';
  ctx.beginPath();ctx.ellipse(0,0,shadowL*0.55,shadowL*0.55*0.42,0,0,TAU);ctx.fill();
  // the shadow itself: a dark-blue tinted silhouette, never the real colours
  const sv={...G.fish,back:'#16313f',mid:'#1d4150',belly:'#2a5566',pattern:null,lat:null,eye:'#0c1a22',glassyEye:false};
  ctx.globalAlpha=lerp(0.55,0.92,clarity);
  drawFish(ctx,sv,0,0,shadowL,-1);
  ctx.globalAlpha=1;ctx.restore();
  // a translucent water veil over the whole shadow, thinning as it rises
  ctx.fillStyle='rgba(34,96,112,'+(0.34*(1-clarity)).toFixed(3)+')';
  ctx.beginPath();ctx.ellipse(fx,fy,shadowL*0.75,shadowL*0.5,0,0,TAU);ctx.fill();
```

- [ ] **Step 2: Escalate the caption by progress and tier**

In `drawFightUI`, replace:

```js
  const cap=f.running?'💪 It\'s running — let go!':'🎣 Reeling in…';
```

with:

```js
  const tier=G.hype?G.hype.tier:1;
  let cap;
  if(f.running) cap='💪 It\'s running — let go!';
  else if(f.prog<0.33) cap='Something\'s on the line…';
  else if(f.prog<0.70) cap=(tier>=2)?'💪 This one\'s got some weight!':'🎣 Reeling it in…';
  else cap=(tier>=3)?'🌟 WHAT *IS* THAT?!':(tier>=2)?'🔥 IT\'S A BIG ONE!':'Almost up…';
```

- [ ] **Step 3: Manual verify — the shadow tells a story**

Run: `open index.html`
Expected: During a fight the fish is a dark blue shape, blurry/murky when deep and sharper as it rises, but it never shows true colors until the card. A legendary/lunker shadow is visibly bigger. Captions climb from "Something's on the line…" to "🔥 IT'S A BIG ONE!" / "🌟 WHAT *IS* THAT?!" near the top. No errors.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: underwater shadow telegraph + escalating fight caption"
```

---

## Task 4: Escalating drag, shake, and feel

**Files:** Modify `index.html` — `Sound.reelRun`, `startFight`, `updateFight`, the `G` state object, `frame`, and a small `buzz` helper.

- [ ] **Step 1: Give `Sound.reelRun` an intensity argument**

Replace `reelRun()`:

```js
    reelRun(intensity=0){
      const base=380-intensity*150;            // bigger fish -> deeper drag scream
      tone(base,0,0.20+intensity*0.10,'triangle',0.05+intensity*0.03,base*0.45);
      if(intensity>0.5)noise(0,0.18,0.06+intensity*0.05,300);   // low rumble bed
    },
```

- [ ] **Step 2: Add a reduced-motion flag, a shake field, and a haptics helper**

Near the top of section 8 (just after `const el=id=>document.getElementById(id);`), add:

```js
const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function buzz(ms){ try{ if(!Sound.muted && navigator.vibrate) navigator.vibrate(ms); }catch(e){} }
```

In the `G` state object, add a shake field (near `t:0, modeT:0,`):

```js
  t:0, modeT:0, shake:0, biteAt:0, hookWindow:0,
```

- [ ] **Step 3: Scale run drama with hype (without making the fight losable)**

In `startFight`, after the `const diff = …` line, derive a hype factor and use it. Replace the `G.fight={…}` assignment with:

```js
  const hf = G.hype?G.hype.h:0;                 // 0..1 drama, NOT difficulty
  G.fight={
    prog:0.05, hold:false, diff, elapsed:0, clk:0,
    reelRate:0.55 - diff*0.12,      // line gained while reeling during calm (unchanged)
    runPenalty:0.30 + diff*0.18,    // gentle loss if you reel during a run (unchanged)
    slip:0.05 + diff*0.05,          // tiny drift if you idle while it's calm (unchanged)
    running:false, stateTimer:rnd(1.4,2.2), wob:0, idle:0,
    drama:hf,                       // amplifies thrash + sound + shake only
  };
```

> The loss terms (`runPenalty`, `slip`) are deliberately unchanged — net line while holding stays positive, so holding always lands. `drama` only drives sound/shake/thrash.

- [ ] **Step 4: Make runs scream, shake, and buzz scaled by drama**

In `updateFight`, replace the state-flip block:

```js
  if(f.stateTimer<=0){
    f.running=!f.running;
    f.stateTimer = f.running ? rnd(0.5,0.9)+f.diff*0.35 : rnd(1.4,2.2);
    if(f.running)Sound.reelRun();                      // gentle drag cue: the fish is running!
  }
```

with:

```js
  if(f.stateTimer<=0){
    f.running=!f.running;
    f.stateTimer = f.running ? rnd(0.5,0.9)+f.diff*0.35 : rnd(1.4,2.2);
    if(f.running){ Sound.reelRun(f.drama||0); G.shake=Math.max(G.shake,3+(f.drama||0)*7); buzz(20+((f.drama||0)*40)|0); }
  }
```

And increase the visual thrash with drama. In `updateFight`, change `f.wob += dt*20;` to:

```js
    f.wob += dt*(20+ (f.drama||0)*16);
```

- [ ] **Step 5: Apply (and decay) screen shake in the render loop**

In `frame`, replace the render block:

```js
  // render
  ctx.clearRect(0,0,W,H);
  drawScene(G.t);
  drawOverlay(G.t);
  if(G.mode==='fighting')drawFightUI();
  requestAnimationFrame(frame);
```

with:

```js
  // render (with decaying screen shake; disabled for reduced-motion users)
  G.shake=Math.max(0,G.shake-dt*22);
  ctx.clearRect(0,0,W,H);
  ctx.save();
  if(!REDUCED_MOTION && G.shake>0.1){
    const a=G.shake;ctx.translate((Math.random()*2-1)*a,(Math.random()*2-1)*a);
  }
  drawScene(G.t);
  drawOverlay(G.t);
  if(G.mode==='fighting')drawFightUI();
  ctx.restore();
  requestAnimationFrame(frame);
```

- [ ] **Step 6: Manual verify — big fish fight harder (but you still always win)**

Run: `open index.html`
Expected: On a rare/legendary, runs are more frequent and the drag scream is deeper with a rumble; the screen gives a small kick on each run; mobile devices buzz. Crucially: **hold the reel button straight through without releasing — you still land the fish every time.** With OS "reduce motion" on, the screen does not shake. No errors.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat: drama-scaled drag, screen shake, and haptics (fight stays winnable)"
```

---

## Task 5: The surface break + jackpot reveal

**Files:** Modify `index.html` — `spawnConfetti`, `Sound` (add `fanfare`), `landFish`, `showCard`, and the card draw.

- [ ] **Step 1: Let `spawnConfetti` scale count and palette**

Replace `spawnConfetti()`:

```js
function spawnConfetti(n=70,cols){const cx=W/2,cy=H*0.4;
  cols=cols||['#f6b352','#e2607e','#7fd47f','#5fa8e0','#c558d6','#ffe14d'];
  for(let i=0;i<n;i++)G.confetti.push({x:cx+rnd(-40,40),y:cy,vx:rnd(-4,4),vy:rnd(-7,-2),rot:rnd(TAU),vr:rnd(-.3,.3),col:pick(cols),life:1});}
```

- [ ] **Step 2: Add a tiered fanfare to the Sound module**

In the `Sound` module's returned object, add after `chime(){…},`:

```js
    fanfare(tier=1){
      const seq = tier>=3 ? [523,659,784,1047,1319] : tier>=2 ? [523,659,784,1047] : [523,659,784];
      seq.forEach((f,i)=>tone(f,i*0.08,.45,'sine',.16));
      if(tier>=3){ [1568,1976].forEach((f,i)=>tone(f,0.45+i*0.07,.5,'triangle',.10)); }  // sparkle topper
    },
```

- [ ] **Step 3: Scale the landing splash/shake/fanfare/confetti by tier; capture previous best for the meter**

Replace `landFish()`:

```js
function landFish(){
  const sp=G.fish, sz=G.fishSize||rollSize(sp);
  const hype=G.hype||computeHype(sp,sz);
  Sound.splash();spawnSplash(G.activeBobber.x,G.activeBobber.y,18+hype.tier*6);
  if(!REDUCED_MOTION)G.shake=Math.max(G.shake,6+hype.tier*4);
  buzz(40+hype.tier*30);
  const conf = 50+hype.tier*40;
  const goldPal=['#ffd75a','#ffe14d','#f6b352','#fff3c0','#e0913a'];
  setTimeout(()=>{Sound.fanfare(hype.tier);spawnConfetti(conf, hype.tier>=3?goldPal:undefined);},220);
  // record (capture previous best BEFORE updating, for the size meter)
  const rec=G.collection[sp.id]||{count:0,bestLen:0,bestWt:0,firstBy:G.turn};
  const prevBest=rec.bestLen;
  const isRecord=sz.len>rec.bestLen;
  rec.count++;if(sz.len>rec.bestLen)rec.bestLen=sz.len;if(sz.wt>rec.bestWt)rec.bestWt=sz.wt;
  G.collection[sp.id]=rec;save();
  G.caught={sp,sz,by:G.turn,isNew:rec.count===1,isRecord,hype,prevBest};
  G.fight=null;
  setMode('result');
  showCard();
}
```

- [ ] **Step 4: Banner precedence + a develop-from-shadow reveal on the card**

In `showCard()`, replace the banner line:

```js
    el('cardBanner').textContent = isNew? '✨ New species!' : isRecord? '🏆 New personal best!' : 'Nice catch!';
```

with tiered precedence (Legendary → Lunker → New species → Personal best → Nice catch):

```js
    const tier=(G.caught.hype&&G.caught.hype.tier)||1;
    el('cardBanner').textContent =
        sp.rarity==='legendary' ? '🌟 LEGENDARY!'
      : tier>=3                 ? '🏆 LUNKER!'
      : isNew                   ? '✨ New species!'
      : isRecord                ? '🥇 New personal best!'
      :                           'Nice catch!';
```

Then replace the card-canvas draw block:

```js
    const cc=el('cardFish'),cx2=cc.getContext('2d');cx2.setTransform(1,0,0,1,0,0);cx2.clearRect(0,0,cc.width,cc.height);
    const L=Math.min(sz.len*9+150, fitL(sp,480,250));
    drawFish(cx2,sp,cc.width/2,cc.height/2,L,-1);
```

with a short "develop" animation (silhouette → full colour + scale-pop):

```js
    const cc=el('cardFish'),cx2=cc.getContext('2d');
    const L=Math.min(sz.len*9+150, fitL(sp,480,250));
    const sv={...sp,back:'#16313f',mid:'#1d4150',belly:'#2a5566',pattern:null,lat:null,eye:'#0c1a22',glassyEye:false};
    const t0=performance.now();
    (function develop(now){
      if(!el('catchCard').classList.contains('show'))return;          // bail if dismissed
      const p=Math.min(1,(now-t0)/360);
      cx2.setTransform(1,0,0,1,0,0);cx2.clearRect(0,0,cc.width,cc.height);
      const scale=lerp(0.86,1,p), Ls=L*scale;
      cx2.globalAlpha=1;
      drawFish(cx2,sv,cc.width/2,cc.height/2,Ls,-1);                   // shadow underneath
      cx2.globalAlpha=p;                                              // full colour fades in
      drawFish(cx2,sp,cc.width/2,cc.height/2,Ls,-1);
      cx2.globalAlpha=1;
      if(p<1)requestAnimationFrame(develop);
    })(t0);
```

- [ ] **Step 5: Manual verify — the reveal lands like a win**

Run: `open index.html`
Expected: Landing a fish kicks the screen, fans confetti (gold and heavier for legendaries/lunkers), and the fanfare ascends higher for bigger tiers. The card's fish "develops" from a dark shadow into full color with a small pop. Banners read 🌟 LEGENDARY / 🏆 LUNKER / ✨ New species / 🥇 New personal best / Nice catch in that priority. No errors.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: jackpot reveal — tiered confetti/fanfare/shake + develop animation + banners"
```

---

## Task 6: The "how big?" size meter on the card

**Files:** Modify `index.html` — the catch card markup (`#catchCard .card`) and `showCard`.

- [ ] **Step 1: Add the meter markup to the card**

In the catch card HTML, after the `<div class="stats">…</div>` block and before `<div class="flav" id="cardFlav">`, insert:

```html
    <div id="cardSize" style="margin:8px 6px 2px;">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#8a7b66;font-weight:700;">
        <span>🐟 small</span><span id="cardSizePct"></span><span>🏆 max</span>
      </div>
      <div style="position:relative;height:14px;border-radius:999px;background:#efe2cb;overflow:hidden;margin-top:3px;">
        <div id="cardSizeFill" style="position:absolute;left:0;top:0;height:100%;width:0%;border-radius:999px;background:linear-gradient(90deg,#9be88a,#3fae5a);"></div>
        <div id="cardSizeBest" style="position:absolute;top:-2px;width:2px;height:18px;background:#b8860b;left:0;display:none;"></div>
      </div>
    </div>
```

- [ ] **Step 2: Fill the meter in `showCard`**

In `showCard()`, just after the `el('cardWt').textContent=…` line, add:

```js
    const hp=G.caught.hype||computeHype(sp,sz);
    el('cardSizeFill').style.width=(hp.sizePct*100).toFixed(0)+'%';
    el('cardSizePct').textContent = hp.sizePct>=0.90?'Top 10%! 🤩' : hp.sizePct>=0.75?'A big one!' : '';
    const span=Math.max(0.001,sp.maxLen-sp.minLen);
    const bestPct=clamp(((G.caught.prevBest||0)-sp.minLen)/span,0,1);
    const bestEl=el('cardSizeBest');
    if((G.caught.prevBest||0)>0){bestEl.style.display='block';bestEl.style.left=(bestPct*100).toFixed(0)+'%';}
    else{bestEl.style.display='none';}
```

- [ ] **Step 3: Manual verify — the meter reads true**

Run: `open index.html`
Expected: The card shows a green bar filled to roughly where the catch sits between the species' min and max length. After you've caught a species once, the gold tick marks your previous best; beat it and the bar clearly passes the tick. Big catches show "A big one!" / "Top 10%! 🤩". No errors.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: 'how big?' size meter with personal-best tick on the catch card"
```

---

## Task 7: Near-miss glimpse on a missed hook

**Files:** Modify `index.html` — `missFish`, and the bite-timeout call site in `frame`.

- [ ] **Step 1: Let `missFish` show a tiered near-miss line**

Replace `missFish(msg)`:

```js
function missFish(msg){
  Sound.fail();
  // a teasing near-miss when a BIG one throws the hook — drives "one more cast"
  if(!msg && G.hype && G.hype.tier>=2){
    msg = G.hype.tier>=3 ? '😱 SO CLOSE — a MONSTER spit the hook!' : '😮 That was a big one — it threw the hook!';
  }
  G.fight=null;G.fish=null;G.fishSize=null;G.hype=null;
  toast(msg||'Aw, it nibbled and let go.');
  setMode('result');
  setTimeout(()=>{ if(G.mode==='result'){nextTurn();} },1700);
}
```

- [ ] **Step 2: Route the hook-timeout miss through the near-miss logic**

In `frame`, the bite-timeout branch currently reads:

```js
  else if(G.mode==='bite'){if(G.modeT>G.hookWindow)missFish('Too slow — it spit the hook!');}
```

Change it to pass no message so the tiered near-miss copy can apply:

```js
  else if(G.mode==='bite'){if(G.modeT>G.hookWindow)missFish();}
```

- [ ] **Step 3: Manual verify — the one that got away stings (a little)**

Run: `open index.html`
Expected: Let the hook window lapse on a big/rare bite (deep/lure spots) → you see "😮 That was a big one…" or "😱 SO CLOSE — a MONSTER…". On a small fish it reads "Aw, it nibbled and let go." The reel fight itself still always lands when you actually hook up. No errors.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: tiered near-miss glimpse when a big fish throws the hook"
```

---

## Task 8: Full verification pass

**Files:** none (verification + any small fixes uncovered).

- [ ] **Step 1: Run the automated test**

Run: `node --test tests/`
Expected: PASS — 7/7.

- [ ] **Step 2: Kid-proof invariant — hold-through always lands**

Run: `open index.html`. Catch ~10 fish across all three spots, each time pressing and **holding** the reel button without ever releasing.
Expected: Every fish lands. None is lost. (If any is lost, the loss terms in `startFight` were changed — revert them; only `drama` may scale.)

- [ ] **Step 3: Reduced motion**

Enable OS "Reduce Motion" (macOS: System Settings → Accessibility → Display). Reload.
Expected: No screen shake during runs or landings; everything else still reads well.

- [ ] **Step 4: Mute**

Toggle 🔊→🔇. Fish a full catch.
Expected: Silence — no bite, drag, splash, or fanfare audio.

- [ ] **Step 5: Telegraph integrity**

In the console during a fight, compare the shadow to the reveal.
Expected: The length on the card matches the size that was telegraphed (same `G.fishSize`); the reveal is never a different-sized fish than the shadow implied.

- [ ] **Step 6: Regression**

Expected: Spot select, hold-to-charge + perfect cast, turn swap (Dad ↔ Everett), the Logbook grid (caught vs. silhouette, best length/weight/count, who-caught badge), and persistence across reload all still work.

- [ ] **Step 7: Final commit (if any fixes were made)**

```bash
git add -A
git commit -m "test: full verification pass for juice-the-catch"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** Bite cue (Task 2) · roll-size-early + hype spine (Task 1) · shadow telegraph + escalating caption (Task 3) · drag/shake/haptics, winnability preserved (Task 4) · surface break + tiered confetti/fanfare/develop reveal + banner precedence (Task 5) · size meter with PB tick (Task 6) · near-miss glimpse (Task 7) · audio additions (Tasks 2,4,5) · persistence unchanged + reduced-motion + mute + kid-proof invariant (Tasks 4,8). All spec sections map to a task.
- **Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step shows complete code.
- **Type/name consistency:** `computeHype` returns `{h, tier, sizePct}` and is used with those exact fields throughout; `G.fishSize`, `G.hype`, `G.shake`, `G.caught.prevBest`, `f.drama`, `Sound.bite(intensity)`, `Sound.reelRun(intensity)`, `Sound.fanfare(tier)`, `spawnConfetti(n, cols)` are defined before use and referenced consistently.

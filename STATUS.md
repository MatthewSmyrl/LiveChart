# LiveChart — project status

**Last updated:** 2026-08-11 · **Phases 0–3 and 4a complete** · 82 tests locally,
74 in CI · **live at https://matthewsmyrl.github.io/LiveChart/**

---

## ⏳ Start here — one test is outstanding

Matt is testing the installed PWA on the iPad. **Ask how it went before planning
anything**, because the answer decides whether Phase 4b starts or Phase 4a needs
a fix. Nothing else is blocked on it.

What he is checking, opened **from the home-screen icon** (not a Safari tab — the
standalone context is the whole point):

| Check | If it works | If it fails |
|---|---|---|
| **Add to Home Screen** | The manifest and icons are right | Suspect `apple-touch-icon` or the `display` mode; the manifest is at `public/manifest.webmanifest` |
| **Wake lock** — tap Perform, leave it | Phase 4a has done its job; go to 4b | Check `useWakeLock.ts` and whether iOS granted it; the API needs a secure context *and* a visible page |
| **Offline** — Airplane Mode, relaunch | The service worker is doing its job | Check the SW registered at all; `registerServiceWorker` is a silent no-op by design |

He will see the **Format Test** fixture, not his own song — that is deliberate,
not a bug. See *Songs* below.

**Then Phase 4b.** It is the natural next step regardless of the outcome above.

---

## How to pick up

**Neither `npm` nor `node` is on PATH** — rechecked 2026-08-10, still true. Both
are reachable at the winget install path, `npm` included (11.16.0):

```bash
& "C:\Users\matts\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.18.0-win-x64\node.exe" node_modules/vite/bin/vite.js --host
```

Swap the argument for `node_modules/vitest/vitest.mjs run` to test,
`node_modules/typescript/bin/tsc --noEmit` to typecheck, or
`node_modules/vite/bin/vite.js build` to build. `.claude/launch.json` hardcodes
the same path, so the preview tooling works.

**Do not set `VITE_BASE` from Git Bash.** MSYS rewrites a leading-slash value
into a Windows path — `/livechart/` became `/Program Files/Git/livechart/` and
produced a build with dead asset links. `base` is relative by default now, so
there is no reason to set it at all; if you must, use PowerShell.

### Songs

`songs/` carries only `Format Test.lcf`, the self-authored fixture covering
rests, `N.C.`, 6/8 and wide chord names. **Real charts go in `songs/local/`,
which is gitignored** — the deployed site is public, GitHub Pages has no
private-site option, and nothing under copyright is published. `App.tsx` globs
both directories, prefers a local song for the default, and takes
`?song=<file name without extension>` to pick one.

This means **the deployed app shows only the fixture**, while a local dev server
shows the real chart. Phase 4b replaces the whole arrangement with an on-device
library.

Keep this policy in mind when writing project docs too: `STATUS.md` and
`README.md` are published. Lyric fragments were removed from this file on
2026-08-11 for exactly that reason.

### Controls

**Perform** enters performance mode: the toolbar drops out of the flow and hides
after 3.5s, the tap-zone outlines clear after 2s, and the screen is held awake.
Arrow keys, Page Up/Down and Space turn the page whether or not performance mode
is on. **Pedal** opens the learn screen. **Step** cycles the page-turn distance.

Prefs persist in `localStorage` (`lc.*`), so the toolbar may not show the
defaults described here — the step selector in particular is whatever it was
last set to.

### Deploying

Push to `main`; Actions tests, builds and publishes. Two traps already hit:

- **The preview pane refuses to load `github.io`** — blocked by policy. Verify
  the live site with `WebFetch` against `manifest.webmanifest`, `sw.js` and the
  root instead. The `/repos/{owner}/{repo}/pages` API needs auth and 404s
  without it; the Actions runs and jobs endpoints do not.
- **Enabling Pages does not retrigger the workflow.** Already enabled now, so
  this only matters if Pages is ever reconfigured.

### The LAN dev server

Still useful for testing a real chart, since the deployed build has none.

- **URL: `http://192.168.10.200:5173`** — this machine's Ethernet address, DHCP,
  network profile Private. `--host` is already in `.claude/launch.json`.
- **The firewall will probably block it.** Inbound is `NotConfigured`, which
  resolves to block, and no rule exists for `node.exe`. Needs an elevated
  PowerShell, scoped to Private so the port is never exposed on a public network:
  ```
  New-NetFirewallRule -DisplayName "Vite dev server (LiveChart)" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Private
  ```
  Tear it down afterwards with `Remove-NetFirewallRule -DisplayName "Vite dev server (LiveChart)"`.
- **Wake lock will not work here.** `navigator.wakeLock` needs a secure context;
  a LAN IP is not one, so `useWakeLock` no-ops and the iPad sleeps. That is what
  Phase 4a exists to fix — use the deployed PWA to test wake lock, not this.

---

## Decisions locked in

All of these are settled and reflected in the code and in `LCF-SPEC.md`.

| Decision | Choice |
|---|---|
| Chart model | Bar-based, **not** syllable-aligned. Chord lines describe harmonic rhythm; lyrics beneath are a memory jog |
| Section references | **Expand inline** in performance view — never scroll backwards mid-song |
| Adjacent repeats (`xN`) | Render **once with a ×N badge**, not expanded. Deliberately different from a reference |
| Navigation | Scroll by a configurable fraction of the viewport: **50% / 75% / 100%** |
| Pedal | Bluetooth page-turner sending keystrokes. Needs a **"learn pedal"** capture screen — models send different codes |
| Rest token | **`R`**. Duration inferred from beat slots, no extra syntax |
| No-chord token | **`N.C.`** — distinct from a rest |
| Rest rendering | **Inline SVG**, not Unicode. U+1D13B–E has unreliable iOS font coverage |
| Comments | `--` only at line start or after a chord line's closing `\|`. Never mid-lyric — otherwise `"well--maybe"` silently truncates on stage |
| Stack | Vite + TypeScript + React + Vitest, PWA, GitHub Pages |
| Theme | Dark by default |
| Verse 4 bar count | The 4-bar variant is **intentional**, not a transcription slip |
| Pedal scope | Pedal and keyboard turn the page **always**, in or out of performance mode. Performance mode is only about chrome, tap zones and wake lock |
| Learning a pedal | **Replaces** the defaults for that action rather than adding to them — a pedal whose "next" switch sends `ArrowUp` must not also retreat |
| Snap ties | Break towards **undershooting**. Showing a line twice is untidy; hiding one loses your place |
| Forward cap | A page turn **never scrolls past the top of a group the screen was already cutting off**. "100%" is therefore sometimes less than a full screen. Skipping a couplet — or showing it after its chord line has gone — costs you your place; overlap costs nothing |
| Tap zones | Stacked bands, **12% / 33% / 55%** — menu, back, advance. Your hand comes from below, so the biggest and lowest band is the one you need most |
| Zone outlines | Dashed outlines **stay**, but clear on their own **2s** timer rather than the toolbar's 3.5s. They are a reference you read once, not a control you reach for |
| Bar width | **Uniform across the chart, but fitted to the song** rather than a fixed multiple of the type size. `planBars` takes the widest bar at which the song's longest chord line still fits one row, clamped to 4–5 chord-em. Wrapping a phrase costs more on stage than a narrower bar; space to the right of a short line costs nothing, since every chord line gets its own row regardless |
| Published content | **No copyrighted charts in the repo or the deployed site.** Real songs live on the device. This is why `songs/local/` is gitignored and why Phase 4b matters |
| Service worker updates | **No `skipWaiting`.** A new version never swaps itself in under a song in progress; it takes over at the next launch |

---

## Done

### Phase 0 — Format spec
- `LCF-SPEC.md` — the full format definition.
- The song in v1.0 form, 162 → 115 lines. Exercises every tricky rule, so it
  doubles as the golden test fixture. Now at `songs/local/That Funny Feeling.lcf`
  and gitignored; the originals (`.lcf` / `.html` / `.pdf` in the project root)
  are untouched and likewise gitignored.

### Phase 1 — Parser (36 tests)
- `src/lcf/types.ts`, `src/lcf/parse.ts`.
- Pure and **never throws** — problems surface as `song.errors` / `song.warnings`,
  because a chart that half-renders beats a blank screen mid-gig.
- Resolves definitions, bare references, lyric-only references and variants;
  auto-numbers repeated sections.

### Phase 2 — Renderer (5 more tests)
- `src/render/` — `Glyphs.tsx`, `BarCell.tsx`, `useBarsPerRow.ts`,
  `SectionView.tsx`, `ChartView.tsx`; `src/styles.css`.
- Uniform bars across the whole chart (205px at 100% since the 2026-08-10
  refit), sticky colour-coded section headers, beat ticks, lyrics toggle, font
  scaling, light/dark.
- Verified: all 39 chord lines fit one row each at iPad landscape; no horizontal
  overflow at 1180px or 820px. The song runs ~8.5 screens at the current type
  size, up from ~6.7 before it grew.

### Phase 3 — Performance mode (35 more tests)
- `src/perform/` — `scrollPlan.ts`, `keymap.ts`, `usePerformance.ts`,
  `useWakeLock.ts`, `PedalLearn.tsx`, `TapZones.tsx`.
- Fractional scroll snapping to `[data-group]`, pedal keys with a learn screen,
  tap zones, wake lock, auto-hiding toolbar, end-of-song guard.
- `scrollPlan.ts` and `keymap.ts` are pure and DOM-free, so the rules that matter
  on stage are covered by unit tests rather than by hoping.

**Verified against the live DOM** at 1180×820, and confirmed by eye in the
preview pane:
- Page turns snap to a group boundary and land flush below the sticky header.
  The last press of each run is a short clamp onto `maxScroll`, which is
  expected — the press after it reports the edge.
- **Walking the whole song at each fraction skips nothing.** Under the original
  nearest-boundary rule, 100% skipped three lyric lines — one in the Pre-Chorus
  definition, one in Pre-Chorus 4, one in the Verse 4 variant — while 75% and 50%
  skipped none, matching a desktop Firefox run-through. The forward cap closes
  it: 0 skipped at all three fractions. At 100% the cap gives up as much as 19%
  of a screen where a group would otherwise have been cut in half.
- Three pedal presses in quick succession travel three full steps. Measuring from
  the in-flight scroll target rather than `window.scrollY` is what makes this
  work; without it a fast double press under-travels badly.
- A drag across the advance zone scrolls without turning the page.
- Toolbar auto-hides after 3.5s, returns on a tap in the top strip, and its
  buttons win over the tap zone underneath once it is back.
- The learn screen suppresses page turns while capturing, rejects an
  unidentifiable `event.code`, and persists what it captures.

### iPad run-through — 2026-08-10

The first time any of this met a real pedal at gig distance.

**Confirmed working, no bugs found:** pedal integration, scrolling, and page
turns. 75% combined with group snapping gives "very predictable paging" — the
step default is settled.

**The one thing that failed was type size.** 34px read fine on a desk and not on
a stand. So:

- `BASE_CHORD_PX` **34 → 41** (+20%). Everything on the chart derives from it,
  so titles, section headers, comments and beat ticks all moved with it.
- Lyrics **+30%** — `--lyric-px` ratio 0.66 → 0.71, i.e. 22.4px → 29.1px.
- Bar width fitted per song (see the decision table). At 1180×820 that lands on
  205px, within a pixel of what was already tested — **all 39 chord lines still
  fit one row each, and still do at 130% font scale**, where the old fixed 6em
  bar dropped to 3 across and wrapped nearly every line.
- `.chart` max-width 70rem → 80rem. The old cap threw away 60px of an iPad
  landscape screen for no benefit.
- Worst-case bar content, which is what sets the 4em floor: `Bbmaj9#11` 3.83em,
  `F#m7b5/C#` 3.82em, `|Am  R  R |` in 6/8 3.88em, all including the bar's
  padding. A typical bar is 1.2–1.8em — the old 6em bar was ~3× what it needed.

**Confirmed 2026-08-11:** the larger type is "very readable" and the extra page
turns are a fair trade — worth it with lyrics on, and turning lyrics off buys
back both content and turns. No further type work needed.

### Phase 4a — Install and offline · deployed 2026-08-11

The gap this closes: **wake lock needs a secure context**, so over LAN HTTP the
iPad sleeps mid-song. And iOS wipes script-writable storage after 7 days of
non-use unless the app is installed to the home screen — so the install had to
come *before* the library, or Phase 4b's imported songs would evaporate between
gigs.

- `public/manifest.webmanifest`, and icons generated by `scripts/make-icons.mjs`
  from the same artwork as `public/icon.svg`. The script rasterises six rounded
  rectangles and encodes the PNG directly rather than carrying an image
  toolchain; **rerun it if the SVG changes — the two are kept in step by hand.**
- `build/serviceWorker.ts` + `build/sw-template.js` — a Vite plugin that
  precaches the whole of `dist` cache-first. Hand-written rather than Workbox:
  one page, one caching rule, and no appetite for the dependency surface.
- `base` is **relative** (`./`), so one build works at a Pages subpath, a custom
  domain, or straight off disk. A wrong base is a white screen.
- `.github/workflows/deploy.yml` — test, build, publish on push to `main`. A red
  suite does not reach the iPad.

**Verified locally**: served from a subpath, the worker registers at the right
scope and precaches all 8 files; with the server killed, a reload still renders
the full chart, stylesheet and all. The offline path is proven, not assumed.

**Verified live**: the manifest keeps its relative `start_url`/`scope`, and
`sw.js` carries the right 8-file list against the `/LiveChart/` subpath. The
deployed bundle is `index-DJiHmbhj.js`, identical to a build made with
`songs/local/` absent — so the published site provably carries no chart but the
fixture. Re-prove the policy that way if it is ever questioned.

**CI runs a reduced suite.** The golden-file test parses the real chart, which
lives in gitignored `songs/local/`, so it self-skips where the file is absent:
82 tests locally, 74 in CI. It is the only test covering a whole song rather
than a snippet — **run the suite locally before pushing.**

---

## Next: Phase 4b — Library and storage

- Library, IndexedDB, `.lcf` file import, export/backup.
- **Export is not optional convenience.** iOS wipes script-writable storage after
  7 days of non-use and only home-screen PWAs are exempt, so a backup path is
  what makes the library trustworthy between gigs.
- This is also what puts real songs back on the iPad. Until it lands the choice
  is the deployed PWA (wake lock, no real song) or the LAN dev server (real song,
  no wake lock). Closing that gap is the reason to do it next.

### After that
- **Phase 5** — Setlists. The hook is already in place: `usePerformance` takes an
  `onEnd` callback fired by the confirming press at the end of a song, currently
  passed as `undefined`.
- **Deferred past v1** — in-app editor, PDF/OCR import (the source PDF is
  image-only, no text layer), transpose, sharing.

### Smaller ideas, not yet scheduled
- **Toggling lyrics mid-song.** Matt noted that lyrics off buys both content and
  fewer page turns, but the Lyrics button lives in the toolbar that hides after
  3.5s — so it is a decision made *before* a song rather than during one. A pedal
  binding or a per-song default in the `.lcf` would make it live.
- **Vertical rhythm.** If page turns ever feel too frequent, the lever is
  `.group` 0.9rem, `.section` 1.75rem and `.bar` min-height 1.5em — not bar
  width, which does not affect vertical extent at all.

---

## Open questions

1. **Zone outline timing.** Now 2s, judged in a desktop preview pane rather than
   at gig distance. Matt did not mention the tap zones after the run-through,
   which may mean the pedal makes them irrelevant in practice — worth asking
   whether this can simply be closed.

<details>
<summary>Resolved questions</summary>

2. **Bar density** — *resolved 2026-08-10.* The premise was wrong: narrower bars
   do not fit more song per screen. `columnsFor` already gives every chord line
   its own row, so vertical extent is set by the row count, not the row width,
   and the space to the right of a short line is free. Bar width buys exactly one
   thing, which is not having to wrap. Hence the fitted width.
3. **Eyes on the render** — *resolved 2026-07-25.* The preview pane only
   composites while actually displayed in the app. A hidden pane stops rendering
   frames, which is why screenshots timed out through Phases 2 and 3 and why
   `wakeLock.request` returned `NotAllowedError: not visible`. Opening the pane
   fixes it; no restart needed.
4. **Step default** — *resolved 2026-08-10.* 75%, confirmed on the iPad as
   giving very predictable paging, and the fraction where the forward cap never
   has to intervene. 100% is safe but inherently ragged, since the cap holds it
   back whenever a group straddles the fold.
5. **Type size** — *resolved 2026-08-11.* 41px chords and 29px lyrics read well;
   the extra page turns are an accepted trade.

</details>

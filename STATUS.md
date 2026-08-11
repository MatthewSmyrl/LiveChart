# LiveChart — project status

**Last updated:** 2026-08-10 · **Phases 0–3 complete, 82 tests passing**

---

## How to pick up

**Neither `npm` nor `node` is on PATH** — rechecked 2026-08-10, still true. But
both are reachable at the winget install path, `npm` included (11.16.0), which
the earlier note missed:

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
which is gitignored** — the deployed site is public, and nothing under copyright
is published. `App.tsx` globs both directories, prefers a local song for the
default, and takes `?song=<file name without extension>` to pick one. Verified:
the build without `songs/local/` is 2 kB smaller and carries no lyrics.

Phase 4b replaces this with a real on-device library.

**Perform** enters performance mode: the toolbar drops out of the flow and hides
after 3.5s, the tap-zone outlines clear after 2s, and the screen is held awake.
Arrow keys, Page Up/Down and Space turn the page whether or not performance mode
is on. **Pedal** opens the learn screen. **Step** cycles the page-turn distance.

Note that prefs persist in `localStorage` (`lc.*`), so the toolbar may not show
the defaults described here — the step selector in particular is whatever it was
last set to.

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
| Zone outlines | Dashed outlines **stay**, but clear on their own **2s** timer rather than the toolbar's 3.5s. They are a reference you read once, not a control you reach for. Confirmed useful in the pane once their purpose was clear, and too slow to clear |
| Bar width | **Uniform across the chart, but fitted to the song** rather than a fixed multiple of the type size. `planBars` takes the widest bar at which the song's longest chord line still fits one row, clamped to 4–5 chord-em. Wrapping a phrase costs more on stage than a narrower bar; space to the right of a short line costs nothing, since every chord line gets its own row regardless |

---

## Done

### Phase 0 — Format spec
- `LCF-SPEC.md` — the full format definition.
- `songs/That Funny Feeling.lcf` — the song in v1.0 form, 162 → 115 lines.
  Exercises every tricky rule, so it doubles as the golden test fixture.
- Original `That Funny feeling.lcf` / `.html` / `.pdf` left untouched.

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
- Verified: all 39 chord lines in the song fit one row each at iPad landscape;
  song runs ~6.7 screens; no horizontal overflow at 1180px or 820px.

### Phase 3 — Performance mode (35 more tests)
- `src/perform/` — `scrollPlan.ts`, `keymap.ts`, `usePerformance.ts`,
  `useWakeLock.ts`, `PedalLearn.tsx`, `TapZones.tsx`.
- Fractional scroll snapping to `[data-group]`, pedal keys with a learn screen,
  tap zones, wake lock, auto-hiding toolbar, end-of-song guard.
- `scrollPlan.ts` and `keymap.ts` are pure and DOM-free, so the rules that matter
  on stage are covered by unit tests rather than by hoping.

**Verified against the live DOM** at 1180×820, and since 2026-07-25 confirmed by
eye in the preview pane as well:
- Page turns snap to a group boundary and land flush below the sticky header.
  Ten presses cross the song at 75%, nine at 100%, sixteen at 50%, then the edge
  is reported. The last press of each run is a short clamp onto `maxScroll`,
  which is expected — the press after it reports the edge.
- **Walking the whole song at each fraction skips nothing.** Under the original
  nearest-boundary rule, 100% skipped three lyric lines ("To the thing that's
  just begun", "Steve Aoki, Logan Paul", "Going for a drive") while 75% and 50%
  skipped none — which is exactly what a desktop Firefox run-through reported.
  The forward cap closes it: 0 skipped at all three fractions. At 100% turns now
  travel 591–710px against a 729px viewport, so the cap gives up as much as 19%
  of a screen where a group would otherwise have been cut in half.
- Three pedal presses in quick succession travel three full steps. Measuring from
  the in-flight scroll target rather than `window.scrollY` is what makes this
  work; without it a fast double press under-travels badly.
- A drag across the advance zone scrolls without turning the page.
- Toolbar auto-hides after 3.5s, returns on a tap in the top strip, and its
  buttons win over the tap zone underneath once it is back.
- The learn screen suppresses page turns while capturing, rejects an
  unidentifiable `event.code`, and persists what it captures.
- Wake lock is requested on entering performance mode. It is refused in the
  preview pane because the page is not visible — expected, and swallowed
  silently by design.

---

## The iPad session — first run-through done 2026-08-10

Pedal integration works. Scrolling works. No bugs found. The one thing that did
not survive contact with the stage was the type size, so:

- `BASE_CHORD_PX` **34 → 41** (+20%). Everything on the chart is derived from it,
  so titles, section headers, comments and beat ticks all move with it.
- Lyrics **+30%** — `--lyric-px` ratio 0.66 → 0.71, i.e. 22.4px → 29.1px.
- Bar width is now fitted per song (see the decision table). At 1180×820 the
  chart holds 5 bars across at 205px, so the geometry is within a pixel of what
  was tested at the old size — **all 39 chord lines still fit one row each, and
  now still do at 130% font scale**, where the old fixed 6em bar dropped to 3
  across and wrapped nearly every line.
- `.chart` max-width 70rem → 80rem. The old cap threw away 60px of an iPad
  landscape screen for no benefit.
- Measured worst-case bar content, which is what sets the 4em floor:
  `Bbmaj9#11` 3.83em, `F#m7b5/C#` 3.82em, `|Am  R  R |` in 6/8 3.88em, all
  including the bar's padding. A typical bar in this song is 1.2–1.8em.

**The song is now ~8.5 screens rather than ~6.7** — bigger type means more page
turns, roughly 13 at 75% instead of 10. If that reads as too many, the lever is
vertical rhythm (`.group` 0.9rem, `.section` 1.75rem, `.bar` min-height 1.5em),
not bar width.

### Still to judge at gig distance

The new type size and the fitted bars have been measured, not seen on the iPad.
Worth a second run-through before Phase 4, along with the leftovers below.

### Getting it on the iPad

Serve over the LAN and open it in Safari — no build or deploy needed.

- **URL: `http://192.168.10.200:5173`** (this machine's LAN address on the
  Ethernet interface, DHCP, network profile Private). Confirmed serving on that
  IPv4 address, not just localhost — `--host` is already in `.claude/launch.json`.
- **The firewall will probably block it.** All profiles are enabled with inbound
  `NotConfigured`, which resolves to block, and no rule exists for `node.exe`.
  Needs an elevated PowerShell, scoped to Private so the port is never exposed on
  a public network:
  ```
  New-NetFirewallRule -DisplayName "Vite dev server (LiveChart)" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Private
  ```
  Tear it down afterwards with `Remove-NetFirewallRule -DisplayName "Vite dev server (LiveChart)"`.

### What this session cannot test

**Wake lock will not work over LAN HTTP.** `navigator.wakeLock` is gated on a
secure context — only HTTPS and `localhost` qualify, and a LAN IP is neither. So
the API is absent, `useWakeLock` no-ops by design, and **the iPad will sleep
mid-song.** Expected; not a bug to chase. Home-screen install and offline are out
for the same reason.

To close that gap before Phase 4, add `@vitejs/plugin-basic-ssl` — a self-signed
cert you tap through a warning to accept on iOS. Deferred as a decision, not
rejected; GitHub Pages in Phase 4 solves it properly.

### What to look for

- Whether 41px chords and 29px lyrics are now enough, and whether the extra page
  turns they cost are a fair trade.
- The 2s tap-zone outline timing (open question 4), judged in a desktop pane only.
- Whether 100% still feels acceptable now the forward cap makes its travel
  uneven, 81–97% of a screen.

---

## Phase 4a — Install and offline · deployed 2026-08-11

**Live at https://matthewsmyrl.github.io/LiveChart/** — repo
`MatthewSmyrl/LiveChart`, public, deployed by Actions on push to `main`. Pages
paths are case-sensitive, so the capitalisation matters in the URL even though
the relative `base` means the build itself does not care.

Two things to know for a future session:

- **The preview pane refuses to load `github.io`** — blocked by policy. Verify
  the live site with `WebFetch` against `manifest.webmanifest`, `sw.js` and the
  root instead. The `/repos/{owner}/{repo}/pages` API needs auth and 404s
  without it; the Actions runs and jobs endpoints do not.
- **Enabling Pages does not retrigger the workflow.** The first run fails at
  `actions/configure-pages` with Pages switched off, and needs a manual re-run.


The gap this closes: **wake lock needs a secure context**, so over LAN HTTP the
iPad sleeps mid-song. And iOS wipes script-writable storage after 7 days of
non-use unless the app is installed to the home screen — so the install has to
come *before* the library, or Phase 4b's imported songs evaporate between gigs.

- `public/manifest.webmanifest`, and icons generated by `scripts/make-icons.mjs`
  from the same artwork as `public/icon.svg`. The script rasterises six rounded
  rectangles and encodes the PNG directly rather than carrying an image
  toolchain; rerun it if the SVG changes, they are kept in step by hand.
- `build/serviceWorker.ts` + `build/sw-template.js` — a Vite plugin that
  precaches the whole of `dist` cache-first. Hand-written rather than Workbox:
  one page, one caching rule, and no appetite for the dependency surface.
  **Deliberately no `skipWaiting`** — a new version never swaps itself in under
  a song in progress, it takes over at the next launch.
- `base` is now **relative** (`./`), so one build works at a Pages subpath, a
  custom domain, or straight off disk. A wrong base is a white screen, and a
  white screen at a gig is not worth the risk.
- `.github/workflows/deploy.yml` — test, build, publish to Pages on push to
  `main`. A red suite does not reach the iPad.

**Verified locally**: served from `http://localhost:4180/livechart/`, the worker
registers at the right scope, precaches all 8 files, and — with the server
killed — a reload still renders the full chart, stylesheet and all. That is the
offline path proven, not assumed.

**Verified live**: the manifest keeps its relative `start_url`/`scope`, and
`sw.js` carries the right 8-file list against the `/LiveChart/` subpath. The
deployed bundle is `index-DJiHmbhj.js`, byte-identical to a build made with
`songs/local/` absent — so the published site provably carries no chart but the
fixture. Check that hash against a local fixture-only build if the policy ever
needs re-proving.

**Still untested — needs the iPad**: wake lock itself, and the home-screen
install. Both need iOS on the real origin, so neither can be checked from here.

**CI runs a reduced suite.** The golden-file test parses the real chart, which
now lives in gitignored `songs/local/`, so it self-skips where the file is
absent: 82 tests locally, 74 in CI. It is the only test covering a whole song
rather than a snippet — **run the suite locally before pushing.**

---

## Next: Phase 4b — Library and storage

- Library, IndexedDB, file import, export/backup. Export matters: iOS wipes
  script-writable storage after 7 days of non-use, and only home-screen PWAs are
  exempt.
- This is also what puts real songs back on the iPad. Until it lands the
  deployed build carries only the format fixture, so the choice is the deployed
  PWA (wake lock, no real song) or the LAN dev server (real song, no wake lock).
  That gap is the reason to do it next.

### After that
- **Phase 5** — Setlists. The hook is already in place: `usePerformance` takes an
  `onEnd` callback fired by the confirming press at the end of a song, currently
  passed as `undefined`.
- **Deferred past v1** — in-app editor, PDF/OCR import (the source PDF is
  image-only, no text layer), transpose, sharing.

---

## Open questions for you

1. ~~**Bar density.**~~ **Resolved 2026-08-10.** The premise was wrong: narrower
   bars do *not* fit more song per screen. `columnsFor` already gives every
   chord line its own row, so vertical extent is set by the row count, not the
   row width — the space to the right of a 4-bar line is free. Bar width buys
   exactly one thing, which is not having to wrap. Hence the fitted width above.
2. ~~**Eyes on the render.**~~ **Resolved 2026-07-25.** The preview pane only
   composites while it is actually displayed in the app — a hidden pane stops
   rendering frames, which is why screenshots timed out through Phases 2 and 3
   and why `wakeLock.request` returned `NotAllowedError: not visible`. Opening
   the pane fixed it; no restart needed. If it recurs, check the pane is on
   screen before assuming anything is broken. The chart reads well: uniform
   bars, colour-coded sticky headers, five bars across, bass notes dimmed.
3. ~~**Step default.**~~ **Resolved 2026-07-25.** 75% confirmed as the default in
   a desktop Firefox run-through — intuitive, and the fraction where the forward
   cap never has to intervene. 50% behaves as expected. 100% is now safe but
   inherently ragged, since the cap holds it back whenever a group straddles the
   fold.
4. **Zone outline timing.** Now 2s. Judged in the preview pane, not at gig
   distance on the iPad — worth a second look during the first real run-through.

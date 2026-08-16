# LiveChart — project status

**Last updated:** 2026-08-13 · **Phases 0–4b complete** · 102 tests locally,
94 in CI · **live at https://matthewsmyrl.github.io/LiveChart/**

---

## ⏳ Start here — Matt is using it against real charts

**The in-app guide is done and confirmed on the device.** Matt retested
2026-08-15 after the service-worker fix — Chrome, the iPad home-screen app, and
Airplane Mode — and all of it works: the Guide button opens, the chapter links
navigate, and ← Back to LiveChart returns to the app. **The standalone-PWA
question is answered**: the guide stays inside the installed app. Nothing is
outstanding on it.

**What is still open is the older thread, from 2026-08-11:** real-world use of
import and backup — writing more `.lcf` files and exercising import, backup and
updating songs against real material. The point is to surface what needs
changing, so **ask what came out of it before planning anything**, and fixes
from it come before new work.

**Whenever a deploy is being tested, force-quit and relaunch first.** There is
deliberately no `skipWaiting`, so a resumed app is still the old build — which
is precisely what made the fixed guide keep showing a white screen.

**Then Phase 5 — setlists.** Do not start it without checking in; the testing
may well reorder the list. When it lands it also moves the Guide button, since
Phase 5 rebuilds that screen, and the guide gains a setlists chapter.

**One standing rule now:** `docs/lcf-format.md` is the format definition —
`LCF-SPEC.md` no longer exists — so a code change touching the format updates the
guide in the same pass. The guide is written for players, so keep unbuilt
features out of it.

Nothing is blocked. Everything below is done and deployed.

### iPad, as confirmed on the device

| Check | Result |
|---|---|
| **Add to Home Screen** | ✅ Icon and standalone launch both correct |
| **Offline** — Airplane Mode, relaunch | ✅ Renders as expected; the service worker is doing its job |
| **Wake lock** | ✅ **In pedal use.** See below — the answer is subtler than it looks |
| **Import a `.lcf`** | ✅ Selects, opens and backs up — after the `accept` fix, see Phase 4b |
| **The in-app guide** | ✅ **Confirmed 2026-08-15**, including offline in Airplane Mode. Opens inside the installed app rather than bouncing out to Safari |

**Force-quit and relaunch after every deploy.** There is deliberately no
`skipWaiting`, so a resumed app is still running the old version — which makes a
shipped fix look like it did not work.

### The wake lock, and why there is no video hack

Worth reading before touching `useWakeLock.ts`, because the obvious conclusion
from the first symptom is the wrong one.

**Symptom:** enter performance mode, leave the iPad untouched, and the screen
locks at the 2-minute auto-lock. iPadOS 16.4–16.7, mains power, Low Power Mode
off — so the API is present and the usual excuses don't apply.

**What actually happens:** iPadOS *grants* the lock and then *drops it on its
own*, without us asking. Re-requesting works, but only from a user gesture — the
attempt on `visibilitychange` after a device unlock is refused with
`NotAllowedError`, while the very next tap or pedal press succeeds.

**So it comes down to whether anything prompts a retry.** A pedal press does.
A **pedal-only run of several minutes never slept** — which is what a gig
actually looks like, since a Bluetooth pedal keystroke is not touch input and
does not reset the auto-lock timer by itself. The original test failed only
because the iPad was left completely alone.

**Diagnosing this needed a badge, and reading the badge broke the experiment** —
the tap needed to reveal the toolbar was itself a gesture that re-took the lock.
The pedal-only run is what settled it. The badge has since been removed from the
toolbar; the same status now sits as a line on the **Pedal** screen, which is
only opened deliberately.

**Decisions that came out of it**, both Matt's call and both right:

- **No looping-video fallback.** The NoSleep trick would burn the compositor
  through every gig to cover a gap the pedal already covers. It was only ever
  the right answer if the grant were cosmetic, and it isn't.
- **Keep asking through the real API.** The code is correct against the spec;
  iPadOS is the thing that is wrong. A fixed iPadOS starts working for free, and
  every non-iOS browser is already correct today.

Mitigations in place: re-acquire on any pointer or key event, on
`visibilitychange`, and on a 30s timer for the gap a page turn doesn't cover — a
long instrumental, or a word with the audience. Matt is also lengthening the
iPad's auto-lock, which attacks the same gap from the other side.

**One real bug fell out of the investigation.** The guard against double-taking
the lock only checked the existing sentinel, not a request already in flight, so
two quick pedal presses could both pass, take two locks, and strand the first
untracked — leaving the screen awake after performance mode ended. Fixed with an
`inFlight` flag; verified that three presses inside the grant window now yield
exactly one request, and that exiting releases everything.

He will see the **Format Test** fixture, not his own song — that is deliberate,
not a bug. See *Songs* below.

**Nor are the six grey dots under every chord a bug**, though they arrived
looking like one: they are the Phase 2 beat ticks, and `BarCell.tsx` has only
ever been touched in the one commit that was published, so nothing about them
changed at the deploy. The fixture is `Time: 6/8`, and
`bar.tokens.length > 1 || time.beats !== 4 || time.unit !== 4` is true for every
bar of it. `That Funny Feeling` is 4/4 with a single token in every bar, so it
renders no ticks whatever — which is why they had never been seen before the
deploy swapped the song. They will disappear again when Phase 4b puts the real
chart back on the iPad.

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

Songs live in **IndexedDB on the device**, not in the bundle. The repo's `songs/`
directories only *seed* an empty library on a first run — after that the library
is the truth, and deleting a seeded song keeps it deleted (`lc.seeded`).

`songs/` carries only `Format Test.lcf`, the self-authored fixture covering
rests, `N.C.`, 6/8 and wide chord names. **Real charts go in `songs/local/`,
which is gitignored** — the deployed site is public, GitHub Pages has no
private-site option, and nothing under copyright is published. `src/library/seed.ts`
globs both and prefers a local song when choosing what to open first;
`?song=<title>` opens one directly, which is handy in dev.

So **the deployed build still seeds only the fixture**, while a local dev server
seeds the real chart. On the iPad the real charts arrive by **importing `.lcf`
files** — which is the point of Phase 4b: they reach the device without ever
entering the repo or the published site.

Keep this policy in mind when writing project docs too: `STATUS.md` and
`README.md` are published. Lyric fragments were removed from this file on
2026-08-11 for exactly that reason.

### Controls

**Perform** enters performance mode: the toolbar drops out of the flow and hides
after 3.5s, the tap-zone outlines clear after 2s, and the screen is held awake.
Arrow keys, Page Up/Down and Space turn the page whether or not performance mode
is on. **Pedal** opens the learn screen. **Step** cycles the page-turn distance.
**Songs** opens the library; the app launches straight back into whatever chart
you last had open, so starting it mid-set costs no taps.

Prefs persist in `localStorage` (`lc.*`), so the toolbar may not show the
defaults described here — the step selector in particular is whatever it was
last set to. **Lyrics are the exception:** a song carrying a `Lyrics:` attribute
opens the way its file says, whatever `lc.showLyrics` holds.

### Deploying

Push to `main`; Actions tests, builds and publishes. Traps already hit:

- **The preview pane refuses to load `github.io`** — blocked by policy. Verify
  the live site with `WebFetch` against `manifest.webmanifest`, `sw.js` and the
  root instead. The `/repos/{owner}/{repo}/pages` API needs auth and 404s
  without it; the Actions runs and jobs endpoints do not.
- **Enabling Pages does not retrigger the workflow.** Already enabled now, so
  this only matters if Pages is ever reconfigured.
- **`gh` is not installed, and the unauthenticated Actions API rate-limits
  hard.** Three concurrent 15-second poll loops exhausted it on 2026-08-11 and it
  started returning `403` for the rest of the session. Worse, each loop only
  matched the *success* pattern, so a 403 body looked identical to "still
  running" and they polled forever.
  **Verify a deploy against the live site instead**, which is not rate-limited:
  read `sw.js` for the current `assets/index-*.js` hash, then `grep` that bundle
  for a string unique to the change. Any watcher must exit on failure and on
  timeout as well as on success — silence is not success.
- **Proving the no-copyright policy on a deploy:** `grep` the live bundle for
  `That Funny Feeling` (absent) and `Format Test` (present). Verified this way on
  every deploy of 2026-08-11.

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

All of these are settled and reflected in the code and in `docs/lcf-format.md`.

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
| Published content | **No copyrighted charts in the repo or the deployed site.** Real songs live on the device, and reach it by import. This is why `songs/local/` is gitignored |
| Launch destination | **The song you last had open.** Starting the app mid-set must not cost a tap. The library is one button away, and is only forced when there is nothing to show |
| Song identity | **The file's own `Title` attribute**, case- and space-insensitive. Re-importing a chart you edited on a computer updates the one you have rather than leaving near-duplicates to choose between at a gig |
| Backup shape | **One JSON bundle of everything, plus per-song `.lcf` export.** The bundle carries each song's original source plus the `lc.*` prefs, so one file restores a wiped device; the per-song export gets a single chart back out in a form you can edit. Import accepts either |
| Seeding | **Once, and only once.** `songs/` and `songs/local/` fill an empty library on a first run, then `lc.seeded` stops them coming back — deleting the fixture has to stick |
| Restored preferences | **Applied at the next launch, not mid-session.** Yanking the type size or theme out from under whoever is looking at the screen is worse than waiting |
| Service worker updates | **No `skipWaiting`.** A new version never swaps itself in under a song in progress; it takes over at the next launch |
| Per-song lyrics | **`Lyrics: on\|off` in the file header, and it wins every time the song opens.** Whether you need the words is a property of the song, not something to remember at the top of it. The toolbar button still overrides for as long as that song is up; reopening restores the tag. Untagged songs fall back to `lc.showLyrics` |
| Wake lock on iOS | **Keep asking through the standard API; no video hack.** iPadOS 16.4–16.7 grants the lock and drops it unprompted, so what matters is re-acquiring — on any gesture, on `visibilitychange`, and on a 30s timer. A pedal-driven song never sleeps. The hidden-video trick would cost battery at every gig to cover a gap the pedal already covers, and a fixed iPadOS would make it dead weight |
| Wake-lock status | **On the Pedal screen, not over the chart.** The lock is dropped and re-taken constantly on iOS, so a live badge flickers through every song saying nothing actionable. The pedal screen is opened deliberately — the right place to check whether an iPadOS update has fixed this |

---

## Done

### Phase 0 — Format spec
- The full format definition. Written as `LCF-SPEC.md`; folded into
  `docs/lcf-format.md` on 2026-08-13 and that file deleted — see *Documentation*
  below.
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
102 tests locally, 94 in CI. It is the only test covering a whole song rather
than a snippet — **run the suite locally before pushing.**

**All three 4a checks are now confirmed on the device** — install, offline and,
in pedal use, wake lock. See *Start here* for the wake-lock story, which is not
what the first symptom suggested.

### Per-song lyrics · 2026-08-11

`Lyrics: on|off` in the `.lcf` header. `on`/`yes`/`true`/`show`/`1` and their
opposites all parse, case-insensitively; an unrecognised value is a warning and
the attribute is ignored rather than guessed at. `songs/Format Test.lcf` carries
`Lyrics: on`, so the published fixture exercises it.

Verified in the preview pane against the precedence rule in the decision table:
with `lc.showLyrics` set to `false`, the tagged fixture still opened with all
five lyric lines; the toolbar button hid them; a reload brought them back.

### Phase 4b — Library and storage (16 more tests)

What it closes: until now the choice was the deployed PWA (wake lock, only the
fixture) or the LAN dev server (real chart, no wake lock). Importing puts the
real charts on the installed app, so there is no longer a trade.

- `src/library/` — `db.ts` (IndexedDB, one `songs` store, hand-written for the
  same reason as the service worker), `identity.ts`, `merge.ts`, `backup.ts`,
  `download.ts`, `seed.ts`, `useLibrary.ts`, `LibraryView.tsx`.
- The pure parts carry the tests, as with `scrollPlan` and `keymap`: identity,
  merging and the backup format are covered without touching a browser.
- **Export goes through the share sheet first**, falling back to an anchor
  download. On an iPad that is the difference between reaching Files, iCloud and
  AirDrop, and landing somewhere you then have to go looking for.
- **Storage failures never take the app down.** An unopenable database leaves the
  songs in memory and a warning on the library screen, because a chart you cannot
  save still beats no chart on stage.
- **A backup is a file from outside the app**, so restoring one takes only `lc.*`
  string preferences and skips song entries it cannot read, rather than refusing
  the whole bundle or writing arbitrary keys into `localStorage`.
- **The file input carries no `accept` attribute, and must not.** iOS resolves
  `accept` entries to UTIs, and `.lcf` is an extension nothing has registered, so
  *any* accept list greys the charts out in the Files picker — hit on the iPad
  2026-08-11 with `accept=".lcf,.json,.txt,text/plain,application/json"`.
  `text/plain` does not rescue it, because iOS types an unknown extension as
  generic data rather than text. Showing every file costs nothing: what a file is
  gets decided by reading it, and a non-chart is refused by name with a reason.
  **Adding a filter back would silently break importing on the only device that
  matters.**

**Verified in the preview pane**, from a cleared database each time: a first run
seeds and opens the local chart; import adds a chart and rejects a non-chart with
a reason, in one honest message; re-importing an edited chart updates in place
rather than duplicating; songs and edits survive a reload; opening a song and
relaunching lands back on it; a backup captures all songs and prefs, and restores
a deleted song without restamping the untouched ones; deleting everything leaves
an empty library that does not reseed.

**Verified on the iPad**: a `.lcf` selects from the Files picker, opens, and
backs up.

**Not yet proven — the honest gaps in 4b:**

- **The storage-failure branch has never run.** An IndexedDB that refuses to open
  is meant to leave the songs in memory with a warning; that path is reasoned,
  not demonstrated. It is the one you would hit on a bad day.
- **Only the share-sheet path has been used on iOS.** The anchor-download
  fallback in `download.ts` is untested on the device, and would be what a future
  iPadOS falls back to if `navigator.canShare` ever stops accepting files.
- **No test covers a library round trip through IndexedDB**, only the pure logic
  either side of it. `db.ts` is proven by hand in the preview pane.

### Documentation — user guide · 2026-08-13

`docs/` holds the user guide: a landing page plus *Why it works this way*,
*Getting the app*, *Using LiveChart*, *Songs, import and backup*, and the format
chapter. Written for players rather than for this project — friends and
enthusiasts, some of whom we don't know. It deliberately says nothing about
setlists or transpose; those get written up when they ship.

**`LCF-SPEC.md` was folded into `docs/lcf-format.md` and deleted.** One document
is now both the writing guide and the definition the parser is written against.
Two versions of the format was a standing invitation to drift, and the format is
the part of the documentation most likely to be read and re-read.

No stub was left behind: every reference — `README.md`, this file, and comments
in `parse.ts`, `types.ts` and `Glyphs.tsx` — points at the guide instead. The
original file is in the history if it is ever wanted; the last commit carrying
it is the one before the 2026-08-13 documentation work.

Two things the old spec claimed that the code never did, corrected rather than
carried across:

- **Tap zones** as left/right halves. They are three stacked bands — 12% menu,
  33% back, 55% advance — and have been since Phase 3.
- **A song info panel.** There isn't one. `Notes` and unrecognised attributes
  are parsed into `meta.extra` and survive backup and export, but nothing
  renders them. The guide says so plainly; if a panel ever lands, that paragraph
  is what changes.

The navigation contract from the old §10 lives on as an appendix to the format
chapter — it constrains the parser's output shape, so it belongs with the
format, corrected on the same two points and with the forward cap added.

### The guide inside the app · 2026-08-13

Brought forward from Phase 5 on Matt's call: low risk, and worth a lot to anyone
testing the app. Only the button placement is provisional — the Songs screen is
what Phase 5 rebuilds.

- `build/guide.ts` — a Vite plugin that renders `docs/*.md` into `dist/guide/`
  at build time, plus `build/guide.css`. `docs/README.md` becomes `index.html`,
  so `guide/` resolves on its own.
- **`marked` as a devDependency.** Against the instinct that hand-wrote the
  service worker and `db.ts`, and right anyway: markdown is a settled standard,
  this runs at build time only, and nothing ships to the browser. Hand-rolling a
  parser that survives the guide's tables and fences is the worse trade.
- **The Songs screen gets a `Guide` link**, an `<a class="btn">` rather than a
  button, since it navigates rather than changing state. `a.btn` in `styles.css`
  gives it the centring a button gets for free.
- **Every page carries "← Back to LiveChart".** Launched from the home screen
  there is no browser chrome and no back button, so without it the guide is a
  one-way trip out of the app mid-set.
- The pages read the app's `lc.theme` inline before paint, so opening the guide
  from a dark stage doesn't flash white.
- **Offline came free**: `serviceWorker.ts` walks the whole of `dist`, so the
  seven guide files joined the precache with no change to it — 8 files to 15.

**Two things that were wrong before they were checked**, both found by looking
at the built output rather than trusting it:

- **`marked` does not emit heading `id`s.** Every in-page anchor in the guide
  was dead — the format chapter's entire contents list, and every cross-page
  link like `songs.html#backing-up-and-why-you-should`. `addHeadingIds` now
  applies GitHub's slug rule, because that is the shape the links were written
  in and GitHub is where the guide is also read. **If a heading link ever
  breaks, look there first.**
- Tab titles carried raw markdown — *The \`.lcf\` format*.

**Verified in the preview pane:** all 54 internal links across the six pages
resolve, anchors included; the Guide button opens the guide and the back link
returns to the app; light and dark both follow `lc.theme`; and no page scrolls
sideways at 390px, since the wide reference tables scroll inside themselves.

**The guide shipped broken, and the bug was in the service worker · fixed
2026-08-15.** Matt got a **white screen** from Songs → Guide on the deployed
site, on both the iPad and Chrome on a PC, while the same build worked from the
dev server.

`sw-template.js` answered *every* navigation with the app shell, which is right
for a single-page app and wrong the moment the build contains a second page. So
`guide/index.html` was served the app's own `index.html`, whose relative asset
URLs then resolved a directory too deep, 404'd, and left nothing on screen. It
now serves a precached page as itself and only falls through to the shell for
routes the build does not contain — a directory URL resolving to its
`index.html`, the way a web server would.

**Why it got through**, which matters more than the bug: the dev server has no
service worker, and `WebFetch` does not run one either. Both checks that passed
were checks the worker never saw. **A service worker change is only tested
against the built site with the worker live** — `.claude/launch.json` now has a
`livechart-built` entry (`vite preview`, port 4173) for exactly this, and
stopping that server is a real offline test.

Doing that turned up a **second fault the first one was hiding**: with the
server stopped, the app itself would not boot, because `caches.match` honours
`Vary` and `vite preview` sends `Vary: Origin`. The page's module script carries
an `Origin` header the worker's own precache fetch did not, so the entry was
there and unreachable. Lookups now pass `ignoreVary` — the cache holds one
response per URL, so `Vary` can only ever cause a miss, and a miss offline is a
blank screen. GitHub Pages does not send that header, so this was never what
Matt hit; it was a trap waiting for a different host.

**Verified against the built site with the worker active, server stopped:** the
guide renders offline, the back link boots the app with the chart on screen, and
every precached URL answers 200.

**Confirmed on the device, 2026-08-15**, after the fix below: Chrome, the iPad
home-screen app, and Airplane Mode. The Guide button opens, the chapter links
navigate, and the back link returns to the app. **Tapping *Guide* keeps you
inside the installed app** — it does not bounce out to Safari, which was the one
thing that could not be tested anywhere but the device.

---

## Next: real-world testing, then Phase 5 — Setlists

**First**: whatever comes back from the iPad — the in-app guide, and the older
run at import, backup and updating songs against real charts. Fixes land before
new work. See *Start here* for what to ask about each.

**Then Phase 5:**

- The hook is already in place: `usePerformance` takes an `onEnd` callback fired
  by the confirming press at the end of a song, currently passed as `undefined`.
  The library gives it something to advance *to*.
- It rebuilds the Songs screen, so it inherits two loose ends: the **Guide
  button's placement**, which was always provisional, and a **setlists chapter**
  for the guide — written in the same pass as the code, per the standing rule.
- **Deferred past v1** — in-app editor, PDF/OCR import (the source PDF is
  image-only, no text layer), transpose, sharing.

### Smaller ideas, not yet scheduled
- **Toggling lyrics mid-song.** The per-song `Lyrics:` default landed on
  2026-08-11, so the decision is now carried by the file. What is still missing
  is changing your mind *during* a song: the Lyrics button lives in the toolbar
  that hides after 3.5s. A pedal binding is the remaining lever.
- **Vertical rhythm.** If page turns ever feel too frequent, the lever is
  `.group` 0.9rem, `.section` 1.75rem and `.bar` min-height 1.5em — not bar
  width, which does not affect vertical extent at all.

---

## Open questions

None outstanding. Phase 4b is the next work, not a question.

<details>
<summary>Resolved questions</summary>

7. **Wake lock on iPadOS 16.4–16.7** — *resolved 2026-08-11.* Granted, then
   dropped unprompted; recovered by any gesture, so pedal use holds the screen.
   No video fallback. See *Start here*.

6. **Zone outline timing** — *resolved 2026-08-11.* The tap zones "work great"
   at gig distance and the 2s outline timer stays as it is. No further work.

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

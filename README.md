# LiveChart

An offline chord-chart display for live performance, built for an iPad on a mic
stand. Bar-based charts, a Bluetooth page-turner pedal, and a screen that stays
awake and legible at gig distance.

It is a personal tool, published only so it can be installed to a home screen.

## What it does

- **Bar-based charts, not syllable-aligned.** Chord lines describe the harmonic
  rhythm; lyrics underneath are a memory jog, not a singalong.
- **Page turns that never lose your place.** Scrolling snaps to group
  boundaries, so a turn can't separate a chord line from its lyrics, and never
  scrolls past the top of a group the screen was already cutting off.
- **Pedal and keyboard**, with a learn screen — page-turners send different
  key codes, so the app captures whatever yours sends.
- **Tap zones** sized for a hand coming from below, and a wake lock so the
  screen doesn't sleep between verses.
- **Offline.** A service worker precaches the whole build; once installed it
  never needs the network.

`LCF-SPEC.md` defines the `.lcf` chart format. `STATUS.md` carries the current
phase, the decisions that are settled, and why.

## Songs

`songs/` holds only `Format Test.lcf`, a self-authored fixture exercising rests,
`N.C.`, odd metres and wide chord names.

**Put your own charts in `songs/local/`** — it is gitignored, so they are picked
up when you run or build the app yourself and are never published. This site is
public, and other people's songs are not mine to republish.

Pick a chart with `?song=<file name without extension>`.

## Development

```bash
npm install
npm run dev      # dev server, --host for LAN access
npm test         # 82 tests; 74 where songs/local is absent
npm run build    # production build into dist/
```

Note that the full suite includes a golden-file test against a real chart in
`songs/local/`, which self-skips when absent — so run the tests locally rather
than relying on CI alone.

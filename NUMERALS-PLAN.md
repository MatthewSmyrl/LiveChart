# LiveChart v2, Part 2 — Numerals

**Status: decisions recorded, plan not yet written.** Waiting on one
confirmation from Lance Ruby (below). The full requirements and build plan get
written when it comes back. Until then this file exists so that what is already
decided lives in the repo, not in one conversation.

Split from transposition on 2026-09-20; see `TRANSPOSITION-PLAN.md` (Part 1).
Part 2 builds on two things from Part 1: the spelled-note core in `src/music/`,
through which numerals convert to and from letters, and the key picker, which
gains a **Numerals** entry.

**Credit.** The numeral scheme comes from **Lance Ruby**, a working player Matt
consulted in September 2026. The player-facing guide must credit him when this
ships — Matt's explicit request.

---

## Decided

Matt, with Lance's input, 2026-09-20 unless dated otherwise.

**Roman numerals, with case carrying the quality**

- Chords are written `I`–`VII`. **Uppercase is major, lowercase is minor.** The
  quality is always explicit, never implied by the key.
- The rest of the quality follows unchanged, with the minor `m` absorbed into
  the case. In G: `G7` → `I7`, `Gmaj7` → `Imaj7`, `Em7` → `vi7`.
- **In a minor key the tonic is `i`.** In Am, Am is `i` — not `vi` of the
  relative major.
- A major V in a minor key is `V`; a minor one is `v`. The same goes for VII.
- **Chromatic roots take the accidental in front:** `bVII`, `bIII`, `#IV`. Common
  in minor keys, where C in Am is `bIII` and G is `bVII`.
- **Diminished, half-diminished and augmented follow convention:** `vii°`,
  `viiø7`, `III+`. A file can be typed in plain text — `dim` or `o` for °,
  `m7b5` for ø — and the chart draws the symbols. No special characters are ever
  needed in a `.lcf`.

**Slash basses — a digit for the member of the chord**

- The bass is a **digit naming its place in the chord**, not in the key. In G,
  D/F♯ is `V/3`: the V chord with its third in the bass.
- The accidental goes **in front**, matching the roots: the walk-down D, D/F♯,
  D/F is `V`, `V/3`, `V/b3`.
- Member of the chord means **the chord's own quality decides**: Am/C is `vi/3`
  and Am/G is `vi/7`, because C and G are Am's third and seventh.

**Key and Capo in a numeral chart**

- Both are **notes**. Neither changes a single numeral. That the numbers don't
  move when the key changes is the point of the system, not a defect
  (2026-09-05).
- *Proposed, not objected to:* `Key:` is still the sounding key, and is the
  default tonic when a numeral chart is shown in letters. A capo then gives the
  shapes, exactly as in Part 1 — *Here Comes the Sun* at `Key: A`, `Capo: 7`
  shows D shapes.
- Converting a **letter** chart to numerals counts from the key the page is
  written in, `Key − Capo`, not from `Key` (2026-09-05). Otherwise a capo'd chart
  numbers as nonsense. Rare, since numeral charts are almost never capo'd, but to
  be handled correctly. Every fixture is `Capo: 0`, so the test needs a
  synthetic capo'd chart.

**No new attribute**

- A chart is a numeral chart **because its chords are numerals**. Roman numerals
  cannot be mistaken for letter chords, so nothing needs declaring. `Key: N` and
  `Notation: numbers` from the first draft are dropped.
- A chart mixing numerals and letters renders each as written.

**Superseded:** the Arabic-digit scheme (`1`–`7`, `6m`), and with it the
implied-versus-explicit quality question. Case settles it.

---

## Waiting on Lance

The rule for bass digits, precisely enough to code:

> **1, 3, 5 and 7 are the chord's own members, as its quality makes them.** The
> 3 of a minor chord is its minor third, the 5 of a ° chord its flat fifth, the 7
> of a minor or dominant chord its flat seventh.
> **Any other bass note is counted up the chord's own scale** — major for
> uppercase, natural minor for lowercase — with ♭/♯ where it departs.

Matt believes this is right. The two results to put to Lance:

| Letters | Numerals | Why it might surprise |
|---|---|---|
| Am, Am/G, Am/F♯, F | `vi`, `vi/7`, **`vi/#6`**, `IV` | F♯ is sharp against A natural minor. If Lance would write `vi/6`, minor chords count on Dorian instead — a one-line change |
| D/C vs D7/C | **`V/b7`** vs **`V7/7`** | Same notes. C is a member of D7 but not of a plain D |

---

## Still to work out in the plan

- **Width.** `bVIImaj7/b3` is wider than anything `MIN_BAR_EM` was measured
  against. Re-measure.
- **Legibility at gig distance.** Lowercase `ii`, `iii`, `vi` and `vii` differ
  only by thin strokes. An iPad test, possibly with extra letter-spacing.
- **The grammar**: numeral roots, the digit bass, and how both sit alongside
  Part 1's tightened quality grammar — which is what already stops `vamp` and
  `intro` being read as numerals.
- **The guide chapter**, crediting Lance Ruby.

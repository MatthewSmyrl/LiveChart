# LiveChart v2 — Transposition

**Status:** requirements and plan. Nothing here is built. Written 2026-09-05,
against the deployed Phase 5 codebase.

Transposition was on the *Deferred past v1* list in `STATUS.md`. This document
turns Matt's model into something buildable: the arithmetic, the rules, the
places it touches, and the questions still open. It is a working document, not
player-facing — the player-facing half lands in `docs/lcf-format.md` and
`docs/using.md` when the code does, per the standing rule that a format change
updates the guide in the same pass.

### Settled so far

Confirmed by Matt, 2026-09-05:

- **The `Key − Capo` model** of §1, including the correction in §5.1. Nashville
  charts are almost never written capo'd, so that path is a corner case — but it
  is to be handled correctly rather than assumed away.
- **Slash basses number like roots** (§5.5): `1/3`, and `1/b3` reads as the 1
  chord with a flat third in the bass.
- **Numbers not moving with the key is the point, not a defect** (§5.6). A
  player reading numbers is transposing in their head by design. The Key and
  Capo controls stay live in Numbers view.

Still open: §9, and **question 2 sets the token model** — decide it first.

---

## Contents

- [1. The model](#1-the-model)
- [2. Chord spelling](#2-chord-spelling)
- [3. Where the values come from](#3-where-the-values-come-from)
- [4. Controls](#4-controls)
- [5. Nashville numbers](#5-nashville-numbers)
- [6. Format changes](#6-format-changes)
- [7. Architecture](#7-architecture)
- [8. What this version does not do](#8-what-this-version-does-not-do)
- [9. Open questions](#9-open-questions)
- [10. Build order](#10-build-order)
- [11. Test plan](#11-test-plan)
- [12. Traps](#12-traps)

---

## 1. The model

### 1.1 The one sentence

**The chart draws the shapes your hands make.** Two values decide which shapes:
`Key` is what the song sounds like, `Capo` is where the capo sits, and the chart
is drawn in `Key − Capo`.

### 1.2 Terms

| Term | Meaning |
|---|---|
| `fileKey` | The `Key:` attribute. **Defaults to C** when the file says nothing |
| `fileCapo` | The `Capo:` attribute. Defaults to 0 |
| `writtenPitch` | The key the chords are literally typed in = `fileKey − fileCapo` |
| `appKey` | The sounding key now in force. Starts at `fileKey` |
| `appCapo` | The capo position now in force. Starts at `fileCapo` |
| `shapeKey` | What gets drawn = `appKey − appCapo` |
| `delta` | Semitones every chord moves = `shapeKey − writtenPitch`, mod 12 |

All arithmetic is on pitch classes 0–11, C = 0.

### 1.3 The invariant that matters most

At `appKey = fileKey` and `appCapo = fileCapo`, `delta = 0` — and **a chart at
delta 0 renders exactly as its file was written**, original spelling and all.
Opening a song you have not touched can never show you something different from
the file. This is a hard requirement and the first test to write.

### 1.4 Validated against a real chart

`That Funny Feeling` carries `Key: E`, `Capo: 2nd fret`, and its chord lines are
written `D/A`, `G`, `Em`, `A`, `Bm` — D-shapes. `E − 2 = D`. The convention
already in the library matches the rule exactly, so no existing chart needs
editing.

### 1.5 Worked examples

Using that file: `fileKey` E, `fileCapo` 2, `writtenPitch` D.

| appKey | appCapo | shapeKey | delta | `D/A` | `G` | `Em` | What it means |
|---|---|---|---|---|---|---|---|
| E | 2 | D | 0 | `D/A` | `G` | `Em` | Untouched — the file as written |
| E | 0 | E | +2 | `E/B` | `A` | `F#m` | Same sounding key, capo off, harder shapes |
| D | 0 | D | 0 | `D/A` | `G` | `Em` | Same shapes, now sounding a tone lower |
| G | 5 | D | 0 | `D/A` | `G` | `Em` | Same shapes, capo up to sound in G |
| F | 2 | D# | +1 | `D#/A#` | `G#` | `Fm` | Up a semitone for the singer |
| C | 0 | C | −2 | `C/G` | `F` | `Dm` | Down to C, no capo |

Note rows 1, 3 and 4: three different sounding keys, one identical page. That is
the model working — `Capo` and `Key` move the chart in opposite directions and
cancel.

### 1.6 Requirements

- **R1.1** The chart displays every chord token transposed by `delta`.
- **R1.2** `delta = 0` renders the source text verbatim.
- **R1.3** Only `chord` tokens move. `R`, `N.C.`, `%` and unrecognised literals
  are untouched — `tacet` must never become `uacfu`.
- **R1.4** A chord's quality string is carried verbatim. `Bbmaj9#11` up 2 is
  `Cmaj9#11`; the `#11` inside the quality is text, not a pitch.
- **R1.5** Slash bass notes transpose by the same `delta` as the root.
- **R1.6** `appCapo` ranges 0–11. Above 11 is the same shapes an octave up, and
  no guitar has the frets to make it mean anything different.
- **R1.7** An unparseable `Key:` value is a warning, not an error. The song still
  renders, treated as C. Never fail a chart on stage over a header line.
- **R1.8** Mode (major/minor) rides along with the key but is never chosen by the
  transposer — a semitone shift preserves mode automatically. `Bbm` up 2 is `Cm`.

---

## 2. Chord spelling

**Matt's call: sharps.** When the app generates a name that lands on a black
note, it writes `C# D# F# G# A#`, never `Db Eb Gb Ab Bb`.

- **R2.1** Generated roots and bass notes use sharp names.
- **R2.2** This applies **only when `delta ≠ 0`**. A file that writes `Bb` and
  has not been transposed still shows `Bb`. R1.2 outranks this rule.
- **R2.3** Enharmonic input is read correctly regardless: `Db` in a file parses
  as pitch 1 and transposes correctly; it just comes back out as a sharp.

**The accepted cost.** Transposing into flat-side keys produces names a reader
would conventionally see flat: in F major, a borrowed ♭III will read `G#` where
`Ab` is what the eye expects. This is a real but minor legibility tax, and the
escape hatch — a per-song *prefer flats* toggle — is deliberately deferred rather
than designed out. See open question 1 for the key *label*, which is a separate
and slightly awkward case.

---

## 3. Where the values come from

Exactly the shape of the existing `Lyrics:` precedence, which is already proven
and already understood.

**Precedence, applied to `Key` and `Capo` independently:**

1. **Toolbar override** — set while this song is up. Wins everything. Cleared
   when the song changes, exactly like `lyricsOverride`.
2. **Setlist entry** — if a set is playing and the current position's entry
   specifies a value.
3. **The file** — `Key:` and `Capo:`, defaulting to C and 0.

- **R3.1** Changing key or capo from the toolbar is temporary. Reopening the song
  returns to the setlist value, or the file's.
- **R3.2** A setlist entry may carry its own `key` and `capo`. Each time that
  song is reached from that set, those values are in force.
- **R3.3** Entries are per **position**, not per song id. The same song twice in
  one night can sit at two different keys — which is what the existing
  "position, never song id" decision was already built for.
- **R3.4** Off the set (position −1, a song opened by hand while a set is active)
  the file's values apply. No setlist entry is in scope.
- **R3.5** Key and capo override independently: pinning a capo in a setlist and
  nudging the key from the toolbar leaves the pinned capo alone.

---

## 4. Controls

### 4.1 On the chart

The toolbar already carries nine controls and is the tightest real estate in the
app. Adding four buttons is not an option.

- **R4.1** One **Key** button in the toolbar, reading the current state
  compactly — `E`, or `E·2` when a capo is set, or `Nos` in numbers view.
- **R4.2** It opens a panel over the chart, in the manner of the existing Pedal
  screen: a grid of the twelve roots plus **Numbers**, a capo stepper
  (− / value / +), and **Reset to file**.
- **R4.3** The panel is a deliberate stop, not a mid-song action. It holds the
  chrome open while it is up, as `PedalLearn` already does.
- **R4.4** The `Key`/`Capo` readout in the chart header is a second tap target
  for the same panel.
- **R4.5** The chart header shows the values in force: `Key A · Capo 2`, plus the
  shape key when the capo is not 0, e.g. `· in G`.
- **R4.6** When `delta ≠ 0` the chart is visibly marked as transposed. A chart
  that has silently moved and looks ordinary is the worst possible failure on
  stage.

### 4.2 On a setlist

- **R4.7** Each song row in a setlist can be given a key and a capo, from the
  same panel, without opening the chart.
- **R4.8** A row shows its pinned values when it has them, and shows nothing when
  it does not — a set that has never been transposed must not grow a column of
  noise.

---

## 5. Nashville numbers

### 5.1 The correction that has to be made first

Matt's rule reads: *"selecting to transpose it to Numbers converts it with the 1
being the root chord of the default key defined in the LCF file."*

**Taken literally that produces nonsense on any chart with a capo.** On
`That Funny Feeling` the `Key:` is E, but the page is written in D. Numbering
D-shapes against a tonic of E gives `D/A → b7/4`, `Em → 1m`, `G → b3` — a chart
in ♭7 that no one can read.

**The rule has to be:** *1 is the root of the key the chords on the page are
written in* — that is `shapeKey`, or `Key − Capo`. On a song with no capo the two
are identical, which is why the distinction is easy to miss.

- **R5.1** `degree = pitch(token) − pitch(shapeKey)`, mod 12.

**Confirmed 2026-09-05.** Matt's note: a Nashville chart is almost never written
with a capo as well, because there is little point — so this is a corner case
rather than a common path. It is still to be handled correctly, which is exactly
why the test below uses a synthetic capo fixture. A rule that is right only on
the charts you happen to own is not a rule.

There is a pleasant consequence. **Numbers are invariant under transposition**:
numbering D-shapes against D gives the same page as numbering the sounding
E-chords against E. So the question "relative to the file's key or the current
one?" has no observable answer — both give the same chart. One less decision.

### 5.2 The degree table

Twelve semitones, one spelling each:

| Semitones | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Degree** | 1 | b2 | 2 | b3 | 3 | 4 | b5 | 5 | b6 | 6 | b7 | 7 |

- **R5.2** Number accidentals are **flats**, not sharps. The sharps rule of §2 is
  about letter names. `b3` is how a minor third reads; `#2` is not a thing. These
  two rules disagreeing is correct, not an oversight.
- **R5.3** Accidentals go **before** the number — `b7`, `b3` — mirroring how they
  are written and read, and unlike letter names where they follow.

### 5.3 Minor keys

Matt's rule — "the root of the selected key becomes the 1 chord" — is taken
literally and applies to minor keys too.

- **R5.4** In a minor key the tonic is `1`. A song in Am numbers as `Am → 1m`,
  `C → b3`, `Dm → 4m`, `F → b6`, `G → b7`, `E → 5`.

This is *tonic-relative* numbering. Some players number minor songs from the
relative major instead (`Am → 6m`, `C → 1`). Matt's rule is the first; open
question 3 confirms it, because a chart numbered under the wrong convention is
useless and the fix is a one-line constant.

### 5.4 Qualities

**This is open question 2, and it sets the token model.** Two readings of a bare
number, and they are not compatible.

**Implied — standard Nashville.** A bare number takes the diatonic quality of the
key: in C, `6` is Am, `2` is Dm, `4` is F. Deviations are marked explicitly. This
is what a Nashville player expects and what they will type.

**Explicit — a departure.** A bare number is always a major triad; `Em` in G is
written `6m`. Nothing is ever inferred.

**Recommended: a hybrid, which gets most of both.**

- **R5.5** *(reading)* A bare number is **expanded diatonically from the key**,
  per standard convention. A chart typed by anyone who knows Nashville reads
  correctly with no re-learning.
- **R5.6** *(writing)* When the app generates numbers from letters it always
  emits the quality **explicitly** — `6m`, not `6`. What the app produces can
  then never be misread, and does not depend on the key attribute being right.
- **R5.7** Letters → numbers carries the quality verbatim: `F#m7b5` in G becomes
  `7m7b5`.

The hybrid costs nothing on input and removes the round-trip hazard on output.
The one place it does not save us is minor keys — see below, and question 2.

**Why implied has teeth.** Diatonic expansion needs the key *and the mode*, which
makes two things load-bearing that were previously decorative:

- A `Key: N` chart with no tonic declared (question 7) **cannot expand a bare
  number at all**. This is the strongest argument for `Notation: numbers`
  alongside a real key.
- **Minor keys are genuinely ambiguous.** Natural minor makes `5` a minor chord,
  but minor-key songs use a major V constantly. A player typing `5` in a minor
  song almost certainly means the major one, and natural-minor expansion would
  silently hand them the wrong chord — the exact failure mode this format tries
  to design out.

### 5.5 Slash basses as numbers

Matt flagged this as the part he was least sure of. It holds up, and is
**confirmed 2026-09-05**.

- **R5.8** A bass note is numbered by the same table: in D, `D/F#` is `1/3`.
- **R5.9** Non-diatonic basses need the accidental: in D, `D/F` is `1/b3` — read
  as the 1 chord with a flat third in the bass. The grammar must accept it.

This is also what real Nashville charts do, so it is convention rather than
invention. The one genuine wrinkle is grammatical, not musical — see §6.2.

### 5.6 In the app

- **R5.10** **Numbers** sits as a thirteenth entry in the key picker.
- **R5.11** Switching to Numbers and back to the original key returns the
  original page exactly. Notation is a view, never a mutation.
- **R5.12** In Numbers view the header reads `Numbers · 1 = D`, so you can see
  what to count from without leaving the chart.

**Numbers do not move with the key — and that is the point.** Because numbers are
invariant (§5.1), changing Key or Capo in Numbers view leaves the chart alone.

Raised as a possible confusion and **closed by Matt, 2026-09-05**: anyone reading
numbers understands that not moving is the whole reason the system exists, and a
player displaying numbers on stage is transposing in their head on the fly. That
is a legitimate use even though it is not how Matt expects to use it himself.

- **R5.13** The Key and Capo controls stay live in Numbers view. They set what
  you land in when you leave it, and the `1 = D` readout of R5.12 is what shows
  the change took.

---

## 6. Format changes

`docs/lcf-format.md` is the format definition and updates in the same pass.

### 6.1 Header

- **R6.1** `Key:` gains a defined default of **C** when absent. Today it is
  simply undefined and displayed only if present.
- **R6.2** `Key:` values are parsed rather than kept as free text: root, optional
  accidental, optional minor marker (`m`, `min`, `minor`).
- **R6.3** `Key: N` — also spelled `Numbers` or `Nashville`, matched without
  case — declares a chart written in degrees.
- **R6.4** *(proposed, see open question 7)* `Notation: numbers` alongside a
  normal `Key: D`, meaning "written in numbers, and 1 is D". Strictly more useful
  than `Key: N` alone, because such a chart then has a sounding key, a working
  capo, and a defined conversion to letters. `Key: N` stays valid and means
  numbers with no tonic declared.

### 6.2 Degree tokens

A degree token mirrors the chord grammar with the accidental moved to the front:

```
^(#|b)?([1-7])([^/\s]*)(?:\/(#|b)?([1-7]))?$
```

Against the existing chord grammar:

```
^([A-G])(#|b)?([^/\s]*)(?:\/([A-G])(#|b)?)?$
```

- **R6.5** The two grammars cannot collide. A token starts with `A`–`G`, or with
  `1`–`7` or an accidental followed by a digit. Nothing satisfies both.
- **R6.6** `b` before a digit is a flat; `B` is a note. Case decides, and the
  format is already case-sensitive inside bars.
- **R6.7** `%`, `R` and `N.C.` are unaffected in either notation.

**Compatibility note.** Today `|4 |` renders as a dimmed literal. Under the new
grammar it would parse as a degree. The risk is negligible — nobody types a bare
digit in a bar meaning text — but it is a silent change to an existing chart's
rendering, so it is called out rather than slipped in. See open question 4.

---

## 7. Architecture

The token model already does most of the work. `ChordToken` separates
`root` / `accidental` / `quality` / `bass` / `bassAccidental`, so transposition
touches four fields and never parses a chord name twice. **No parser change is
needed for letter transposition at all** — only for degrees.

### 7.1 New module

`src/music/` — pure, no React, fully unit-testable:

| Function | Does |
|---|---|
| `parseKey(raw)` | `"Bbm"` → `{ pc: 10, minor: true }`, or null |
| `keyName(pc, minor)` | Pitch class → display name, sharps per §2 |
| `pitchOf(root, accidental)` | Letter + accidental → 0–11 |
| `transposeToken(token, delta)` | Letter token → letter token |
| `toDegrees(token, tonicPc)` | Letter → degree |
| `toLetters(token, tonicPc)` | Degree → letter |
| `viewSong(song, view)` | The whole song under `{ key, capo, notation }` |

`view` is derived from the precedence chain in §3 and is the only thing the
render tree sees. `ChartView` receives an already-resolved `Song`, so `BarCell`
changes only to place a degree's accidental before its number.

### 7.2 Wiring

`App.tsx` already does `useMemo(() => parseLcf(current.text), [current?.text])`.
A second memo resolves the view. One extra derivation, no new data flow.

### 7.3 The structural change: setlist entries

This is the largest and least interesting piece of work.

```ts
// today
songs: string[]
// proposed
songs: SetEntry[]        // { id: string; key?: string; capo?: number }
```

Touches `setlists.ts` (`addToSetlist`, `removeAt`, `moveBy`, `stepPosition`,
`firstPlayable`), `SetlistsView.tsx`, `App.tsx`, `backup.ts`, and the shape
already sitting in IndexedDB on Matt's iPad.

- **R7.1** Setlists are **normalised on read**, not migrated by a script. A
  stored `string[]` becomes `[{ id }]` as it is loaded. A migration that runs
  once and can fail halfway is the wrong risk to take with a running order.
- **R7.2** `BACKUP_VERSION` goes to **3**. Version 2 bundles restore, their
  string entries normalised on the way in — the same tolerance version 2 already
  shows version 1 over its missing `setlists`.
- **R7.3** `mergeSetlists` is unaffected; it works on `id` and `updatedAt` only.

### 7.4 Layout — checked, and nearly a non-issue

`MIN_BAR_EM = 4` was measured against `Bbmaj9#11` at 3.83em. Sharp names are the
same two characters as flat names, and degrees are shorter than both, so the
worst case barely moves. The one case that widens is a **natural root becoming
sharp** — `Gmaj9#11` → `G#maj9#11`, one character past the measured worst case.

- **R7.4** Re-measure the floor against `G#maj9#11` and `F#m7b5/C#`. Expect a
  small bump to `MIN_BAR_EM` or nothing at all. Not a redesign.

---

## 8. What this version does not do

Named so they are decisions rather than omissions:

- **No writing back to the `.lcf`.** The file stays the song of record. Export is
  unchanged and always writes the original. *(Export-transposed is a plausible
  follow-on.)*
- **No capo calculator** — nothing suggests "capo 3 puts you in easy shapes".
- **No hands-free transposition.** No pedal binding, no tap zone. Changing key is
  a deliberate stop.
- **No flats**, beyond what a file already contains.
- **No per-song sticky key** outside a setlist. Matt's call: toolbar changes are
  temporary, exactly like Lyrics.
- **No chord diagrams, no instrument transposition** (Bb/Eb horns), **no audio**.

---

## 9. Open questions

Ordered by how much rework the answer costs.

1. **Key labels on black notes.** Chords will read `D#`. Should the *key* read
   `D#` too, or `Eb`, which is what a key is conventionally called?
   *Recommendation: the picker shows both (`D♯/E♭`) so it is unambiguous; the
   header shows the sharp, so the label matches the chords underneath it.*

2. **Does a bare number imply its diatonic quality?** *(Decide first — it sets
   the token model, and questions 3 and 7 hang off it.)* §5.4 lays out both
   readings and recommends the hybrid: **implied on the way in** (standard
   Nashville, so `6` in C is Am), **explicit on the way out** (the app writes
   `6m`, never a bare `6`). Two sub-questions follow if implied wins:

   - **Minor keys.** Natural minor makes `5` minor, but minor-key songs use a
     major V constantly. Does a bare `5` in a minor key expand to major — the
     practical reading — or minor, the theoretical one? *Recommendation: major,
     because that is what the player meant, and a silent minor V is the worse
     failure.*
   - **`7`.** Diatonically a diminished triad, and almost never what is played.
     *Recommendation: expand as a plain major and let the file mark `7dim`
     explicitly, rather than handing back a chord nobody asked for.*

3. **Minor-key numbering.** Confirm `Am → 1m` (tonic-relative, §5.3) rather than
   `Am → 6m` (relative-major). Both are in use. One constant either way — but if
   question 2 lands on implied, this also decides which scale the expansion
   table is built from.

4. **A bare `1`–`7` in a letter chart** — a degree, or a dimmed literal as today?
   *Recommendation: a degree, for one grammar rather than two, accepting the
   silent change to any chart that has a bare digit in a bar.*

5. **Seeing the key after the header scrolls away.** The chart header carries the
   key, but section headers are what stay sticky. Mid-song, is "what key am I
   in?" answerable? *Recommendation: only when `delta ≠ 0`, ride a small key
   marker in the sticky header. Nothing at all when untransposed — a chart in its
   own key needs no label.*

6. **"Save this to the setlist"** from the chart's key panel, when the song is
   playing from a set — or keep the two places strictly separate as Matt
   described them?

7. **`Notation: numbers` alongside a real key** (R6.4), so a number chart has a
   tonic, a working capo, and a defined conversion to letters. **Question 2
   raises the stakes on this one:** if a bare number expands diatonically, a
   `Key: N` chart with no tonic cannot be converted to letters at all.

---

## 10. Build order

Sized to be independently testable and independently shippable. Each phase ends
green with `tsc --noEmit` and the full suite.

| Phase | Work | Why here |
|---|---|---|
| **6a** | `src/music/`, pure. Key parsing, pitch maths, letter transposition, degree conversion both ways. Tests only, no UI | The whole feature's correctness lives here and needs no React to prove |
| **6b** | Key/Capo in the app: the panel, the toolbar button, the header readout, precedence over the file's values | Usable on its own — Matt can transpose a chart before the setlist plumbing exists |
| **6c** | Nashville: grammar, `Key: N`, both conversions, a `Numbers Test.lcf` fixture, `docs/lcf-format.md` | Settles the token model before the setlist work is built on top of it |
| **6d** | Setlist entries: `SetEntry`, read-time normalisation, backup v3, the touched call sites | Mechanical, riskiest to storage, and nothing else depends on it |
| **6e** | Guide (`lcf-format.md`, `using.md`), deploy, iPad with the pedal | The standing rule, and the only test that counts |

6c and 6d are swappable if pinned keys turn out to matter more than numbers.

---

## 11. Test plan

The feature is unusually testable — it is pitch arithmetic behind a pure
function. Rough shape, ~40 new tests:

**Correctness**

- `delta = 0` reproduces every source token verbatim, over `Format Test` and a
  generated chart covering all twelve roots. *(R1.2 — write this one first.)*
- Transpose by `n` then `−n` returns the original pitches.
- All 12 keys × 12 capos over `Format Test`: no throw, every root valid.
- Qualities, including `maj9#11`, survive untouched (R1.4).
- `R`, `N.C.`, `%` and literals are never altered (R1.3).
- Slash basses move with their roots (R1.5).

**Spelling**

- Every generated black note is the sharp (R2.1).
- A file's own `Bb` survives at delta 0 (R2.2).

**Numbers**

- Letters → numbers → letters, same key, is identity in pitch.
- The full chromatic degree table (R5.2).
- `Key: E` + `Capo: 2` numbers against **D**, not E — the §5.1 correction, and
  the test that would have caught it.
- Minor tonic numbering (R5.4).
- Degree grammar: `b7`, `#4`, `1/3`, `1/b3`, `2m7`; and that `B` is still a note.

**Storage**

- A version 2 backup restores with entries normalised (R7.2).
- A stored `string[]` setlist reads back as entries (R7.1).
- Reorder, remove and add all preserve each entry's pinned key.

---

## 12. Traps

- **The §5.1 capo/tonic error** is the one real bug hiding in this feature. It is
  invisible on any song without a capo, and every fixture in the repo has
  `Capo: 0`. `That Funny Feeling` — capo 2 — is the chart that catches it, and it
  is gitignored, so **write the test with a synthetic capo fixture** rather than
  relying on the one file that would have shown it.
- **Setlists on the iPad are real data.** Matt has running orders stored. The
  normalise-on-read rule (R7.1) exists so a shape change cannot eat them.
- **The delta-0 invariant is load-bearing.** Every enharmonic argument in §2 is
  survivable *because* an untouched chart is never rewritten. If that test ever
  goes red, stop.
- **Force-quit and relaunch after deploying.** There is deliberately no
  `skipWaiting`; a resumed app is the old build. This has already cost one
  session.
- **A service worker or guide change is only tested against the built site**, via
  `livechart-built` in `.claude/launch.json`.
- **Do not print chart content into docs or commits.** The published-content
  policy covers this file too — §1.4 names chords and a key, and no lyrics.

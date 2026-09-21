# LiveChart v2, Part 1 — Transposition

**Status:** **6a–6e built and deployed 2026-09-21.** Waiting on the iPad run.
§9 items 1 and 4 are closed — see below. How each requirement was read during the build is in `STATUS.md`,
*Transposition — calls made during the build*.
First written 2026-09-05, rewritten 2026-09-20 as Part 1 of two.

This is the letter-chord half of what began as one "transposition" feature. The
numbering half — Roman numerals, contributed by Lance Ruby — is **Part 2**, in
`NUMERALS-PLAN.md`. It was split off on 2026-09-20 because it adds a grammar, a
token kind and a set of theory rules that transposition does not need, and
because it is waiting on one answer this part is not. **Part 1 depends on
nothing in Part 2.** Part 2 depends on two things built here: the spelled-note
core (§7) and the key picker (§4).

This is a working document, not player-facing. The player-facing half lands in
`docs/lcf-format.md` and `docs/using.md` when the code does, per the standing
rule that a format change updates the guide in the same pass.

### Settled

Every decision below is Matt's, and none is to be reopened without him.

| Date | Decision |
|---|---|
| 2026-09-05 | **The chart draws `Key − Capo`.** `Key:` is the sounding key, `Capo:` the fret; the chords in a file are written in `Key − Capo` (§1) |
| 2026-09-05 | **Key and Capo are adjustable in two places**: temporarily from the toolbar, and pinned on a setlist entry (§3) |
| 2026-09-20 | **Keys take flats, except F♯ and C♯.** `C C♯ D E♭ E F F♯ G A♭ A B♭ B`. The picker also offers G♭ and D♭. A key the app derives through a capo uses F♯ and C♯ (§2) |
| 2026-09-20 | **Chords follow the key's signature.** In B♭ the IV is E♭; in E the iii is G♯m (§2) |
| 2026-09-20 | **Minor keys:** `Cm C♯m Dm E♭m Em Fm F♯m Gm G♯m Am B♭m Bm` (§2) |
| 2026-09-20 | **C♭, F♭, E♯ and B♯ display as B, E, F and C.** Correct on paper, unwanted on a gig (§2) |
| 2026-09-20 | **The chord-quality grammar is tightened** to real chord vocabulary. Anything else is a literal and never transposes. A chart that needs an explanation says so in a comment (§6) |

---

## Contents

- [1. The model](#1-the-model)
- [2. Spelling](#2-spelling)
- [3. Where the values come from](#3-where-the-values-come-from)
- [4. Controls](#4-controls)
- [5. Setlist entries](#5-setlist-entries)
- [6. Format changes](#6-format-changes)
- [7. Architecture](#7-architecture)
- [8. What Part 1 does not do](#8-what-part-1-does-not-do)
- [9. Open items](#9-open-items)
- [10. Build order](#10-build-order)
- [11. Test plan](#11-test-plan)
- [12. Traps](#12-traps)

---

## 1. The model

### 1.1 The one sentence

**The chart draws the shapes your hands make.** `Key` is what the song sounds
like, `Capo` is where the capo sits, and the chart is drawn in `Key − Capo`.

### 1.2 Terms

| Term | Meaning |
|---|---|
| `fileKey` | The `Key:` attribute. **Defaults to C** when the file says nothing |
| `fileCapo` | The `Capo:` attribute. Defaults to 0 |
| `writtenKey` | The key the chords are literally typed in = `fileKey − fileCapo` |
| `appKey` | The sounding key now in force. Starts at `fileKey` |
| `appCapo` | The capo position now in force. Starts at `fileCapo` |
| `shapeKey` | What gets drawn = `appKey − appCapo` |
| interval | How far every chord moves: from `writtenKey` to `shapeKey`, **as a spelled interval** — see §2.2 |

### 1.3 The invariant that matters most

At `appKey = fileKey` and `appCapo = fileCapo` the interval is a perfect unison —
and **a chart at unison renders exactly as its file was written**, original
spelling and all, C♭ included. Opening a song you have not touched can never
show you anything different from the file. This is a hard requirement and the
first test to write.

### 1.4 Validated against a real chart

`That Funny Feeling` carries `Key: E` and `Capo: 2nd fret`, and its chord lines
are written `D/A`, `G`, `Em`, `A`, `Bm` — D-shapes. `E − 2 = D`. The convention
already in the library matches the rule exactly, so no existing chart needs
editing. *(Quoting a handful of chord symbols is fine under the published-content
policy — Matt's call, 2026-09-05, recorded in `STATUS.md`.)*

### 1.5 Worked examples

Using that file: `fileKey` E, `fileCapo` 2, `writtenKey` D.

| appKey | appCapo | shapeKey | `D/A` | `G` | `Em` | What it shows |
|---|---|---|---|---|---|---|
| E | 2 | D | `D/A` | `G` | `Em` | Untouched — the file as written |
| E | 0 | E | `E/B` | `A` | `F#m` | Same sounding key, capo off, harder shapes |
| D | 0 | D | `D/A` | `G` | `Em` | Same shapes, sounding a tone lower |
| G | 5 | D | `D/A` | `G` | `Em` | Same shapes, capo up to sound in G |
| F | 2 | **E♭** | `Eb/Bb` | `Ab` | `Fm` | A capo-derived key on a black note — flat, per the table |
| B♭ | 0 | B♭ | `Bb/F` | `Eb` | `Cm` | Chords follow a flat key: E♭, not D♯ |
| F♯ | 0 | F♯ | `F#/C#` | `B` | `G#m` | Chords follow a sharp key: G♯m, not A♭m |
| G♭ | 0 | G♭ | `Gb/Db` | **`B`** | `Abm` | The IV of G♭ is C♭ on paper, displayed as B |

Rows 1, 3 and 4: three sounding keys, one identical page. `Capo` and `Key` move
the chart in opposite directions and cancel. Rows 7 and 8: the same pitches,
spelled two ways, because the key you picked says which.

### 1.6 Requirements

- **R1.1** Every chord token is displayed moved by the interval.
- **R1.2** At unison the source text renders verbatim.
- **R1.3** Only `chord` tokens move. `R`, `N.C.`, `%` and literals are untouched.
  §6's grammar is what guarantees a word like `Drums` is a literal.
- **R1.4** A chord's quality is carried verbatim. `Bbmaj9#11` up a tone is
  `Cmaj9#11`; the `#11` is part of the quality, not a pitch.
- **R1.5** Slash bass notes move by the same interval as the root.
- **R1.6** `appCapo` ranges 0–11.
- **R1.7** An unparseable `Key:` value is a warning, not an error. The song still
  renders, treated as C. Never fail a chart on stage over a header line.
- **R1.8** Mode rides along with the key and is never chosen by the transposer.
  A song in `Bbm` moved up a tone is in `Cm`.

---

## 2. Spelling

### 2.1 Key names

The name a key gets, whenever the app has to name one:

| Pitch | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Major** | C | **C♯** | D | E♭ | E | F | **F♯** | G | A♭ | A | B♭ | B |
| **Minor** | Cm | C♯m | Dm | E♭m | Em | Fm | F♯m | Gm | G♯m | Am | B♭m | Bm |

The minor row is not the major row with an `m` on it. Four entries differ,
each to the name with fewer accidentals: **C♯m** not D♭m, **G♯m** not A♭m,
**B♭m** not A♯m, and **E♭m** — where D♯m is equally heavy — to match E♭ major.

- **R2.1** The picker offers these, **plus G♭ and D♭** for major songs. Those two
  are real, commonly used keys with a real alternative spelling, so the choice is
  the player's. A minor song gets the twelve minor names.
- **R2.2** A key **you pick** keeps the spelling you picked. G♭ stays G♭.
- **R2.3** A key **the app derives** — a shape key worked out through a capo, or
  a written key worked out from `Key:` and `Capo:` — takes its name from the
  table. So the capo-derived F♯ and C♯ of Matt's rule are simply what the table
  says.
- **R2.4** *Exception to R2.3:* a written key derived through a capo, landing on
  C♯/D♭, F♯/G♭ or E♭m/D♯m, is **spelled the way the file's own chords are**
  (flats outnumbering sharps means the flat name). Otherwise the interval in
  §2.2 is measured from the wrong starting letter. Rare — it needs a capo'd
  chart written in G♭ or D♭ shapes — but the fallback in R2.7 is what catches it
  if it is ever wrong.

### 2.2 Chords follow the key

**Transposition moves notes by a spelled interval, not by a count of semitones.**
Going from G to B♭ is "up a minor third" — two letters, three semitones — so
every note moves up two letters and three semitones: C → E♭, F♯ → A, D → F.
The spelling of the target key carries through to every chord in it, with no
lookup table and no special cases.

- **R2.5** Every root and bass note moves by the interval from `writtenKey` to
  `shapeKey`, letter and pitch both.
- **R2.6** Choosing the other spelling of the same key — G♭ on a chart written in
  F♯ — is a diminished second, which respells every chord: F♯ → G♭, C♯ → D♭,
  B → C♭ → B (R2.8). It falls out of R2.5; nothing extra is written for it.

### 2.3 Names nobody wants to read

- **R2.7** A double sharp or double flat — which spelled intervals can produce on
  chromatic chords in distant keys — collapses to the single-accidental name on
  the key's side: sharps in a sharp key, flats in a flat key, the table's choice
  in C and Am.
- **R2.8** **C♭, F♭, E♯ and B♯ display as B, E, F and C.** They turn up on
  ordinary diatonic chords — the IV of G♭, the ♭VI of E♭m, the vii of F♯, the
  vii of C♯ — so this is not a corner case.
- **R2.9** R2.7 and R2.8 apply only to notes the app generated. At unison, R1.2
  wins: a file that writes C♭ shows C♭.

---

## 3. Where the values come from

The shape of the existing `Lyrics:` precedence, which is proven and understood.

**Applied to Key and Capo independently:**

1. **Toolbar override** — set while this song is up. Wins everything. Cleared
   when the song changes, exactly like `lyricsOverride`.
2. **Setlist entry** — if a set is playing and this position's entry pins a value.
3. **The file** — `Key:` and `Capo:`, defaulting to C and 0.

- **R3.1** Changing key or capo from the toolbar is temporary. Reopening the song
  returns to the setlist value, or the file's.
- **R3.2** A setlist entry may pin a key and a capo. Each time that song is
  reached from that set, those values are in force.
- **R3.3** Entries are per **position**, not per song id. The same song twice in
  one night can sit in two keys — which the existing "position, never song id"
  decision was already built for.
- **R3.4** Off the set (position −1) the file's values apply.
- **R3.5** Key and capo override independently. Nudging the key from the toolbar
  leaves a capo pinned by the setlist alone.

---

## 4. Controls

### 4.1 On the chart

The toolbar already carries nine controls and is the tightest space in the app.

- **R4.1** One **Key** button in the toolbar, reading the current state
  compactly — `E`, or `E·2` when a capo is set.
- **R4.2** It opens a panel over the chart, in the manner of the Pedal screen: a
  grid of keys per §2.1, a capo stepper (− / value / +), and **Reset to file**.
- **R4.3** The panel is a deliberate stop, not a mid-song action. It holds the
  chrome open while it is up, as `PedalLearn` does.
- **R4.4** The key and capo in the chart header are a second way into the panel.
- **R4.5** The chart header shows the values in force — `Key A · Capo 2` — plus
  the shape key when the capo is not 0: `· G shapes`.
- **R4.6** When the chart is not at unison it is **visibly marked as
  transposed**. A chart that has moved and looks ordinary is the worst possible
  failure on stage.
- **R4.7** The picker is built to take a thirteenth entry. Part 2 adds
  **Numerals** there.

### 4.2 On a setlist

- **R4.8** Each row in a setlist can pin a key and a capo, from the same panel,
  without opening the chart.
- **R4.9** A row shows its pinned values when it has them and nothing when it
  does not. A set that has never been transposed must not grow a column of noise.

---

## 5. Setlist entries

The largest and least interesting piece of work.

```ts
// today
songs: string[]
// proposed
songs: SetEntry[]      // { id: string; key?: string; capo?: number }
```

`key` holds the spelled root only (`"Gb"`, `"Eb"`). Mode comes from the file, so
pinning a key on a minor song never has to know it is minor.

Touches `setlists.ts` (`addToSetlist`, `removeAt`, `moveBy`, `stepPosition`,
`firstPlayable`), `SetlistsView.tsx`, `App.tsx`, `backup.ts`, and the shape
already sitting in IndexedDB on Matt's iPad.

- **R5.1** Setlists are **normalised on read**, not migrated. A stored `string[]`
  becomes `[{ id }]` as it loads. A migration that runs once and can fail halfway
  is the wrong risk to take with a running order.
- **R5.2** `BACKUP_VERSION` goes to **3**. Version 2 bundles restore with their
  entries normalised on the way in, just as version 2 already tolerates version
  1's missing `setlists`.
- **R5.3** `mergeSetlists` is unaffected; it works on `id` and `updatedAt`.
- **R5.4** Reordering, removing and adding keep each entry's pinned values with
  the entry — they move as one.

---

## 6. Format changes

`docs/lcf-format.md` is the format definition and changes in the same pass.

### 6.1 The header

- **R6.1** `Key:` defaults to **C** when absent. Today it is undefined, and shown
  only when present.
- **R6.2** `Key:` is parsed rather than kept as free text: a root `A`–`G`, an
  optional `#` or `b`, and an optional minor marker (`m`, `min`, `minor`, or
  `-`). Anything else is R1.7's warning.

### 6.2 A tighter chord grammar

**The problem.** The chord grammar accepts *anything* after the root as the
quality, so a capitalised word in a bar is read as a chord today: `Drums` is D
with quality "rums", and so are `Fill`, `Break`, `Bass`, `Fade`, `Ending`. It is
harmless now because it renders as typed. **Transposition would make it wrong**
— up a tone, `Drums` becomes `Erums` — and Part 2's numerals would make it worse,
since `vamp` and `intro` begin with a numeral.

**The rule.** A quality must be made **entirely** of recognised pieces, in any
order. Case matters, as it already does in a bar.

| Kind | Pieces |
|---|---|
| Minor | `m` `min` `-` |
| Major | `maj` `Maj` `M` `Δ` |
| Diminished, half-diminished, augmented | `dim` `°` `o` `ø` `aug` `+` |
| Suspended, added, altered | `sus` `sus2` `sus4` `add` `alt` |
| Numbers | `2` `4` `5` `6` `7` `9` `11` `13`, each optionally preceded by `b` `#` `+` `-` |
| Grouping | parentheses around any of the above, with commas inside |

| Accepted | Rejected — now literals |
|---|---|
| `Dm7b5` `Bbmaj9#11` `C7sus4` `Cadd9` `C5` `CmMaj7` `Cm(maj7)` `C7(b9,#11)` `C°7` `Cø7` `C+` `C7alt` `C69` | `Drums` `Fill` `Break` `Bass` `Fade` `Ending` `All` `Cue` |

- **R6.3** A token whose quality does not parse is a **literal**: shown dimmed,
  as written, and never transposed. Nothing still breaks the chart.
- **R6.4** `C6/9` remains a literal, as it is today — the `/` means a bass note.
  Write `C69` or `C6add9`.
- **R6.5** The docs tell a player who wants a word in a bar to write it in lower
  case (`stop`, `fill`, `tacet` — the guide's examples already are), or to use a
  comment.

**Checked against the charts on this machine, 2026-09-20:** every chord token
in `Format Test`, `Kokomo`, `Let It Be` and `That Funny Feeling` still parses,
and the only word — `stop` — was already a literal. **Nothing changes.** Matt's
iPad library is larger, so step 6a includes checking it (§10).

---

## 7. Architecture

The token model already does most of the work. `ChordToken` separates `root`,
`accidental`, `quality`, `bass` and `bassAccidental`, so moving a chord touches
four fields and never re-parses a name.

### 7.1 A new module: `src/music/`

Pure, no React, fully unit-testable. **Notes are spelled** — a letter and an
accidental — never bare semitone numbers, because §2 cannot be done otherwise.

| Function | Does |
|---|---|
| `parseKey(raw)` | `"Bbm"` → `{ letter: 'B', alter: -1, minor: true }`, or null |
| `keyName(pitch, minor)` | The §2.1 table, for keys the app has to name |
| `interval(from, to)` | Two spelled notes → `{ letters, semitones }` |
| `moveNote(note, interval, key)` | Applies an interval, then R2.7 and R2.8 |
| `transposeToken(token, interval, key)` | A chord token, root and bass |
| `viewSong(song, view)` | The whole song under `{ key, capo }` |

This is also the core Part 2 builds on: numerals convert to and from letters
through the same spelled notes and intervals.

### 7.2 Wiring

`App.tsx` already does `useMemo(() => parseLcf(current.text), [current?.text])`.
A second memo resolves the view from §3's precedence. `ChartView` receives an
already-transposed `Song` and does not know transposition exists.

### 7.3 Layout

`MIN_BAR_EM = 4` was measured against `Bbmaj9#11` at 3.83em. A natural root that
becomes a sharp or flat gains a character — `Gmaj9#11` → `G#maj9#11` — which is
past the measured worst case.

- **R7.1** Re-measure the floor against `G#maj9#11` and `F#m7b5/C#`. Expect a
  small bump to `MIN_BAR_EM`, or nothing.

---

## 8. What Part 1 does not do

Named so they are decisions rather than omissions:

- **Numerals.** Part 2, `NUMERALS-PLAN.md`.
- **No writing back to the `.lcf`.** The file stays the song of record; export
  always writes the original. *(Export-transposed is a plausible follow-on.)*
- **No capo calculator** suggesting where the capo gives easy shapes.
- **No hands-free transposition** — no pedal binding, no tap zone.
- **No sticky per-song key** outside a setlist. Toolbar changes are temporary,
  exactly like Lyrics.
- **No change to how chord qualities display.** `Cdim` still reads `Cdim`. The
  symbol rendering Matt settled for numerals (`°`, `ø`) is Part 2's.
- **No chord diagrams, no instrument transposition, no audio.**

---

## 9. Open items

None blocks starting. Each has a default that holds unless Matt says otherwise.

1. **Closed 2026-09-21, Matt: no key in the section headers.** Built first as
   the default below, and it was noise, repeated on every section. The amber Key
   button and the header next to the title are the marking. It may return with
   mid-song key changes, showing the *new* key where it changes.
   *Original item:* **Showing the key after the header scrolls away.** The chart header scrolls;
   section headers stick. *Default: when transposed, a small key marker rides in
   the sticky header. Nothing when untransposed — a chart in its own key needs
   no label.* Decide during 6c, on the iPad.
2. **"Save to setlist" from the chart's key panel**, when the song is playing
   from a set. *Default: not built. Matt described the two places as separate,
   and it is easy to add later.*
3. **D♯m in the minor picker**, alongside E♭m, by analogy with G♭ and D♭.
   *Default: no — E♭m only, per the 2026-09-20 decision.*
4. **The full library check** for §6.2. **Needs Matt:** export a backup bundle
   from the iPad to this machine before 6a ships, so every real chart can be run
   through the new grammar and any token that changes class reviewed together.
   **Closed 2026-09-21, Matt:** every iPad chart was built in `songs/local/`, so
   the five charts here are the library; nothing changes class. Anything else
   will surface in use. `node scripts/check-grammar.mjs` remains for later.

---

## 10. Build order

Each step ends green on `tsc --noEmit` and the full suite, and is shippable on
its own.

| Phase | Work | Why here |
|---|---|---|
| **6a** | **The tighter grammar** (§6.2). Parser, tests, `docs/lcf-format.md`, and the library check of §9 item 4 | Stands alone as a fix; must land before anything moves a chord, or `Drums` transposes |
| **6b** | **`src/music/`**, pure: keys, spelled notes, intervals, R2.7/R2.8, token transposition. Tests only, no UI | The feature's correctness lives here, and it needs no React to prove |
| **6c** | **Key and Capo in the app**: the panel, toolbar button, header readout, transposed marker, toolbar-over-file precedence | Usable on its own — a chart can be transposed before setlists know anything about it |
| **6d** | **Setlist entries**: `SetEntry`, normalise-on-read, backup v3, the panel on setlist rows | Mechanical, riskiest to stored data, and nothing else depends on it |
| **6e** | **Guide** (`lcf-format.md`, `using.md`), deploy, iPad with the pedal | The standing rule, and the only test that counts |

---

## 11. Test plan

Pitch arithmetic behind pure functions — unusually testable. Roughly 50 tests.

**The invariant**
- At unison, every source token renders verbatim — over `Format Test` and a
  generated chart covering all twelve roots in both spellings, and a file's own
  C♭. *(R1.2 — write this one first.)*

**The model**
- The §1.5 table, row for row.
- Up an interval then back down returns the original spelling, not just pitch.
- All 14 picker keys × 12 capos over `Format Test`: no throw, every note valid.
- Qualities, including `maj9#11`, untouched (R1.4). Slash basses move (R1.5).
- `R`, `N.C.`, `%` and literals never altered (R1.3).

**Spelling**
- G → B♭: `C` becomes `Eb`, `F#` becomes `A` (R2.5).
- The iii in E is `G#m`; the IV in B♭ is `Eb`.
- F♯ chart shown in G♭ respells every chord (R2.6).
- IV of G♭ and ♭VI of E♭m display `B` (R2.8); no double accidental ever appears
  (R2.7).
- A capo-derived shape key on pitch 6 is F♯, on pitch 1 C♯, on minor pitch 3 E♭m
  (R2.3).

**Grammar**
- Every entry in both columns of §6.2's table.
- `Drums` is a literal and does not move when the chart is transposed.
- `C6/9` stays a literal.

**Storage**
- A version 2 backup restores with entries normalised (R5.2).
- A stored `string[]` setlist reads back as entries (R5.1).
- Reorder, remove and add keep each entry's pinned values (R5.4).

---

## 12. Traps

- **The unison invariant is load-bearing.** Every spelling rule in §2 is safe
  *because* an untouched chart is never rewritten. If that test goes red, stop.
- **6a changes how existing charts render.** Checked here and harmless, but the
  iPad library has not been checked. Do not ship 6a before §9 item 4.
- **Setlists on the iPad are real data.** R5.1 exists so a shape change cannot
  eat a running order.
- **Semitone arithmetic is the tempting wrong shortcut.** It is simpler and gets
  every pitch right, and every flat key wrong. §2 needs letters.
- **Force-quit and relaunch after deploying.** There is deliberately no
  `skipWaiting`; a resumed app is the old build.
- **A service worker or guide change is only tested against the built site**, via
  `livechart-built` in `.claude/launch.json`.

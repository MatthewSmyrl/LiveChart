# LiveChart Format (LCF) — Specification v1.0

`.lcf` is a plain-text, human-editable format for bar-based chord charts intended
for live performance display.

**Design principle:** LCF charts *bars, not syllables.* Unlike ChordPro or Ultimate
Guitar tab, chords are not aligned above the exact syllable they fall on. A chord
line describes the harmonic rhythm of a phrase; the lyric lines beneath it are a
memory jog. This is deliberate — it is far more readable at stage distance and
assumes the performer already knows the tune.

Files are UTF-8. Line endings may be LF or CRLF. Trailing whitespace is ignored.

---

## 1. File structure

```
<header block>       -- attributes, ends at the first section header
<section>
<section>
...
```

---

## 2. Line types

Each line is classified by its first non-whitespace characters, in this order:

| Order | Line looks like | Type |
|---|---|---|
| 1 | empty / whitespace only | **Phrase break** |
| 2 | starts with `--` | **Comment** |
| 3 | starts with `[` | **Section header** |
| 4 | starts with `\|` | **Chord line** |
| 5 | `Name: value` *and still in the header block* | **Attribute** |
| 6 | anything else | **Lyric line** |

Because attributes are only recognised in the header block, a lyric containing a
colon is never mistaken for an attribute.

---

## 3. Header attributes

Form: `Name: value`, one per line, before the first `[Section]`.

| Attribute | Required | Notes |
|---|---|---|
| `Title` | yes | Display name |
| `Artist` | no | |
| `Key` | no | Sounding key, e.g. `E`, `Bbm` |
| `Capo` | no | Fret number. `2` or `2nd fret` both accepted; parsed to an integer |
| `Time` | no | Time signature, e.g. `4/4`, `3/4`, `6/8`. **Defaults to `4/4`** |
| `Tempo` | no | BPM, integer |
| `Notes` | no | Free text shown on the song info panel, not in the chart |
| `Lyrics` | no | Whether lyrics are shown when this song opens. See below |

Unrecognised attributes are preserved and shown in the song info panel. Attribute
names are matched case-insensitively.

### How `Lyrics` affects display

`Lyrics: off` opens the song with lyrics hidden; `Lyrics: on` opens it with them
shown. `on`/`off`, `yes`/`no`, `true`/`false`, `show`/`hide` and `1`/`0` are all
accepted, case-insensitively. An unrecognised value is a warning and the
attribute is ignored.

A song you know by heart wants the chords alone: fewer page turns, and more of
the chart on screen at once. That is a property of the song rather than a
setting you should have to remember at the top of it, which is why it lives in
the file.

**The tag applies every time the song opens**, overriding the app's saved
preference. The toolbar's Lyrics button still overrides the tag for as long as
that song is open — reopening the song brings the tag back. A song with no
`Lyrics` attribute opens with whatever the app was last set to.

### How `Time` affects display

The time signature is functional, not decorative:

- **Numerator → beat slots per bar.** A bar cell in `6/8` is wider than one in `3/4`.
- **Beat grouping.** `6/8` groups 3+3, `12/8` groups 3+3+3+3, `7/8` defaults to 4+3.
- **Bars per row.** The renderer snaps to musical multiples (4, then 2) so phrases
  don't wrap mid-figure.

---

## 4. Section headers

```
[Name]
[Name] x3
[Name] (softly)
[Name] x2 (build)   -- optional trailing comment
```

- `Name` — any text not containing `]`. Matched case-insensitively, whitespace-normalised.
- `xN` — adjacent repeat count, N ≥ 2. Renders **once with a large `×N` badge**,
  *not* expanded. This is deliberately different from a section reference (§4),
  which does expand inline: a reference points at material far away that you must
  not have to scroll back for, whereas `xN` is the same block back-to-back, where
  expansion would just cost extra screens and pedal presses.
- `(note)` — a performance direction, displayed next to the section name.

### Definition vs. reference

| Occurrence | Body | Meaning |
|---|---|---|
| First `[Name]` | has chord lines | **Definition** |
| Later `[Name]` | empty | **Full repeat** — chords *and* lyrics reused |
| Later `[Name]` | lyric lines only | **Same chords, new lyrics** |
| Later `[Name]` | has chord lines | **Variant** — renders standalone, does *not* overwrite the definition |

A reference appearing before its definition is a parse error, surfaced in the
import view (not a silent failure).

**References expand inline in the performance view.** You should never have to
scroll backwards mid-song. The expanded block still carries its section label.

### Auto-numbering

If a section name carries no trailing digit and occurs more than once, the display
appends an occurrence index — `Verse` → *Verse 1*, *Verse 2*, … If names already
carry numbers (`[Verse 1]`), they are respected as written and each is a distinct
section.

---

## 5. Chord lines

```
|D/A |% |G |D/A |% |
|Em  |A |Bm |G |% |  x2   -- repeat this line twice
|D  G|C   |                -- two chords in one bar
```

- Bars are delimited by `|`. Leading and trailing `|` are required.
- A bar contains zero or more whitespace-separated **chord tokens**.
- `xN` after the final `|` repeats the whole line N times.
- `--` after the final `|` starts a trailing comment.

### Tokens

| Token | Meaning |
|---|---|
| `%` | Repeat the previous bar. Valid only as the sole token in a bar. Rendered as the repeat glyph 𝄎, never as a literal `%` |
| `D`, `Am7`, `Bbmaj9#11` | Chord: root, optional accidental, optional quality/extension |
| `D/A` | Slash chord — `/` denotes a bass note **only** |
| `R` | **Rest.** See §5.1 |
| `N.C.` | No chord — harmony drops out but the song continues. Rendered as small caps `N.C.`, distinct from a rest |
| `stop`, anything else | Unrecognised tokens are kept as literal text and rendered dimmed. **An unrecognised token never fails the parse.** |

Recognised-chord pattern:
`^[A-G](#|b)?([^/\s]*)(/[A-G](#|b)?)?$`

### 5.1 Rests

`R` is the rest token. It is chosen because it is mnemonic, typeable, and cannot
collide with anything else in the grammar — chord roots are `A`–`G`, so `R` is
unambiguous, and it avoids the clashes that `-` (comment `--`), `x` (line repeat
`xN`), `%` (bar repeat) and `/` (bass note) would each cause.

**Duration needs no new syntax.** A rest occupies beat slots exactly the way a
chord does under the existing "multiple tokens share a bar" rule, so the renderer
infers which rest glyph to draw from how much of the bar the `R` covers:

| Source | In 4/4 | Rendered |
|---|---|---|
| `\|R \|` | whole bar | 𝄻 whole rest |
| `\|D  R\|` | 2 beats D, 2 beats rest | 𝄼 half rest |
| `\|D  G  R  R\|` | 1 beat each | 𝄽 quarter rests |

**Draw rests as inline SVG, not Unicode text.** The Unicode Musical Symbols block
(U+1D13B–U+1D13E) has unreliable font coverage on iOS and will fall back to tofu
on exactly the device this app targets. Inline SVG paths sized to the current font
scale are guaranteed to render, stay crisp at stage-reading sizes, and can be
weighted to match the chord type.

> **Reserved for v1.1:** `^` as a fermata/hold marker (𝄐), e.g. `|G^ |`.

> **Reserved for v1.1:** a bare `/` token as a beat-hold marker (`|D / / G|`).
> Not parsed in v1.0; it falls through to the literal-token rule.

---

## 6. Lyric lines

Any line not matching an earlier rule. Rendered verbatim. Can be hidden globally
via the lyrics toggle.

---

## 7. Comments

```
-- A whole-line comment.
|Em |A |     -- a trailing comment on a chord line
```

Comments are **only** recognised:
1. at the start of a line (after optional leading whitespace), or
2. after the closing `|` of a chord line.

> **Decided deviation from the original sketch:** `--` inside a lyric line is
> treated as *literal text*, not a comment. Otherwise a lyric like
> `"well--maybe not"` would be silently truncated mid-performance with no error.
> A line that genuinely needs to *start* with a literal `--` escapes it as `\--`.

Comments render in a distinct colour and can be toggled off with lyrics.

---

## 8. Phrase breaks

A blank line is **significant**: it marks a phrase break and renders as vertical
space. Consecutive blank lines collapse to one.

---

## 9. Grouping and lyric matching

Within a section, a chord line **governs** every lyric line following it until the
next chord line, phrase break, or end of section. That unit is a **group**.

For a lyric-only reference, group *N* of the reference maps to group *N* of the
definition. Groups in a lyric-only reference are separated by blank lines. If the
group counts differ, the parser emits a warning and fills sequentially rather than
failing.

Groups are also the **scroll snap boundaries** (see §10) — a chord line is never
separated from its lyrics by a page turn.

---

## 10. Performance navigation (app behaviour, not file format)

Recorded here because it constrains the parser's output shape.

- The chart is one continuously scrollable column.
- **Advance** scrolls forward by a configurable fraction of the viewport:
  **50% / 75% / 100%**. Smaller steps keep the phrase you're finishing on screen
  and preview what's next; 100% maximises real estate but is more jarring.
- After computing the target scroll position, snap to the nearest **group**
  boundary within ±15% of the viewport height, so chords never orphan from lyrics.
- **Inputs**, all mapped to the same advance/retreat actions:
  - Bluetooth pedal keystrokes. Defaults: `ArrowDown` / `ArrowRight` / `PageDown` /
    `Space` advance; `ArrowUp` / `ArrowLeft` / `PageUp` retreat.
  - A **"Learn pedal"** capture screen storing raw `event.code`, because pedal
    models (AirTurn, iRig BlueTurn, PageFlip, Coda) send different codes in
    different modes.
  - Tap zones: right/lower half advances, left/upper half retreats.
- Key auto-repeat (`event.repeat`) is ignored so holding the pedal doesn't fly.
- Smooth scroll ~250 ms, disabled under `prefers-reduced-motion`.
- Advancing past the end of a song requires a **second press** before moving to the
  next song in the setlist.

---

## 11. Worked example

See `songs/Format Test.lcf`, which exercises rests, `N.C.`, 6/8 grouping, wide
chord names, two chords in a bar, and section references.

The fuller worked example is a real chart under copyright, so it is not in this
repository — it lives in gitignored `songs/local/`. See the *Songs* section of
`STATUS.md`.

---

## 12. Open items for v1.1+

- Beat-hold `/` token
- Transpose (needs the chord token parsed into root + quality + bass — v1.0's
  token model already supports this)
- Per-section attribute overrides (mid-song tempo or time-signature changes)
- PDF/OCR import

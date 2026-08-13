[← Guide contents](README.md)

# The `.lcf` format

**LiveChart Format v1.0.** This is both the guide to writing charts and the
definition the parser is written against — there is deliberately only one
document, so it can't drift out of step with the app.

A `.lcf` file is plain text. Any editor will do — Notepad, TextEdit in
plain-text mode, VS Code, Notes on an iPad if you must. Save it as UTF-8 with a
`.lcf` extension and import it.

The whole format is designed to be typed by hand, quickly, while you're working
a chart out. Nothing here needs a tool.

---

## Contents

- [The shortest useful chart](#the-shortest-useful-chart)
- [File basics](#file-basics)
- [How a line is read](#how-a-line-is-read)
- [The header](#the-header)
- [Sections](#sections)
- [Chord lines](#chord-lines)
- [Chord tokens](#chord-tokens)
- [Lyrics](#lyrics)
- [Comments](#comments)
- [Blank lines and grouping](#blank-lines-and-grouping)
- [Repeating material](#repeating-material)
- [When something is wrong](#when-something-is-wrong)
- [A worked example](#a-worked-example)
- [Quick reference](#quick-reference)
- [Appendix: how the app treats these files](#appendix-how-the-app-treats-these-files)

---

## The shortest useful chart

```
Title: Twelve Bar

[Verse]
|A |% |% |% |
|D |% |A |% |
|E |D |A |E |
```

That's a valid chart. `Title` is the only thing required.

The overall shape is a header block, then one or more sections:

```
<header>        attributes, ending at the first section
<section>
<section>
...
```

## File basics

- **UTF-8.** Accented characters and typographic apostrophes are fine.
- **Either line ending** — LF or CRLF. Files written on Windows, Mac or an iPad
  all work.
- **Trailing whitespace is ignored**, so nothing depends on invisible characters
  at the end of a line.
- **Leading whitespace is allowed.** Indent your chord lines if you find it
  readable; it has no effect on the display.

---

## How a line is read

Every line is classified by what it starts with, in this order. The order is
what matters — the first rule that matches wins.

| | A line that… | is a |
|---|---|---|
| 1 | is empty or only whitespace | **phrase break** |
| 2 | starts with `--` | **comment** |
| 3 | starts with `[` | **section header** |
| 4 | starts with `\|` | **chord line** |
| 5 | looks like `Name: value`, *and is still in the header* | **attribute** |
| 6 | is anything else | **lyric** |

Two consequences worth knowing, because both exist to stop a specific thing
going wrong on stage:

- Attributes are only recognised **in the header block**, so a lyric containing
  a colon is never mistaken for one.
- `--` is only a comment at the **start** of a line (rule 2 beats rule 6), never
  in the middle of a lyric. See [Comments](#comments).

---

## The header

Attributes go at the top, one per line, as `Name: value`, before the first
section.

| Attribute | Required | Notes |
|---|---|---|
| `Title` | **yes** | The name the song is filed and displayed under |
| `Artist` | no | Shown under the title |
| `Key` | no | The sounding key — `E`, `Bbm` |
| `Capo` | no | Fret number. `2` and `2nd fret` both work; read as a whole number |
| `Time` | no | `4/4`, `3/4`, `6/8`, `7/8`… Defaults to `4/4`. Affects layout — see below |
| `Tempo` | no | BPM, a whole number |
| `Lyrics` | no | Whether this song opens with lyrics shown. See below |
| `Notes` | no | Free text for yourself |

Names are matched without regard to case, so `title:` and `TITLE:` both work.

`Notes`, and any attribute the app doesn't recognise, are **kept with the file
but not displayed anywhere today**. They survive a round trip through import,
backup and export, so they're a safe place to leave yourself a reminder — you
just won't see it on the chart.

The chart header displays the title, and then whichever of artist, key, capo,
time signature and tempo the file supplies.

### `Lyrics`

```
Lyrics: off
```

Opens this song with the lyrics hidden; `Lyrics: on` opens it with them shown.
`on`/`off`, `yes`/`no`, `true`/`false`, `show`/`hide` and `1`/`0` all work, in
any case. Anything else is a warning and the line is ignored rather than guessed
at.

**This wins every time the song opens**, over whatever the toolbar button was
last set to. The button still overrides it while that song is up; reopen the
song and the file's setting comes back. A song with no `Lyrics:` line follows
the button.

Whether you need the words is a property of the song, not something you should
have to remember at the top of it — and a song you know cold wants the chords
alone, for fewer page turns and more chart on screen.

### `Time`

The time signature is functional, not decoration:

- The top number sets how many beat slots a bar has, so a `6/8` bar is wider
  than a `3/4` one.
- Beats group musically — `6/8` as 3+3, `12/8` as 3+3+3+3, `7/8` as 4+3.
- Bars per row snap to musical multiples (4, then 2), so a phrase doesn't wrap
  in the middle of a figure.

---

## Sections

```
[Verse]
[Chorus] x3
[Bridge] (softly)
[Outro] x2 (build)      -- and a comment, if you like
```

- **The name** is anything without a `]`. Matched ignoring case and extra spaces.
- **`xN`** (N ≥ 2) is an adjacent repeat: play this block N times. It renders
  **once, with a large `×N` badge** — not duplicated down the page, which would
  just cost you screens and pedal presses to read the same thing twice.
- **`(a note)`** is a performance direction, shown next to the section name.

Section headers are colour-coded and stick to the top of the screen as you
scroll, so you always know what you're in.

### Repeating a section later

Name a section again later and what you put underneath decides what happens:

| Later `[Verse]` with… | Means |
|---|---|
| nothing under it | **Full repeat** — same chords, same lyrics |
| lyric lines only | **Same chords, new words** |
| chord lines | **A variant** — it stands alone, and doesn't change the original |

Repeats **expand in place**, so the chords are always right there. You should
never have to scroll backwards mid-song to find out what you're playing. The
expanded block keeps its section label.

For a lyrics-only repeat, separate its groups with blank lines and they line up
with the original's groups in order — first with first, second with second. If
the counts don't match you get a warning and the app fills what it can, rather
than refusing the song.

Naming a section that hasn't been defined yet is an error, reported with its
line number rather than failing silently.

### Numbering

If a name has no number on it and turns up more than once, the display numbers
it for you: *Verse 1*, *Verse 2*, and so on. Number them yourself — `[Verse 1]`,
`[Verse 2]` — and each is treated as its own section, written as you wrote it.

---

## Chord lines

A line beginning with `|` is a chord line.

```
|D/A |% |G |D/A |
|Em  |A |Bm |G |    x2
|D  G|C   |          -- two chords in one bar
```

- Bars are separated by `|`, and the line needs one at each end.
- A bar holds zero or more chord tokens, separated by whitespace.
- Spacing inside a bar is up to you — line things up if it helps you read the
  file, or don't. It has no effect on the display.
- Two or more chords in one bar share the bar's beats between them.
- **`xN` after the last `|`** repeats the whole line N times.
- **`--` after the last `|`** starts a comment.

Bars are drawn at a uniform width across the whole chart, fitted so the song's
longest chord line still fits on one row. Every chord line gets its own row, so
a short line simply leaves space to the right — which costs nothing, while
wrapping a phrase costs you on stage.

---

## Chord tokens

| Token | Meaning |
|---|---|
| `D`, `Am7`, `Bbmaj9#11` | A chord — root, optional accidental, whatever quality you like after it |
| `D/A` | Slash chord. The `/` means a bass note, and only that |
| `%` | Repeat the previous bar. Renders as the repeat glyph, never as a literal `%`. Only valid alone in a bar |
| `R` | **Rest** — see below |
| `N.C.` | No chord. The harmony drops out but the song carries on. Rendered distinctly from a rest |
| anything else | Kept as literal text and shown dimmed — `stop`, `tacet`, `let ring` |

Formally, a token is recognised as a chord when it matches:

```
^[A-G](#|b)?([^/\s]*)(/[A-G](#|b)?)?$
```

Which is to say: a root note, an optional sharp or flat, anything you like for
the quality, and optionally a slash bass note that is itself a note name. If it
doesn't match, it's kept and dimmed.

**An unrecognised token never breaks the chart.** That's the important rule: a
chart that half-renders beats a blank screen at a gig, so nothing you can type
in a bar will refuse to load.

### Rests

`R` is a rest. It's `R` because chord roots are `A`–`G`, so it can't collide
with anything, and because every other obvious character was already taken:
`-` starts comments, `x` repeats lines, `%` repeats bars, `/` marks a bass note.

**Duration needs no extra syntax.** A rest takes up beats exactly the way a
chord does, so the app works out which rest to draw from how much of the bar the
`R` covers:

| You type (in 4/4) | You get |
|---|---|
| `\|R \|` | a whole-bar rest |
| `\|D  R\|` | two beats of D, then a half rest |
| `\|D  G  R  R\|` | a beat each, with two quarter rests |

Rests are drawn as proper notation glyphs at whatever size the chart is set to.

> **Reserved for a later version:** `^` as a fermata (`|G^ |`) and a bare `/` as
> a beat hold (`|D / / G|`). Neither is parsed today — type them and they'll
> show up as dimmed literal text.

---

## Lyrics

Any line that isn't a header, a section, a chord line or a comment is a lyric.
It's rendered exactly as you typed it.

Lyrics are a memory jog sitting under the chord line they belong to. **There is
no chord-to-syllable alignment** — don't spend time padding lines with spaces to
line words up under chords, because it won't do anything. See
[Why it works this way](design.md#bars-not-syllables).

You can hide lyrics with the toolbar button, or set a song's starting state with
`Lyrics:` in the header.

---

## Comments

```
-- A whole line of commentary, for you not the audience.
|Em |A |        -- or on the end of a chord line
```

Comments are only recognised **at the start of a line** (after any indentation),
or **after the closing `|` of a chord line**. They're shown in their own colour,
and they hide along with the lyrics.

Notice what's *not* on that list: `--` in the middle of a lyric is just text. A
lyric like `well--maybe not` renders as written. Treating it as a comment would
silently chop the rest of the line off, and you'd find out on stage. This is a
deliberate departure from how `--` works in most formats, for exactly that
reason.

If you genuinely need a lyric line to *begin* with a literal `--`, escape it as
`\--`.

---

## Blank lines and grouping

A blank line is meaningful: it's a **phrase break**, and it renders as vertical
space. Several in a row collapse into one.

Blank lines also matter for a reason you can't see. Within a section, a chord
line **governs** every lyric line after it until the next chord line, the next
blank line, or the end of the section. That unit is a **group** — and groups are
where page turns snap to, which is what stops a page turn from separating a
chord line from its words.

So blank lines are your control over where page turns are allowed to land. Put
one where a phrase genuinely ends, and the paging will feel right.

---

## Repeating material

Four tools, for four different situations:

| Situation | Use |
|---|---|
| The same bar again | `%` |
| The same line twice running | `xN` at the end of the chord line |
| The same block back-to-back | `xN` on the section header — renders once with a `×N` badge |
| Material from earlier in the song | Name the section again — expands in place |

The distinction between the last two is deliberate. `xN` is the same thing twice
in a row, where you can see it's the same thing and printing it again would just
cost you page turns. A named repeat pulls in material from somewhere else in the
song, which you *do* want printed where you'll be playing it, because scrolling
backwards mid-song is how you lose your place.

---

## When something is wrong

The parser never gives up on a file. Problems appear as **errors** (red) and
**warnings** (amber) at the top of the chart, with line numbers, and everything
it *did* understand still renders underneath.

That's on purpose: a chart that half-works beats a blank screen with an apology
on it. Fix the file, re-import, and it updates in place.

The import screen refuses a file outright only when it plainly isn't a chart at
all — no header line, no section and no chord line anywhere in it.

---

## A worked example

This is `Format Test`, the chart the app ships with. It isn't a song; it's every
awkward case in one file.

```
Title: Format Test
Artist: LiveChart
Key: Am
Capo: 0
Time: 6/8
Tempo: 120
Notes: Exercises every renderer feature. Not a real song.
Lyrics: on

[Rests]
-- Whole, half and quarter rests, all inferred from beat slots.
|Am |R |Am  R |Am  R  R |
Rest durations need no extra syntax

[No Chord]
|N.C. |Am |% |
Everybody out, then back in

[Wide Names]
|Bbmaj9#11 |F#m7b5/C# |stop |
Long chord names and an unrecognised literal

[Two Per Bar] x2
|Am  G |F  E7 |
Two chords sharing one bar

[Rests]
```

The last line is a bare repeat: `[Rests]` with nothing under it brings back both
its chords and its lyrics, expanded where you're playing them.

---

## Quick reference

```
Title: ...           header attribute (before the first section)
Lyrics: off          this song opens with lyrics hidden

[Name]               section
[Name] x3            play 3 times — rendered once with a ×3 badge
[Name] (softly)      performance direction
[Name]               named again = repeat; what's underneath decides how

|G |Am |C |D |       chord line — leading and trailing | required
|D  G|C |            two chords sharing a bar
|Em |A |   x2        play this line twice
|Em |A |   -- note   trailing comment

%                    repeat the previous bar
R                    rest — duration comes from the beats it covers
N.C.                 no chord
anything else        kept as dimmed literal text

lyric text           any other line
\--                  a lyric that really does start with two dashes
-- comment           whole-line comment
(blank line)         phrase break, and a page-turn boundary
```

---

## Appendix: how the app treats these files

Not part of the file format, but recorded here because it's what the format's
shape is *for* — mostly the group rule, which only makes sense alongside the
navigation it exists to serve. [Using LiveChart](using.md) is the same material
written for playing rather than for writing.

**Groups are the unit of navigation.** A group is a chord line plus the lyrics
it governs. Page turns land on group boundaries, which is the whole reason
blank-line placement matters.

**A page turn** moves by a chosen fraction of the viewport — 50%, 75% or 100% —
and then:

- Snaps to a group boundary if one sits within **15% of the viewport height** of
  the ideal landing point, so a chord line comes to rest flush below the sticky
  section header rather than clipped through it.
- Breaks ties towards **undershooting**. Showing a line twice is untidy; hiding
  one loses your place.
- Never scrolls **past the top of a group the screen was already cutting off**.
  This is why 100% is sometimes less than a full screen: skipping a couplet, or
  showing it after its chord line has gone, costs you your place, while an
  overlap costs nothing.

**Inputs**, all mapped to the same advance and retreat:

- **Pedal or keyboard**, in or out of performance mode. Defaults are `↓`, `→`,
  `Page Down` and `Space` to advance; `↑`, `←` and `Page Up` to go back. The
  **Learn pedal** screen replaces these with whatever your pedal actually sends,
  since models and modes differ.
- **Tap zones** in performance mode: three stacked bands down the screen —
  **12%** menu, **33%** back, **55%** advance. Stacked rather than side by side
  because your hand comes to the iPad from below, so the biggest, lowest band is
  the one you need most.

Key auto-repeat is ignored, so a foot resting on a pedal can't scroll the song
away. Scrolling is animated unless the device asks for reduced motion, in which
case it jumps. Advancing past the end of a song needs a **second press** to
confirm — for now the song simply parks at its end.

**Rests and repeat marks are drawn as inline SVG**, not Unicode musical
symbols. The Unicode block for them (U+1D13B–U+1D13E) has unreliable font
coverage on iOS and would fall back to empty boxes on exactly the device this is
built for.

---

[← Songs, import and backup](songs.md) · [Guide contents](README.md)

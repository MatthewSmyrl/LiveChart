[← Guide contents](README.md)

# Using LiveChart

Two screens, really: the chart, and the library. This chapter is the chart.
[Songs, import and backup](songs.md) and [Setlists](setlists.md) are the other
one.

---

## The toolbar

Along the top, left to right:

| Control | What it does |
|---|---|
| **A−** · **%** · **A+** | Display size, in 10-point steps from 60% to 220%. The reading between them is where you are now. Everything scales together — chords, lyrics, section headers, bar widths. |
| **Songs** | Opens the library: import, back up, export, delete, pick what to play, and build [setlists](setlists.md). |
| **E** · **E·2** | The key the song sounds in, and the capo fret when there is one. Opens [key and capo](#key-and-capo). Turns amber when the chart is transposed. |
| **Step 75%** | How far one page turn travels — cycles **50% → 75% → 100%**. See [page turns](#page-turns) below. |
| **Pedal** | The learn screen, for teaching the app what your pedal sends. Also where the screen-awake status lives. |
| **Lyrics** | Shows or hides the lyric lines. Lit up when they're on. |
| **Light** / **Dark** | Switches theme. The button is labelled with where you're going, not where you are. Dark is the default. |
| **Perform** / **Exit** | Enters and leaves [performance mode](#performance-mode). |

Size, step, theme and pedal bindings are remembered between sessions, so the
toolbar shows whatever you last set rather than the defaults described here.
Lyrics are the exception — see [below](#lyrics).

Above the chart itself you'll see the song's title, the key and capo in force,
and, if the file supplies them, the artist, time signature and tempo. Tapping
the key opens [key and capo](#key-and-capo) too.

The app **reopens on whatever song you last had open**. Starting it mid-set
shouldn't cost you a tap.

---

## Page turns

The pedal and the keyboard turn pages **all the time**, whether or not you're in
performance mode. Performance mode is only about hiding the chrome, showing the
tap zones and holding the screen awake.

Out of the box:

- **Forward** — `↓`, `→`, `Page Down`, `Space`
- **Back** — `↑`, `←`, `Page Up`

A turn moves by the **Step** fraction of the screen and then snaps to the
nearest group boundary — a chord line and its lyrics stay together, and a turn
never scrolls past the top of a group the screen was already cutting off. The
practical effect is that you can't lose your place in a page turn, and that
"100%" is occasionally a bit less than a full screen.

**75% is the sweet spot.** It gives very predictable paging, and it's the
setting where the overlap rule almost never has to intervene. 50% is gentler and
turns more often; 100% covers the most ground and is inherently a bit ragged.

Holding a pedal switch down does nothing extra — key auto-repeat is ignored, so
a foot resting on the pedal can't scroll the song away.

A couple of small behaviours worth recognising when they happen:

- Press back at the top of a song and you'll see **"Top of song"**. That's the
  app telling you there's nothing above, not a dropped press.
- Press forward at the end and you'll see **"End of song"**. The chart stays
  where it is.

With a [setlist](setlists.md) playing, both of those gain a second half —
*"— press again"* — and the second press moves you to the next or previous song
in the running order. The confirmation step is there so a pedal bounce on a held
last chord, or a foot catching the switch during a count-in, doesn't change
what's on the screen.

---

## Performance mode

Tap **Perform**. Three things happen:

1. The toolbar gets out of the way after about 3.5 seconds, giving the chart the
   full screen.
2. Three **tap zones** appear over the chart, outlined so you can see the
   layout. The outlines fade after 2 seconds — they're a reference you read
   once, not a control you reach for.
3. The app asks the device to keep the screen awake.

### The tap zones

Stacked bands across the whole screen, because your hand comes to the iPad from
below:

```
┌──────────────────────────────┐
│  menu                    12% │   tap → brings the toolbar back
├──────────────────────────────┤
│                              │
│  back                    33% │   tap → page back
│                              │
├──────────────────────────────┤
│                              │
│                              │
│  advance                 55% │   tap → page forward
│                              │
│                              │
└──────────────────────────────┘
```

The biggest, lowest band is the one you need most. The zones are anchored to the
screen, not the chart, so they don't move as the song scrolls.

**Dragging still scrolls.** A tap turns the page; a drag scrolls the chart by
hand and does not also turn a page. If you want to nudge the chart a little
without paging, drag it.

To leave: tap the **menu** band at the top to bring the toolbar back, then tap
**Exit**.

---

## Lyrics

The **Lyrics** button shows and hides the words for the song you're looking at.

A chart can also carry its own preference in the file — `Lyrics: on` or
`Lyrics: off` in the header — and **that wins every time the song opens**.
Whether you need the words is a property of the song, not something you should
have to remember at the top of it. A song you know cold wants the chords alone:
fewer page turns, and more chart on screen.

The toolbar button still overrides the file for as long as that song is up.
Reopen the song and the file's setting comes back. Songs with no `Lyrics:` line
in them open however you last left the button.

One current limitation: the Lyrics button is in the toolbar, which hides itself
during a song. Changing your mind mid-song means tapping the menu band first.

---

## Key and capo

**The chart draws the shapes your hands make.** The key is what the song sounds
like, the capo is where the capo sits, and the chords on screen are the ones
you'd play with the capo on.

So a song in E with the capo at 2 is drawn in D shapes. Take the capo off and
the same song is drawn in E. Keep the capo at 2 but sing it a tone lower, in D,
and it's drawn in C shapes. Move the capo *and* the key together — E at capo 2,
D with no capo, G at capo 5 — and the page doesn't change at all, because your
hands don't.

Tap the key in the toolbar, or in the chart header, to open the panel:

- **The keys** — tap the one you want the song to sound in. The song's own key
  has a dashed outline.
- **Capo** — **−** and **+** move it a fret at a time, from none to the 11th.
- **Reset** puts the key and capo back to what the file says — or, when the
  song is playing from a setlist that sets a key for it, to what the setlist
  says.

**A transposed chart is always marked.** The key button goes amber, the chart
header says what it was transposed from, and the key rides in every section
header, so it's still on screen once you've scrolled past the top. A chart
showing none of that is exactly as its file was written.

**It's for this song, this time.** Like the Lyrics button, a key you choose here
lasts as long as the song is up. Open the song again — or move on to another
and come back — and it's back in the file's key. To keep a key for a
particular gig, set it on the [setlist](setlists.md#a-key-for-each-song) instead.

It's a stop between songs, not something to do mid-song: while the panel is
open, the pedal and the tap zones do nothing.

### How the chords are spelled

Chords follow the key they're in, the way a written chart would: in B♭ the four
chord is E♭, not D♯; in E the three chord is G♯m, not A♭m.

- Keys are named with flats, except **F♯** and **C♯**. **G♭** and **D♭** are
  there too, for songs you think of that way. Minor keys are C♯m, E♭m, G♯m and
  B♭m.
- **C♭, F♭, E♯ and B♯ are shown as B, E, F and C.** They're correct on paper,
  and no use to anyone at a gig. Nor will you ever see a double sharp or
  double flat.
- The rest of a chord — `maj7`, `sus4`, `7(b9)` — comes along unchanged, and a
  slash bass note moves with the chord.
- Only chords move. Rests, `N.C.` and any words you've put in a bar stay as they
  are.

The chart's file is never changed — exporting a song always gives you the chart
as you wrote it.

---

## Teaching the app your pedal

Tap **Pedal**.

Bluetooth page-turners send keyboard keys, but which keys depends on the model
*and* the mode it's in — and the mode is often switched by a button combination
that's easy to hit by accident. The defaults above cover most pedals in most
modes. When they don't, teach it:

1. Press **Learn** on the row for **Advance**.
2. Press that switch on the pedal.
3. Do the same for **Go back**.
4. **Done**.

Whatever the pedal sends replaces the old binding for that action, rather than
being added alongside it. That's on purpose: if your "next" switch happens to
send `↑`, you don't want it also paging backwards. `Esc` cancels a capture
that's picking up nothing, and **Restore defaults** puts everything back.

Two messages you might see:

- *"That press arrived without an identifiable key code"* — some pedals report
  nothing usable in some modes. Try the pedal's other keyboard mode; many have
  two or three, usually switched by holding both switches while powering up.
- *"One action has nothing bound"* — both switches appear to send the same code.
  Same fix: try another pedal mode. Failing that, restore the defaults and use
  the tap zones.

### Keeping the screen awake

The Pedal screen also shows a line telling you whether the screen-awake request
is currently being honoured. It's here rather than over the chart because on
iPadOS the status flickers constantly and a live badge would say nothing
actionable — this way you can check it deliberately, and re-check after an
iPadOS update.

The short version of what to expect: **a song you're actually playing through
doesn't sleep**, because the app keeps renewing the request as you work the
pedal. What catches people is an iPad left genuinely untouched for a couple of
minutes — the app can't override Auto-Lock outright today, so Auto-Lock wins.

So before a gig, go to **Settings → Display & Brightness → Auto-Lock** and set
it long, or Never. Then don't think about it again.

---

[← Getting the app](getting-started.md) · [Guide contents](README.md) · [Songs, import and backup →](songs.md)

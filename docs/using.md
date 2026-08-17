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
| **Step 75%** | How far one page turn travels — cycles **50% → 75% → 100%**. See [page turns](#page-turns) below. |
| **Pedal** | The learn screen, for teaching the app what your pedal sends. Also where the screen-awake status lives. |
| **Lyrics** | Shows or hides the lyric lines. Lit up when they're on. |
| **Light** / **Dark** | Switches theme. The button is labelled with where you're going, not where you are. Dark is the default. |
| **Perform** / **Exit** | Enters and leaves [performance mode](#performance-mode). |

Size, step, theme and pedal bindings are remembered between sessions, so the
toolbar shows whatever you last set rather than the defaults described here.
Lyrics are the exception — see [below](#lyrics).

Above the chart itself you'll see the song's title and, if the file supplies
them, the artist, key, capo, time signature and tempo.

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

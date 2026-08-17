[← Guide contents](README.md)

# Setlists

A setlist is a running order. Once one is playing, the pedal takes you from the
last chord of a song to the top of the next one — so a whole set is one
continuous thing to your foot, and you never go looking for the next chart
between numbers.

You don't need one. Everything else in the app works exactly as it did without a
setlist; this is a layer on top.

---

## Contents

- [Making one](#making-one)
- [Playing a set](#playing-a-set)
- [Songs that aren't there](#songs-that-arent-there)
- [Backing them up](#backing-them-up)

---

## Making one

**Songs → Setlists → New setlist.**

You get an empty set with a name you can type over. Below it, every song in your
library with a **+** — tap a title to put it at the bottom of the running order.
Then:

| Control | What it does |
|---|---|
| **↑** / **↓** | Moves that song one place. Greyed out at the ends. |
| **✕** | Takes it out of the set. The song stays in your library. |
| *The name field* | Rename. Leave it blank and it becomes *Untitled set*. |
| **Delete set** | Throws the whole set away — asks first. The songs stay in your library. |
| **Done** | Back to the list of sets. |

There's no drag-and-drop, deliberately. Dragging inside a scrolling list is the
fiddliest thing there is on a touchscreen, and this is a screen you use standing
up ten minutes before a gig.

**A song can go in twice.** Add it again and it appears again — a reprise in the
encore is the same song played a second time, and the app treats it as a
position in the night rather than as a duplicate to be cleaned up.

Everything saves as you go. There's no separate save step.

---

## Playing a set

**Start** on a set's row opens its first song and puts you at position 1. The
toolbar then shows something like **3/12** — where you are in the running order.

**Start** is the only button on the row, on purpose. It's the one you press in a
hurry, and there is deliberately nothing next to it that could lose you a set —
deleting one is inside the set, behind a confirmation.

From there, in or out of performance mode:

- **Forward at the end of a song** → *"End of song — press again"*. Press again
  and you're at the top of the next song, which announces itself briefly by
  name and number.
- **Back at the top of a song** → *"Top of song — press again"*. Press again for
  the previous one.

Both directions take two presses, for the same reason forward always has: a
pedal bounce under a held last chord, or a foot catching the switch during a
count-in, must not change what's on the screen.

At the last song of the set, forward says *"End of song"* and stops offering.
The night doesn't loop back round to the opener.

**The set survives a relaunch.** If the iPad restarts between numbers, the app
comes back on the same song at the same position.

### Stepping out of the set

Open any song from the **Songs** tab and you go straight to it. The set stays
selected, but if that song isn't in it the position readout disappears and the
end-of-song press goes back to simply parking at the end. Pick a song that *is*
in the set and you rejoin at that point.

To leave a set properly, just start another one. A set is only "playing" in the
sense that the pedal knows where to go next.

---

## Songs that aren't there

A setlist holds song *titles*, so it keeps working when you re-import an edited
chart — that's the same rule the library uses to decide whether an import is an
update or a new song.

It also means a set can name a song you haven't got: you deleted it, or you
restored a backup of your sets onto a device before the charts arrived. When
that happens:

- The entry shows in the editor greyed out, marked **not on this device**.
- **The pedal steps over it.** The set plays through, missing that one out.
- Import the chart and the gap fills in by itself. Nothing to re-link.

A set where *nothing* is on the device can't be started, and its **Start**
button is greyed out rather than hidden, so you can see why.

---

## Backing them up

**Back up** includes your setlists along with the songs and settings — one file,
as before. See [Backing up, and why you should](songs.md#backing-up-and-why-you-should),
which is worth reading if you haven't.

Restoring merges by set: a set already on the device is only overwritten if the
one in the bundle is **newer**. So restoring last month's backup won't undo a
running order you fixed this afternoon.

Backups written before setlists existed restore exactly as they always did.

---

[← Songs, import and backup](songs.md) · [Guide contents](README.md) · [Writing charts →](lcf-format.md)

# LiveChart — User Guide

LiveChart is a chord-chart display for playing live. It runs in a browser, it
works offline, and it is built for an iPad on a mic stand with a Bluetooth
page-turner pedal at your foot.

Charts are **bar-based**: a chord line describes the harmonic rhythm of a
phrase, and the lyrics underneath are a memory jog. Nothing is aligned
syllable-by-syllable, because that isn't readable from six feet away.

**The app lives at [matthewsmyrl.github.io/LiveChart](https://matthewsmyrl.github.io/LiveChart/).**
The path is case-sensitive — it has to be `LiveChart`, not `livechart`.

---

## Contents

| | |
|---|---|
| **[Why it works this way](design.md)** | The thinking behind bar-based charts, big type, and page turns that never lose your place. Start here if you want to know *why* before *how*. |
| **[Getting the app](getting-started.md)** | Opening it in a browser, installing it on an iPad home screen, and running offline. |
| **[Using LiveChart](using.md)** | The toolbar, performance mode, tap zones, and teaching the app what your pedal sends. |
| **[Songs, import and backup](songs.md)** | Getting charts onto the device, updating them, and — importantly — backing them up. |
| **[Setlists](setlists.md)** | Running orders, and letting the pedal carry you from one song into the next. |
| **[Writing charts: the `.lcf` format](lcf-format.md)** | The file format, from a two-line example to the full token reference. |

---

## In a hurry

1. Open **[matthewsmyrl.github.io/LiveChart](https://matthewsmyrl.github.io/LiveChart/)**.
   You'll land on a sample chart called *Format Test*.
2. On an iPad, use Safari: **Share → Add to Home Screen**. Run it from the icon
   from then on. (This matters more than it sounds — see
   [Getting the app](getting-started.md).)
3. **Songs → Import**, and pick a `.lcf` file. Tap a title to open it.
4. **Perform** hides the toolbar and turns on the tap zones. The big band at the
   bottom of the screen turns the page; your pedal does the same thing.
5. Once you've got charts loaded, **Songs → Back up** and keep the file
   somewhere. Browsers throw away local storage, and that file is your undo.

---

## A note on what's here and what isn't

This guide covers what the app does today. Transposition is on the list but not
built yet, so it isn't described here — it'll turn up in this guide when it
turns up in the app.

[The format chapter](lcf-format.md) is both the writing guide and the formal
definition the parser is written against. There is deliberately only one
document for the format, so it can't drift out of step with the app.

[← Guide contents](README.md)

# Getting the app

There is nothing to buy, no account to make, and nothing to install from a
store. LiveChart is a web app: you open a URL, and if you want it on a home
screen, the browser puts it there.

---

## The URL

**[https://matthewsmyrl.github.io/LiveChart/](https://matthewsmyrl.github.io/LiveChart/)**

The path is **case-sensitive** — `LiveChart` with two capitals. `livechart`
gets you a 404.

Tested on Chrome, Firefox and Safari, on iPad, and PC. It's built for the
iPad, but it behaves the same everywhere; a laptop is a perfectly good place to
write and check charts.

## First run

You'll land on a sample chart called **Format Test**. That's deliberate — it's a
made-up song that exercises every feature of the renderer (rests, no-chord bars,
6/8 grouping, absurd chord names), so it doubles as a "does this look right"
check.

It's the only song the published site ships with. Real songs are under
copyright and aren't mine to republish, so **everything else you see will be a
chart you imported yourself**. Head to [Songs, import and backup](songs.md) for
that.

You can delete Format Test once you have your own charts loaded. It stays
deleted.

---

## Installing on an iPad

Do this. It isn't just a shortcut — it changes how the app behaves.

1. Open **[the URL](https://matthewsmyrl.github.io/LiveChart/) in Safari**.
   (Not Chrome on iOS — Add to Home Screen only works properly from Safari.)
2. Tap the **Share** icon.
3. Choose **Add to Home Screen**.
4. Launch it from the new icon from then on.

What that buys you:

- **It runs offline.** The whole app is cached on the device the first time you
  load it. After that it never needs the network — which matters in venues,
  where it never works anyway.
- **It runs full-screen**, without Safari's chrome eating the top of your chart.
- **Your songs survive.** This is the important one. iOS deletes a website's
  local storage after about **7 days without a visit** — and a home-screen
  install is exempt from that. Run it from the browser and your library will
  quietly evaporate between gigs.

Even installed, keep a backup. See
[Songs, import and backup](songs.md#backing-up-and-why-you-should).

### Set your Auto-Lock longer

Before your first gig, go to **Settings → Display & Brightness → Auto-Lock** and
give yourself some room — 15 minutes, or Never.

The app does ask iOS to keep the screen awake during performance mode, and while
you're playing and working the pedal it holds. What it can't do yet is override
Auto-Lock outright — so if the iPad sits genuinely untouched, through a long
intro or a chat with the audience, a 2-minute Auto-Lock will still catch you.

Extending it, or switching it off for a gig, closes that gap and costs you
nothing.

---

## Other browsers and devices

On a **Mac or PC**, just use the URL. Chrome and Edge will offer to install it
as an app if you want a window without browser chrome; Firefox won't, and it
works fine in a tab either way.

On an **Android tablet**, Chrome's *Add to Home screen* does the same job as
Safari's, including the offline caching.

Everything in [Using LiveChart](using.md) applies everywhere — the keyboard
controls are the same keys your pedal sends, so you can rehearse the whole
performance flow at a desk with the arrow keys.

---

## Updates

When a new version ships, it downloads in the background but **does not swap
itself in under a song you're in the middle of**. It takes over the next time
you launch the app.

On an iPad that means fully closing it first: swipe up from the bottom and flick
the app away, then reopen from the home-screen icon. Just switching back to it
resumes the old version — which makes a fix that has genuinely shipped look like
it didn't work.

---

## What if something goes wrong

- **Blank screen or stale-looking version** — force-quit and relaunch (above).
- **Songs have vanished** — most likely the browser cleared its storage. Import
  your backup file: **Songs → Import**, pick the `.json` bundle, and everything
  comes back in one step.
- **A chart shows red or amber lines at the top** — that's the parser telling you
  what it didn't understand, with line numbers. The song still renders; see
  [the format chapter](lcf-format.md#when-something-is-wrong).
- **Files greyed out in the iPad picker** — shouldn't happen any more, but if it
  does, the workaround is to rename a copy to `.txt` and import that. The
  contents are what decide whether a file is a chart, not the extension.

---

[← Why it works this way](design.md) · [Guide contents](README.md) · [Using LiveChart →](using.md)

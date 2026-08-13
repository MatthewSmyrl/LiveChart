[← Guide contents](README.md)

# Why LiveChart works this way

Most of the app's odder-looking choices come from the same place: it is meant to
be read while you are playing, from a stand, with both hands busy. That rules
out a surprising amount.

---

## Bars, not syllables

Look at a chart in ChordPro or on Ultimate Guitar and the chords sit directly
above the syllable they land on. That's genuinely useful when you're learning a
song at a desk. On stage it falls apart: the alignment forces the type small, it
breaks the moment you phrase a line differently, and it gives you a wall of text
to find your place in.

LiveChart charts **bars**. A chord line is a row of bars showing the harmonic
rhythm of a phrase. The lyric lines underneath it are a reminder of which verse
you're in, not a singalong. There is no chord-to-syllable alignment offered and
none intended.

The assumption is that you already know the tune. What you need at a gig is
"where am I, and what's the next chord" — and that reads fine in big type from
across the stage.

## Big type, more pages

The chart is deliberately large. The app doesn't try to squeeze a song onto one
screen, because a song squeezed onto one screen is a song you can't read.

Chords render at about 41px at 100% zoom, lyrics at about 29px. That was not the
first guess — it started smaller, read fine on a desk, and was unreadable on a
stand. The current sizes came out of an actual run-through with the iPad where
it lives.

The trade is more page turns. That's fine, because turning the page is a foot
press, and because turning **lyrics off** buys back both content and turns for
songs where you don't need the words.

## Page turns that can't lose your place

This is the part that took the most work, and it's invisible when it's working.

A page turn moves by a fraction of the screen you choose — 50%, 75% or 100% —
and then **snaps to a group boundary**. A "group" is a chord line plus the
lyrics belonging to it. Two rules fall out of that:

- **A chord line is never separated from its lyrics by a page turn.** Landing
  mid-group and stranding the words on the previous screen is exactly the
  failure that costs you your place.
- **A turn never scrolls past the top of a group the screen was already cutting
  off.** So "100%" is sometimes a bit less than a full screen. Showing you a
  couplet twice costs nothing; skipping it costs you the verse.

When the snap has to choose, it chooses to **undershoot**. Seeing a line twice
is untidy. Not seeing it at all is a problem.

75% is the recommended setting, and the one where the overlap rule almost never
has to intervene.

## A pedal, and a screen that stays awake

The app is built around a Bluetooth page-turner. Your hands are occupied; a
pedal is the only input that isn't.

Page-turner pedals are not standardised — the same model ships in modes that
send arrow keys, page keys or something else entirely, and the label on the box
is frequently wrong about which switch sends what. So rather than guessing,
there's a **Learn pedal** screen that captures whatever yours actually sends.

Tap zones sit behind the chart as a backup for when the pedal is packed away or
its battery has died mid-set. They're stacked bands rather than left/right
halves, because your hand comes to an iPad on a stand from below — so the
biggest, lowest band is the one you reach for most.

The app also asks the browser to keep the screen awake during performance mode.
On iPadOS this is more of a negotiation than a setting; see
[Using LiveChart](using.md#keeping-the-screen-awake) for what actually happens
and what to do about it.

## Everything stays on your device

There is no account, no server, and nothing uploaded. Songs are parsed and
stored in the browser's local database on the device you're using. That's what
makes the app work with no signal in a venue basement, and it's why **backups
matter** — nobody else has a copy. See
[Songs, import and backup](songs.md#backing-up-and-why-you-should).

## It's a personal tool, shared

LiveChart was built for one person's gigs and published so it could be installed
to a home screen. It's shared because it might be useful to you too, not because
it's a product. There's no support desk behind it, the deployed site ships with
one sample chart and none of anyone's copyrighted material, and the roadmap is
"whatever breaks at the next gig".

Which is also the invitation: if something is wrong at gig distance, that's the
kind of thing worth saying out loud.

---

[← Guide contents](README.md) · [Getting the app →](getting-started.md)

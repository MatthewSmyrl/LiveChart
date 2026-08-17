[← Guide contents](README.md)

# Songs, import and backup

Tap **Songs** in the toolbar.

Everything about LiveChart runs and stores locally. There's no account and no
sync — your charts live in a database inside the browser, on that device. That's
what makes it work offline in a venue with no signal, and it's why the backup
button matters more here than it would in a normal app.

---

## The library screen

Two tabs — **Songs** and **[Setlists](setlists.md)** — over one row of buttons.
This chapter is the Songs tab: a list of every song you have, alphabetically,
with the one currently open marked. Along the top:

| Button | What it does |
|---|---|
| **Import** | Opens the file picker. Takes `.lcf` charts, and backup bundles. |
| **Back up** | Writes every song, setlist and setting into one file. |
| **Guide** | This guide, which is inside the app and works offline. |
| **Done** | Back to the chart. |

And on each row:

| Button | What it does |
|---|---|
| *The title* | Opens that song. |
| **Export** | Saves that one song back out as a `.lcf` file. |
| **✕** | Deletes it — asks first. |

---

## Importing charts

**Import**, then pick one or more files. You can select several at once.

The app reads each file, parses it, and adds it to the library. You'll get a
one-line summary of what happened — how many were added, how many updated, and
by name, anything it refused, with the reason.

**A song is identified by its `Title:` line**, not by its filename, and titles
are matched ignoring case and extra spaces. So importing a chart whose title
already exists **updates the one you have** rather than leaving you two nearly
identical entries to choose between in a dark venue. Edit a chart on your
computer, send it over, import it, done.

A file with no `Title:` line still imports — it gets filed under its filename,
and the chart itself tells you the `Title` was missing.

Files that aren't charts get skipped by name with a reason, usually *"it has no
header, section or chord line"*. Nothing else in the import is affected.

### Getting files onto an iPad

The picker shows **all** files, not just `.lcf` ones. That's deliberate — iOS
doesn't recognise the `.lcf` extension, and filtering the list greys out
precisely the files you're trying to import. Whether a file is a chart gets
decided by reading it, so showing everything costs nothing.

Anywhere the Files app can see works: iCloud Drive, Dropbox, On My iPad,
whatever. Emailing yourself a `.lcf` and saving the attachment to Files is a
perfectly good workflow. So is AirDrop.

---

## Backing up, and why you should

**Songs → Back up** produces one file, named something like
`LiveChart backup 2026-08-12.json`. On an iPad it goes through the share sheet,
so you can drop it into Files, iCloud, or AirDrop it straight to a laptop.

That file holds every song's original `.lcf` text, your
[setlists](setlists.md), and your settings — display size, step, theme, pedal
bindings. To restore it, **Import** it like any other file. One step, everything
back.

Do this because:

- **Clearing your browser cache or site data wipes the library.** There's no
  copy on a server, because there's no server.
- **iOS deletes a website's storage after about 7 days without a visit.**
  Installing to the home screen exempts you from that (see
  [Getting the app](getting-started.md#installing-on-an-ipad)) — but the backup
  is the thing that means it doesn't matter if something goes wrong anyway.
- **It's how you move to another device or browser.** Back up on the laptop,
  import on the iPad, and you have the same library and the same settings.

Restored **settings apply at the next launch**, not immediately — having the
type size change under you while you're looking at the screen would be worse
than waiting.

A restore adds and updates; it doesn't delete. Songs you have that aren't in the
bundle stay where they are.

### Getting a single song back out

**Export** on a song's row writes that one chart back out as a `.lcf` file, in
the same text you imported. Useful for editing a chart on a real keyboard, or
sending one to someone else.

The backup bundle is plain JSON with the `.lcf` text sitting inside it, so if
this app ever stops existing you can still get your charts out of it with a text
editor.

---

## Deleting

**✕** on a row, then confirm. Deletions stick — including the sample *Format
Test* chart, which won't come back at the next launch.

Setlists naming a deleted song are left alone: the entry becomes a gap the pedal
steps over, and importing that chart again fills it back in. See
[Songs that aren't there](setlists.md#songs-that-arent-there).

If you delete everything, the library screen is where the app opens, since
there's nothing to show.

---

[← Using LiveChart](using.md) · [Guide contents](README.md) · [Setlists →](setlists.md)

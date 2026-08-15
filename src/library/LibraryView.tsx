import { useRef, useState } from 'react';
import { serializeBackup } from './backup';
import { shareOrDownload } from './download';
import { fileNameFor } from './identity';
import { byTitle } from './merge';
import type { StoredSong } from './types';
import type { ImportOutcome, LibraryApi } from './useLibrary';

/** `lc.*` keys worth carrying in a backup. */
function readPrefs(): Record<string, string> {
  const prefs: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('lc.')) prefs[key] = localStorage.getItem(key) ?? '';
    }
  } catch {
    /* private mode — a backup of the songs alone is still worth having */
  }
  return prefs;
}

function describeImport({ added, replaced, rejected, prefsRestored }: ImportOutcome): string {
  const parts: string[] = [];
  if (added) parts.push(`${added} song${added === 1 ? '' : 's'} added`);
  if (replaced) parts.push(`${replaced} updated`);
  if (prefsRestored) parts.push('settings restored — they apply next launch');
  for (const { name, reason } of rejected) parts.push(`skipped ${name}: ${reason}`);
  return parts.length ? parts.join(' · ') : 'Nothing to import.';
}

/**
 * The song library.
 *
 * Import is what puts real charts on the iPad without them ever entering the
 * repo or the published site, and export is what makes them survive iOS
 * clearing storage after 7 days of non-use. Neither is a convenience.
 */
export function LibraryView({
  library,
  currentId,
  onOpen,
  onClose,
}: {
  library: LibraryApi;
  currentId: string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const { songs, error, importFiles, remove } = library;
  const fileInput = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setBusy(true);
    try {
      setNotice(describeImport(await importFiles([...list])));
    } finally {
      setBusy(false);
      // Lets the same file be picked twice running, after an edit.
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const exportAll = async () => {
    const all = songs ?? [];
    if (all.length === 0) {
      setNotice('There is nothing to back up yet.');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const outcome = await shareOrDownload(
      `LiveChart backup ${stamp}.json`,
      'application/json',
      serializeBackup(all, readPrefs()),
    );
    if (outcome !== 'cancelled') {
      setNotice(`Backed up ${all.length} song${all.length === 1 ? '' : 's'}.`);
    }
  };

  const exportOne = async (song: StoredSong) => {
    // text/plain rather than an invented type: iOS offers more places to put a
    // file it believes it understands.
    await shareOrDownload(fileNameFor(song.title), 'text/plain', song.text);
  };

  return (
    <div className="library">
      <div className="library__bar">
        <h1 className="library__title">Songs</h1>
        <div className="toolbar__group">
          <button className="btn" onClick={() => fileInput.current?.click()} disabled={busy}>
            {busy ? 'Reading…' : 'Import'}
          </button>
          <button className="btn" onClick={() => void exportAll()}>
            Back up
          </button>
          {/* A plain link, not a router: the guide is static pages emitted at
              build time, precached with everything else, and each one carries
              its own way back — which matters, because launched from the home
              screen there is no browser chrome to go back with. */}
          <a className="btn" href="./guide/index.html">
            Guide
          </a>
          <button className="btn btn--on" onClick={onClose} disabled={!currentId}>
            Done
          </button>
        </div>
      </div>

      <input
        ref={fileInput}
        className="library__file"
        type="file"
        // Deliberately unfiltered. iOS resolves `accept` entries to UTIs, and
        // `.lcf` is an extension nothing has registered, so *any* accept list
        // greys the charts out in the Files picker — confirmed on the iPad,
        // 2026-08-11. `text/plain` does not rescue it either, since iOS types an
        // unknown extension as generic data rather than text. Showing every file
        // costs nothing: what a file actually is gets decided by reading it, and
        // anything that isn't a chart is refused by name with a reason.
        multiple
        onChange={(e) => void onPick(e.target.files)}
      />

      {error && <p className="library__warn">{error}</p>}
      {notice && (
        <p className="library__notice" role="status">
          {notice}
        </p>
      )}

      {songs === null ? (
        <p className="library__empty">Opening the library…</p>
      ) : songs.length === 0 ? (
        <p className="library__empty">
          No songs yet. <b>Import</b> a <code>.lcf</code> chart, or a backup bundle to restore
          everything at once.
        </p>
      ) : (
        <ul className="library__list">
          {byTitle(songs).map((song) => (
            <li className={`library__row ${song.id === currentId ? 'library__row--current' : ''}`} key={song.id}>
              <button className="library__open" onClick={() => onOpen(song.id)}>
                {song.title}
              </button>
              {confirming === song.id ? (
                <>
                  <span className="library__hint">Delete this song?</span>
                  <button className="btn" onClick={() => setConfirming(null)}>
                    Keep
                  </button>
                  <button
                    className="btn btn--danger"
                    onClick={() => {
                      setConfirming(null);
                      void remove(song.id);
                    }}
                  >
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button className="btn" onClick={() => void exportOne(song)}>
                    Export
                  </button>
                  <button className="btn" onClick={() => setConfirming(song.id)} aria-label={`Delete ${song.title}`}>
                    ✕
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

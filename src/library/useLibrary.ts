import { useCallback, useEffect, useRef, useState } from 'react';
import { readImport, type BackupSong } from './backup';
import { deleteSetlist, deleteSong, loadSetlists, loadSongs, saveSetlists, saveSongs } from './db';
import { mergeSongs } from './merge';
import { bundledSongs } from './seed';
import { mergeSetlists } from './setlists';
import type { Setlist, StoredSong } from './types';

/** Set once the bundled songs have been offered, so a deletion stays deleted. */
const SEEDED_KEY = 'lc.seeded';

export interface ImportOutcome {
  added: number;
  replaced: number;
  /** Setlists a backup bundle brought with it. */
  setsAdded: number;
  setsReplaced: number;
  /** Files that were not charts, with the reason, for an honest message. */
  rejected: { name: string; reason: string }[];
  /** True when a backup bundle carried preferences. */
  prefsRestored: boolean;
}

export interface LibraryApi {
  /** Null while loading — distinct from an empty library. */
  songs: StoredSong[] | null;
  /** Null while loading, as with songs. */
  setlists: Setlist[] | null;
  /** Storage is unavailable. The app still runs on what is in memory. */
  error: string | null;
  importFiles: (files: File[]) => Promise<ImportOutcome>;
  remove: (id: string) => Promise<void>;
  /** Creates or replaces one setlist, by id. */
  saveSet: (setlist: Setlist) => Promise<void>;
  removeSet: (id: string) => Promise<void>;
}

function seeded(): boolean {
  try {
    return localStorage.getItem(SEEDED_KEY) === 'true';
  } catch {
    return false;
  }
}

function markSeeded(): void {
  try {
    localStorage.setItem(SEEDED_KEY, 'true');
  } catch {
    /* private mode — the library reseeds next launch, which is harmless */
  }
}

/**
 * The song library, backed by IndexedDB.
 *
 * Storage failures are reported rather than thrown: whatever is already in
 * memory still renders, because a chart you cannot save beats no chart at all
 * on stage.
 */
export function useLibrary(): LibraryApi {
  const [songs, setSongs] = useState<StoredSong[] | null>(null);
  const [setlists, setSetlists] = useState<Setlist[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The state updater runs on the next render, which is too late for an import
  // that has to report what it did. These mirrors are what the writes work from.
  const current = useRef<StoredSong[]>([]);
  const apply = useCallback((next: StoredSong[]) => {
    current.current = next;
    setSongs(next);
  }, []);

  const currentSets = useRef<Setlist[]>([]);
  const applySets = useCallback((next: Setlist[]) => {
    currentSets.current = next;
    setSetlists(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let existing: StoredSong[] = [];
      let storageWorks = true;
      try {
        existing = await loadSongs();
      } catch (e) {
        storageWorks = false;
        setError(e instanceof Error ? e.message : 'The song library could not be opened.');
      }

      // Separately, because a setlist store that won't read is no reason to
      // lose the songs — you can still play, just not to a running order.
      let sets: Setlist[] = [];
      if (storageWorks) {
        try {
          sets = await loadSetlists();
        } catch {
          setError('The setlists could not be read. The songs are all here.');
        }
      }

      // Seed once and only once. Deleting the fixture must not resurrect it at
      // the next launch, but a genuinely first run should not open empty.
      if (existing.length === 0 && !seeded()) {
        existing = mergeSongs([], bundledSongs()).songs;
        if (storageWorks) {
          try {
            await saveSongs(existing);
            markSeeded();
          } catch {
            /* in memory only for this run */
          }
        }
      }

      if (!cancelled) {
        apply(existing);
        applySets(sets);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apply, applySets]);

  const importFiles = useCallback(
    async (files: File[]): Promise<ImportOutcome> => {
      const incoming: BackupSong[] = [];
      const incomingSets: Setlist[] = [];
      const rejected: ImportOutcome['rejected'] = [];
      let prefs: Record<string, string> = {};

      for (const file of files) {
        let text: string;
        try {
          text = await file.text();
        } catch {
          rejected.push({ name: file.name, reason: 'it could not be read' });
          continue;
        }
        const parsed = readImport(file.name, text);
        if (parsed.kind === 'unusable') {
          rejected.push({ name: file.name, reason: parsed.reason });
        } else if (parsed.kind === 'song') {
          incoming.push({ title: parsed.title, text: parsed.text });
        } else {
          incoming.push(...parsed.songs);
          incomingSets.push(...parsed.setlists);
          prefs = { ...prefs, ...parsed.prefs };
        }
      }

      const merged = mergeSongs(current.current, incoming);
      if (incoming.length > 0) {
        apply(merged.songs);
        markSeeded();
        try {
          await saveSongs(merged.songs);
        } catch {
          setError('The songs are loaded but could not be saved to this device.');
        }
      }

      // Restored ahead of the songs they name, which is fine: a setlist entry
      // pointing at a chart that isn't here yet is stepped over rather than
      // being an error, and importing that chart later fills the gap in.
      const mergedSets = mergeSetlists(currentSets.current, incomingSets);
      if (incomingSets.length > 0) {
        applySets(mergedSets.setlists);
        try {
          await saveSetlists(mergedSets.setlists);
        } catch {
          setError('The setlists are loaded but could not be saved to this device.');
        }
      }

      // Written straight to storage: preferences are read at startup, so these
      // land at the next launch rather than yanking the type size out from
      // under whoever is looking at the screen.
      for (const [key, value] of Object.entries(prefs)) {
        try {
          localStorage.setItem(key, value);
        } catch {
          /* private mode — nothing to be done, and nothing worth interrupting for */
        }
      }

      return {
        added: merged.added,
        replaced: merged.replaced,
        setsAdded: mergedSets.added,
        setsReplaced: mergedSets.replaced,
        rejected,
        prefsRestored: Object.keys(prefs).length > 0,
      };
    },
    [apply, applySets],
  );

  // Setlists mentioning this song are deliberately left alone. The entry
  // becomes a gap the pedal steps over, and re-importing the chart fills it
  // back in — which beats quietly editing running orders behind your back.
  const remove = useCallback(
    async (id: string) => {
      apply(current.current.filter((song) => song.id !== id));
      try {
        await deleteSong(id);
      } catch {
        setError('That song left the list but could not be deleted from storage.');
      }
    },
    [apply],
  );

  // One set at a time rather than the whole shelf: editing a running order is a
  // stream of small changes — a move, a removal, another move — and rewriting
  // every set on each of them would be pointless work between songs.
  const saveSet = useCallback(
    async (setlist: Setlist) => {
      const existing = currentSets.current;
      const has = existing.some((s) => s.id === setlist.id);
      applySets(has ? existing.map((s) => (s.id === setlist.id ? setlist : s)) : [...existing, setlist]);
      try {
        await saveSetlists([setlist]);
      } catch {
        setError('That setlist is here but could not be saved to this device.');
      }
    },
    [applySets],
  );

  const removeSet = useCallback(
    async (id: string) => {
      applySets(currentSets.current.filter((s) => s.id !== id));
      try {
        await deleteSetlist(id);
      } catch {
        setError('That setlist left the list but could not be deleted from storage.');
      }
    },
    [applySets],
  );

  return { songs, setlists, error, importFiles, remove, saveSet, removeSet };
}

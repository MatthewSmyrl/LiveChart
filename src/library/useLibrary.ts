import { useCallback, useEffect, useRef, useState } from 'react';
import { readImport, type BackupSong } from './backup';
import { deleteSong, loadSongs, saveSongs } from './db';
import { mergeSongs } from './merge';
import { bundledSongs } from './seed';
import type { StoredSong } from './types';

/** Set once the bundled songs have been offered, so a deletion stays deleted. */
const SEEDED_KEY = 'lc.seeded';

export interface ImportOutcome {
  added: number;
  replaced: number;
  /** Files that were not charts, with the reason, for an honest message. */
  rejected: { name: string; reason: string }[];
  /** True when a backup bundle carried preferences. */
  prefsRestored: boolean;
}

export interface LibraryApi {
  /** Null while loading — distinct from an empty library. */
  songs: StoredSong[] | null;
  /** Storage is unavailable. The app still runs on what is in memory. */
  error: string | null;
  importFiles: (files: File[]) => Promise<ImportOutcome>;
  remove: (id: string) => Promise<void>;
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
  const [error, setError] = useState<string | null>(null);

  // The state updater runs on the next render, which is too late for an import
  // that has to report what it did. This mirror is what the writes work from.
  const current = useRef<StoredSong[]>([]);
  const apply = useCallback((next: StoredSong[]) => {
    current.current = next;
    setSongs(next);
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

      if (!cancelled) apply(existing);
    })();

    return () => {
      cancelled = true;
    };
  }, [apply]);

  const importFiles = useCallback(
    async (files: File[]): Promise<ImportOutcome> => {
      const incoming: BackupSong[] = [];
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
        rejected,
        prefsRestored: Object.keys(prefs).length > 0,
      };
    },
    [apply],
  );

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

  return { songs, error, importFiles, remove };
}

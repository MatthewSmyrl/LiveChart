import type { BackupSong } from './backup';
import { idFor } from './identity';
import type { StoredSong } from './types';

export interface MergeResult {
  songs: StoredSong[];
  added: number;
  replaced: number;
}

/**
 * Folds imported charts into the library, newest text winning.
 *
 * A song is identified by its title, so re-importing a chart you have edited on
 * a computer updates the one you already have rather than leaving two nearly
 * identical entries to choose between mid-set. Identical text is left alone, so
 * restoring a backup you never diverged from does not restamp every song.
 *
 * Pure, and the ordering is stable: existing songs keep their positions and new
 * ones arrive at the end, so the list does not reshuffle under a restore.
 */
export function mergeSongs(
  existing: StoredSong[],
  incoming: BackupSong[],
  now: number = Date.now(),
): MergeResult {
  const byId = new Map(existing.map((song) => [song.id, song]));
  const order = existing.map((song) => song.id);
  let added = 0;
  let replaced = 0;

  for (const song of incoming) {
    const id = idFor(song.title);
    if (!id) continue;
    const current = byId.get(id);

    if (!current) {
      byId.set(id, {
        id,
        title: song.title.trim(),
        text: song.text,
        addedAt: song.addedAt ?? now,
        updatedAt: song.updatedAt ?? now,
      });
      order.push(id);
      added++;
      continue;
    }

    if (current.text === song.text) continue;

    byId.set(id, {
      ...current,
      title: song.title.trim(),
      text: song.text,
      updatedAt: song.updatedAt ?? now,
    });
    replaced++;
  }

  return { songs: order.map((id) => byId.get(id)!), added, replaced };
}

/** Alphabetical by title, which is how you look for a song on a stand. */
export function byTitle(songs: StoredSong[]): StoredSong[] {
  return [...songs].sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
}

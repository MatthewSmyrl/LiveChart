import type { Setlist } from './types';

/**
 * Setlists, and the pure rules for moving around one.
 *
 * A setlist is an ordered list of song ids. Two things about that are
 * deliberate:
 *
 * - **Entries may repeat.** A reprise in the encore is the same song played
 *   twice, so position — not song id — is what identifies where you are.
 * - **Entries may dangle.** Deleting a song from the library, or restoring a
 *   setlist onto a device that hasn't got every chart yet, leaves ids pointing
 *   at nothing. That must never be an error: the set still plays, and the gap
 *   is stepped over rather than opening a blank screen mid-gig.
 *
 * Ids are random rather than derived from the name, so renaming a set is free
 * and two people's "Saturday" sets don't collide when a backup is restored.
 */
export function newSetlistId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Older WebViews, and any non-secure context. Collision only matters within
    // one library, where this is ample.
    return `sl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function newSetlist(name: string, now: number = Date.now(), id = newSetlistId()): Setlist {
  return { id, name: name.trim() || 'Untitled set', songs: [], createdAt: now, updatedAt: now };
}

function stamp(setlist: Setlist, songs: string[], now: number): Setlist {
  return { ...setlist, songs, updatedAt: now };
}

export function renameSetlist(setlist: Setlist, name: string, now: number = Date.now()): Setlist {
  return { ...setlist, name: name.trim() || 'Untitled set', updatedAt: now };
}

/** Appends. Adding a song already in the set is a reprise, not a mistake. */
export function addToSetlist(setlist: Setlist, songId: string, now: number = Date.now()): Setlist {
  return stamp(setlist, [...setlist.songs, songId], now);
}

export function removeAt(setlist: Setlist, index: number, now: number = Date.now()): Setlist {
  if (index < 0 || index >= setlist.songs.length) return setlist;
  return stamp(setlist, setlist.songs.filter((_, i) => i !== index), now);
}

/**
 * Moves one entry by `delta`. Out of range is a no-op rather than a wrap: the
 * ↑ on the first row does nothing, which is what a thumb expects, whereas
 * sending the opener to the end of the night is a nasty surprise.
 */
export function moveBy(setlist: Setlist, index: number, delta: number, now: number = Date.now()): Setlist {
  const to = index + delta;
  const { songs } = setlist;
  if (index < 0 || index >= songs.length || to < 0 || to >= songs.length || delta === 0) return setlist;
  const next = [...songs];
  const [entry] = next.splice(index, 1);
  next.splice(to, 0, entry!);
  return stamp(setlist, next, now);
}

/**
 * The next position to play, stepping over songs the library hasn't got.
 *
 * `from` may be -1, meaning "not in the set" — the case where a song was opened
 * from the library while a setlist happened to be active. Going forward from
 * there starts at the top; going back has nowhere to go.
 *
 * Returns null at either end, which is what parks the pedal instead of wrapping
 * round to the opener after the last chord of the night.
 */
export function stepPosition(
  songs: readonly string[],
  from: number,
  delta: 1 | -1,
  exists: (songId: string) => boolean,
): number | null {
  if (from < 0 && delta === -1) return null;
  for (let i = (from < 0 ? -1 : from) + delta; i >= 0 && i < songs.length; i += delta) {
    if (exists(songs[i]!)) return i;
  }
  return null;
}

/** The first playable position, or null if the whole set is missing. */
export function firstPlayable(songs: readonly string[], exists: (songId: string) => boolean): number | null {
  return stepPosition(songs, -1, 1, exists);
}

/**
 * Folds restored setlists into the ones already here, by id.
 *
 * The later `updatedAt` wins, so restoring an old backup over a set you have
 * since reordered leaves the reordering alone. Existing sets keep their
 * positions and new ones arrive at the end, as with songs.
 */
export function mergeSetlists(
  existing: Setlist[],
  incoming: Setlist[],
): { setlists: Setlist[]; added: number; replaced: number } {
  const byId = new Map(existing.map((s) => [s.id, s]));
  const order = existing.map((s) => s.id);
  let added = 0;
  let replaced = 0;

  for (const set of incoming) {
    const current = byId.get(set.id);
    if (!current) {
      byId.set(set.id, set);
      order.push(set.id);
      added++;
      continue;
    }
    if (set.updatedAt <= current.updatedAt) continue;
    byId.set(set.id, set);
    replaced++;
  }

  return { setlists: order.map((id) => byId.get(id)!), added, replaced };
}

/** Alphabetical, for the same reason the song list is: that is how you look. */
export function byName(setlists: Setlist[]): Setlist[] {
  return [...setlists].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

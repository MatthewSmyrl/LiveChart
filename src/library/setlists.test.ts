import { describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, readImport, serializeBackup } from './backup';
import { idFor } from './identity';
import {
  addToSetlist,
  byName,
  choiceFor,
  firstPlayable,
  mergeSetlists,
  moveBy,
  newSetlist,
  normaliseSetlist,
  pinAt,
  readEntries,
  removeAt,
  renameSetlist,
  stepPosition,
} from './setlists';
import type { SetEntry, Setlist, StoredSong } from './types';

/** Entries pinning nothing, from bare ids. */
const E = (...ids: string[]): SetEntry[] => ids.map((id) => ({ id }));

const set = (ids: string[], over: Partial<Setlist> = {}): Setlist => ({
  id: 'set-1',
  name: 'Saturday',
  songs: E(...ids),
  createdAt: 1000,
  updatedAt: 1000,
  ...over,
});

/** Every id in the list is on the device. */
const all = () => true;
/** Only these are. */
const only =
  (...ids: string[]) =>
  (id: string) =>
    ids.includes(id);

describe('editing a setlist', () => {
  it('names an unnamed set rather than leaving it blank', () => {
    expect(newSetlist('  ').name).toBe('Untitled set');
    expect(renameSetlist(set([]), '   ').name).toBe('Untitled set');
    expect(renameSetlist(set([]), '  Friday  ').name).toBe('Friday');
  });

  // A reprise in the encore is the same song played twice, which is why
  // position rather than song id is what identifies where you are.
  it('allows the same song more than once', () => {
    const s = addToSetlist(addToSetlist(set([]), 'a', 2000), 'b', 2000);
    expect(addToSetlist(s, 'a', 2000).songs.map((e) => e.id)).toEqual(['a', 'b', 'a']);
  });

  it('removes by position, not by song', () => {
    expect(removeAt(set(['a', 'b', 'a']), 0).songs.map((e) => e.id)).toEqual(['b', 'a']);
    expect(removeAt(set(['a']), 5).songs.map((e) => e.id)).toEqual(['a']);
  });

  it('moves an entry up and down', () => {
    expect(moveBy(set(['a', 'b', 'c']), 2, -1).songs.map((e) => e.id)).toEqual(['a', 'c', 'b']);
    expect(moveBy(set(['a', 'b', 'c']), 0, 1).songs.map((e) => e.id)).toEqual(['b', 'a', 'c']);
  });

  // Wrapping would send the opener to the end of the night on a mis-tap.
  it('does nothing at the ends rather than wrapping round', () => {
    expect(moveBy(set(['a', 'b']), 0, -1).songs.map((e) => e.id)).toEqual(['a', 'b']);
    expect(moveBy(set(['a', 'b']), 1, 1).songs.map((e) => e.id)).toEqual(['a', 'b']);
    expect(moveBy(set(['a', 'b']), 9, -1).songs.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('stamps only the edits that changed something', () => {
    expect(moveBy(set(['a', 'b']), 0, 1, 9000).updatedAt).toBe(9000);
    expect(moveBy(set(['a', 'b']), 0, -1, 9000).updatedAt).toBe(1000);
  });
});

describe('moving through a setlist', () => {
  it('steps forward and back', () => {
    expect(stepPosition(E('a', 'b', 'c'), 0, 1, all)).toBe(1);
    expect(stepPosition(E('a', 'b', 'c'), 2, -1, all)).toBe(1);
  });

  // The last chord of the night must not loop back round to the opener.
  it('parks at either end instead of wrapping', () => {
    expect(stepPosition(E('a', 'b'), 1, 1, all)).toBeNull();
    expect(stepPosition(E('a', 'b'), 0, -1, all)).toBeNull();
  });

  // Deleting a song, or restoring a set before its charts, leaves entries
  // pointing at nothing. The set still plays.
  it('steps over songs this device has not got', () => {
    expect(stepPosition(E('a', 'gone', 'c'), 0, 1, only('a', 'c'))).toBe(2);
    expect(stepPosition(E('a', 'gone', 'c'), 2, -1, only('a', 'c'))).toBe(0);
    expect(stepPosition(E('a', 'gone'), 0, 1, only('a'))).toBeNull();
  });

  it('finds the first playable song, skipping a missing opener', () => {
    expect(firstPlayable(E('gone', 'b'), only('b'))).toBe(1);
    expect(firstPlayable(E('gone'), only('b'))).toBeNull();
    expect(firstPlayable(E(), all)).toBeNull();
  });

  // -1 is "the open song is not in this set". Going back from there would be a
  // jump into a running order you had stepped out of.
  it('has no previous song when you are off the set', () => {
    expect(stepPosition(E('a', 'b'), -1, -1, all)).toBeNull();
  });
});

describe('merging restored setlists', () => {
  it('adds a set that is not already here', () => {
    const r = mergeSetlists([set(['a'])], [set(['b'], { id: 'set-2', name: 'Friday' })]);
    expect(r.setlists.map((s) => s.name)).toEqual(['Saturday', 'Friday']);
    expect(r).toMatchObject({ added: 1, replaced: 0 });
  });

  // Restoring last month's backup must not undo a running order you fixed this
  // afternoon.
  it('keeps the newer of two versions of the same set', () => {
    const older = mergeSetlists([set(['a', 'b'], { updatedAt: 5000 })], [set(['a'], { updatedAt: 1000 })]);
    expect(older.setlists[0]!.songs.map((e) => e.id)).toEqual(['a', 'b']);
    expect(older).toMatchObject({ replaced: 0 });

    const newer = mergeSetlists([set(['a', 'b'], { updatedAt: 1000 })], [set(['a'], { updatedAt: 5000 })]);
    expect(newer.setlists[0]!.songs.map((e) => e.id)).toEqual(['a']);
    expect(newer).toMatchObject({ replaced: 1 });
  });

  it('sorts for display without disturbing storage order', () => {
    const sets = [set([], { id: '1', name: 'Two' }), set([], { id: '2', name: 'One' })];
    expect(byName(sets).map((s) => s.name)).toEqual(['One', 'Two']);
    expect(sets.map((s) => s.name)).toEqual(['Two', 'One']);
  });
});

describe('setlists in a backup', () => {
  const stored: StoredSong = {
    id: idFor('One'),
    title: 'One',
    text: 'Title: One\n\n[A]\n|C |\n',
    addedAt: 1000,
    updatedAt: 1000,
  };

  it('round-trips a set with the songs it names', () => {
    const json = serializeBackup([stored], {}, [set([idFor('One'), idFor('One')])]);
    const result = readImport('backup.json', json);
    if (result.kind !== 'backup') throw new Error(`expected a backup, got ${result.kind}`);
    expect(result.setlists).toHaveLength(1);
    expect(result.setlists[0]).toMatchObject({ id: 'set-1', name: 'Saturday' });
    // The reprise survives.
    expect(result.setlists[0]!.songs.map((e) => e.id)).toEqual(['one', 'one']);
  });

  // Backups written before setlists existed have to keep restoring.
  it('reads a version 1 bundle as having no setlists', () => {
    const json = JSON.stringify({
      format: BACKUP_FORMAT,
      version: 1,
      songs: [{ title: 'One', text: stored.text }],
      prefs: {},
    });
    const result = readImport('old.json', json);
    if (result.kind !== 'backup') throw new Error('expected a backup');
    expect(result.setlists).toEqual([]);
    expect(result.songs).toHaveLength(1);
  });

  it('salvages the readable sets from a damaged bundle', () => {
    const json = JSON.stringify({
      format: BACKUP_FORMAT,
      version: 2,
      songs: [],
      setlists: [
        null,
        { name: 'No id' },
        { id: 'ok', songs: ['a', 7, ''], createdAt: 500 },
      ],
      prefs: {},
    });
    const result = readImport('b.json', json);
    if (result.kind !== 'backup') throw new Error('expected a backup');
    expect(result.setlists).toHaveLength(1);
    expect(result.setlists[0]).toMatchObject({ id: 'ok', name: 'Untitled set', songs: [{ id: 'a' }] });
    // No date of its own, so it must lose to anything already on the device.
    expect(result.setlists[0]!.updatedAt).toBe(500);
  });
});

// TRANSPOSITION-PLAN.md §5. The iPad holds real running orders in the old
// shape; a shape change must not be able to eat one.
describe('setlist entries', () => {
  it('reads a set stored as bare ids as entries pinning nothing', () => {
    const stored = { ...set([]), songs: ['a', 'b', 'a'] } as unknown as Setlist;
    expect(normaliseSetlist(stored).songs).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'a' }]);
  });

  it('reads today’s shape, and a mixture, and drops only what has no id', () => {
    expect(readEntries(['a', { id: 'b', key: 'Gb', capo: 2 }, { key: 'C' }, null, '', 7])).toEqual([
      { id: 'a' },
      { id: 'b', key: 'Gb', capo: 2 },
    ]);
  });

  it('drops a pin it cannot read but keeps the entry', () => {
    expect(readEntries([{ id: 'a', key: 'H', capo: 14 }, { id: 'b', key: 'F#m', capo: 1.5 }])).toEqual([
      { id: 'a' },
      { id: 'b' },
    ]);
  });

  it('pins and clears a key and capo at one position only', () => {
    const s = set(['a', 'b', 'a']);
    const pinned = pinAt(s, 2, { key: 'Eb', capo: 3 }, 9000);
    expect(pinned.songs).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'a', key: 'Eb', capo: 3 }]);
    expect(pinned.updatedAt).toBe(9000);
    expect(pinAt(pinned, 2, {}).songs[2]).toEqual({ id: 'a' });
    expect(pinAt(s, 9, { key: 'C' })).toBe(s);
  });

  it('keeps each entry’s pins with it through reorder, removal and adding', () => {
    let s = pinAt(set(['a', 'b', 'c']), 0, { key: 'Bb' });
    s = pinAt(s, 2, { capo: 4 });
    s = moveBy(s, 0, 1);
    expect(s.songs).toEqual([{ id: 'b' }, { id: 'a', key: 'Bb' }, { id: 'c', capo: 4 }]);
    s = removeAt(s, 0);
    expect(s.songs).toEqual([{ id: 'a', key: 'Bb' }, { id: 'c', capo: 4 }]);
    s = addToSetlist(s, 'a');
    expect(s.songs).toEqual([{ id: 'a', key: 'Bb' }, { id: 'c', capo: 4 }, { id: 'a' }]);
  });

  it('turns an entry into a key choice for the chart', () => {
    expect(choiceFor(undefined)).toEqual({});
    expect(choiceFor({ id: 'a' })).toEqual({});
    expect(choiceFor({ id: 'a', key: 'Gb', capo: 0 })).toEqual({ key: { letter: 'G', alter: -1 }, capo: 0 });
  });

  it('restores a version 2 bundle with its ids read as entries', () => {
    const json = JSON.stringify({
      format: BACKUP_FORMAT,
      version: 2,
      songs: [],
      setlists: [{ id: 'old', name: 'Old', songs: ['a', 'b'], createdAt: 1, updatedAt: 1 }],
      prefs: {},
    });
    const result = readImport('v2.json', json);
    if (result.kind !== 'backup') throw new Error('expected a backup');
    expect(result.setlists[0]!.songs).toEqual([{ id: 'a' }, { id: 'b' }]);
  });

  it('writes version 3, and round-trips pinned keys', () => {
    const s = pinAt(set(['a', 'b']), 1, { key: 'F#', capo: 2 });
    const json = serializeBackup([], {}, [s]);
    expect(JSON.parse(json).version).toBe(3);
    const result = readImport('v3.json', json);
    if (result.kind !== 'backup') throw new Error('expected a backup');
    expect(result.setlists[0]!.songs).toEqual([{ id: 'a' }, { id: 'b', key: 'F#', capo: 2 }]);
  });
});

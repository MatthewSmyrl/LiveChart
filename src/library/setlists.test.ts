import { describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, readImport, serializeBackup } from './backup';
import { idFor } from './identity';
import {
  addToSetlist,
  byName,
  firstPlayable,
  mergeSetlists,
  moveBy,
  newSetlist,
  removeAt,
  renameSetlist,
  stepPosition,
} from './setlists';
import type { Setlist, StoredSong } from './types';

const set = (songs: string[], over: Partial<Setlist> = {}): Setlist => ({
  id: 'set-1',
  name: 'Saturday',
  songs,
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
    expect(addToSetlist(s, 'a', 2000).songs).toEqual(['a', 'b', 'a']);
  });

  it('removes by position, not by song', () => {
    expect(removeAt(set(['a', 'b', 'a']), 0).songs).toEqual(['b', 'a']);
    expect(removeAt(set(['a']), 5).songs).toEqual(['a']);
  });

  it('moves an entry up and down', () => {
    expect(moveBy(set(['a', 'b', 'c']), 2, -1).songs).toEqual(['a', 'c', 'b']);
    expect(moveBy(set(['a', 'b', 'c']), 0, 1).songs).toEqual(['b', 'a', 'c']);
  });

  // Wrapping would send the opener to the end of the night on a mis-tap.
  it('does nothing at the ends rather than wrapping round', () => {
    expect(moveBy(set(['a', 'b']), 0, -1).songs).toEqual(['a', 'b']);
    expect(moveBy(set(['a', 'b']), 1, 1).songs).toEqual(['a', 'b']);
    expect(moveBy(set(['a', 'b']), 9, -1).songs).toEqual(['a', 'b']);
  });

  it('stamps only the edits that changed something', () => {
    expect(moveBy(set(['a', 'b']), 0, 1, 9000).updatedAt).toBe(9000);
    expect(moveBy(set(['a', 'b']), 0, -1, 9000).updatedAt).toBe(1000);
  });
});

describe('moving through a setlist', () => {
  it('steps forward and back', () => {
    expect(stepPosition(['a', 'b', 'c'], 0, 1, all)).toBe(1);
    expect(stepPosition(['a', 'b', 'c'], 2, -1, all)).toBe(1);
  });

  // The last chord of the night must not loop back round to the opener.
  it('parks at either end instead of wrapping', () => {
    expect(stepPosition(['a', 'b'], 1, 1, all)).toBeNull();
    expect(stepPosition(['a', 'b'], 0, -1, all)).toBeNull();
  });

  // Deleting a song, or restoring a set before its charts, leaves entries
  // pointing at nothing. The set still plays.
  it('steps over songs this device has not got', () => {
    expect(stepPosition(['a', 'gone', 'c'], 0, 1, only('a', 'c'))).toBe(2);
    expect(stepPosition(['a', 'gone', 'c'], 2, -1, only('a', 'c'))).toBe(0);
    expect(stepPosition(['a', 'gone'], 0, 1, only('a'))).toBeNull();
  });

  it('finds the first playable song, skipping a missing opener', () => {
    expect(firstPlayable(['gone', 'b'], only('b'))).toBe(1);
    expect(firstPlayable(['gone'], only('b'))).toBeNull();
    expect(firstPlayable([], all)).toBeNull();
  });

  // -1 is "the open song is not in this set". Going back from there would be a
  // jump into a running order you had stepped out of.
  it('has no previous song when you are off the set', () => {
    expect(stepPosition(['a', 'b'], -1, -1, all)).toBeNull();
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
    expect(older.setlists[0]!.songs).toEqual(['a', 'b']);
    expect(older).toMatchObject({ replaced: 0 });

    const newer = mergeSetlists([set(['a', 'b'], { updatedAt: 1000 })], [set(['a'], { updatedAt: 5000 })]);
    expect(newer.setlists[0]!.songs).toEqual(['a']);
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
    expect(result.setlists[0]!.songs).toEqual(['one', 'one']);
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
    expect(result.setlists[0]).toMatchObject({ id: 'ok', name: 'Untitled set', songs: ['a'] });
    // No date of its own, so it must lose to anything already on the device.
    expect(result.setlists[0]!.updatedAt).toBe(500);
  });
});

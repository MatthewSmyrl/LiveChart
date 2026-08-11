import { describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, readImport, serializeBackup } from './backup';
import { fileNameFor, idFor, identify, looksLikeChart, titleFor } from './identity';
import { byTitle, mergeSongs } from './merge';
import type { StoredSong } from './types';

const chart = (title: string) => `Title: ${title}\n\n[A]\n|C |\nwords\n`;

const stored = (title: string, text = chart(title), at = 1000): StoredSong => ({
  id: idFor(title),
  title,
  text,
  addedAt: at,
  updatedAt: at,
});

describe('identity', () => {
  it('files a chart under its own Title attribute', () => {
    expect(identify(chart('That Funny Feeling'), 'whatever.lcf').title).toBe('That Funny Feeling');
  });

  // The parser calls a missing Title an error, but still renders the song, and
  // a song you can play beats one the library refused.
  it('falls back to the file name when Title is missing', () => {
    expect(titleFor('[A]\n|C |\n', 'Blue Moon.lcf')).toBe('Blue Moon');
    expect(titleFor('[A]\n|C |\n', '')).toBe('Untitled');
  });

  it('treats titles differing only in case or spacing as the same song', () => {
    expect(idFor('That Funny Feeling')).toBe(idFor('  that   funny feeling  '));
    expect(idFor('A')).not.toBe(idFor('B'));
  });

  it('accepts anything with a header, a section or a chord line', () => {
    expect(looksLikeChart('Title: X')).toBe(true);
    expect(looksLikeChart('[Verse]')).toBe(true);
    expect(looksLikeChart('|C |G |')).toBe(true);
    expect(looksLikeChart('just some prose with no chart in it at all')).toBe(false);
  });

  it('strips characters a file system would refuse', () => {
    expect(fileNameFor('A/B: C?')).toBe('A-B- C-.lcf');
    expect(fileNameFor('  ')).toBe('Untitled.lcf');
  });
});

describe('reading an imported file', () => {
  it('reads a .lcf chart', () => {
    const result = readImport('song.lcf', chart('Blue Moon'));
    expect(result).toMatchObject({ kind: 'song', title: 'Blue Moon' });
  });

  it('round-trips a backup bundle', () => {
    const json = serializeBackup([stored('One'), stored('Two')], { 'lc.step': '0.75' });
    const result = readImport('backup.json', json);
    if (result.kind !== 'backup') throw new Error(`expected a backup, got ${result.kind}`);
    expect(result.songs.map((s) => s.title)).toEqual(['One', 'Two']);
    expect(result.songs[0]!.text).toBe(chart('One'));
    expect(result.prefs).toEqual({ 'lc.step': '0.75' });
  });

  // A bundle is a file from outside the app; it must not be able to write
  // arbitrary keys into localStorage.
  it('keeps only lc.* string preferences out of a bundle', () => {
    const json = JSON.stringify({
      format: BACKUP_FORMAT,
      version: 1,
      songs: [],
      prefs: { 'lc.theme': 'dark', 'evil.key': 'x', 'lc.number': 12 },
    });
    const result = readImport('b.json', json);
    if (result.kind !== 'backup') throw new Error('expected a backup');
    expect(result.prefs).toEqual({ 'lc.theme': 'dark' });
  });

  it('salvages the readable songs from a bundle with damaged entries', () => {
    const json = JSON.stringify({
      format: BACKUP_FORMAT,
      version: 99,
      songs: [{ text: chart('Good') }, null, { title: 'No text' }, { title: 'Blank', text: '  ' }],
      prefs: {},
    });
    const result = readImport('b.json', json);
    if (result.kind !== 'backup') throw new Error('expected a backup');
    expect(result.songs.map((s) => s.title)).toEqual(['Good']);
  });

  it('rejects what is plainly not a chart, with a reason', () => {
    expect(readImport('empty.lcf', '   ')).toMatchObject({ kind: 'unusable' });
    expect(readImport('notes.txt', 'shopping list')).toMatchObject({ kind: 'unusable' });
    expect(readImport('other.json', '{"format":"something-else"}')).toMatchObject({
      kind: 'unusable',
    });
  });
});

describe('merging imports into the library', () => {
  it('adds a song that is not already there', () => {
    const r = mergeSongs([stored('One')], [{ title: 'Two', text: chart('Two') }], 5000);
    expect(r.songs.map((s) => s.title)).toEqual(['One', 'Two']);
    expect(r).toMatchObject({ added: 1, replaced: 0 });
    expect(r.songs[1]).toMatchObject({ addedAt: 5000, updatedAt: 5000 });
  });

  it('replaces a song of the same title, keeping when it was first added', () => {
    const r = mergeSongs([stored('One')], [{ title: 'One', text: 'Title: One\n\n[A]\n|G |\n' }], 5000);
    expect(r.songs).toHaveLength(1);
    expect(r.songs[0]!.text).toContain('|G |');
    expect(r.songs[0]).toMatchObject({ addedAt: 1000, updatedAt: 5000 });
    expect(r).toMatchObject({ added: 0, replaced: 1 });
  });

  it('matches on title regardless of case and spacing', () => {
    const r = mergeSongs([stored('That Funny Feeling')], [
      { title: 'that funny  feeling', text: 'Title: that funny  feeling\n\n[A]\n|G |\n' },
    ]);
    expect(r.songs).toHaveLength(1);
    expect(r).toMatchObject({ replaced: 1 });
  });

  // Restoring a backup you never diverged from should be a no-op, not a
  // wholesale restamp of every song's date.
  it('leaves identical text untouched', () => {
    const r = mergeSongs([stored('One')], [{ title: 'One', text: chart('One') }], 5000);
    expect(r).toMatchObject({ added: 0, replaced: 0 });
    expect(r.songs[0]!.updatedAt).toBe(1000);
  });

  it('keeps existing songs in place and appends new ones', () => {
    const r = mergeSongs(
      [stored('B'), stored('A')],
      [{ title: 'C', text: chart('C') }, { title: 'A', text: 'Title: A\n\n[A]\n|D |\n' }],
    );
    expect(r.songs.map((s) => s.title)).toEqual(['B', 'A', 'C']);
  });

  it('sorts for display without disturbing storage order', () => {
    const songs = [stored('Ten'), stored('Two'), stored('One')];
    expect(byTitle(songs).map((s) => s.title)).toEqual(['One', 'Ten', 'Two']);
    expect(songs.map((s) => s.title)).toEqual(['Ten', 'Two', 'One']);
  });
});

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseLcf, parseTimeSignature, parseToken } from './parse';
import type { ChordToken, LyricLine, Section } from './types';

const song = (src: string) => parseLcf(src);
const lyricsOf = (s: Section): string[] =>
  s.groups.flatMap((g) => g.body.filter((b): b is LyricLine => b.kind === 'lyric').map((b) => b.text));
/** Chord lines in order. A leading comment forms its own chord-less group. */
const chordsOf = (s: Section) => s.groups.flatMap((g) => (g.chords ? [g.chords] : []));

describe('header attributes', () => {
  it('reads known attributes and coerces capo and tempo', () => {
    const r = song('Title: X\nArtist: Y\nKey: E\nCapo: 2nd fret\nTempo: 92 bpm\n\n[A]\n|C |\n');
    expect(r.meta.title).toBe('X');
    expect(r.meta.artist).toBe('Y');
    expect(r.meta.key).toBe('E');
    expect(r.meta.capo).toBe(2);
    expect(r.meta.tempo).toBe(92);
    expect(r.errors).toEqual([]);
  });

  it('defaults to 4/4 and preserves unknown attributes', () => {
    const r = song('Title: X\nTuning: DADGAD\n\n[A]\n|C |\n');
    expect(r.meta.time.raw).toBe('4/4');
    expect(r.meta.extra).toEqual({ tuning: 'DADGAD' });
  });

  it('errors when Title is missing but still parses the song', () => {
    const r = song('[A]\n|C |\n');
    expect(r.errors.some((e) => /Title/.test(e.message))).toBe(true);
    expect(r.sections).toHaveLength(1);
  });

  it('does not mistake a lyric containing a colon for an attribute', () => {
    const r = song('Title: X\n\n[A]\n|C |\nWait: here it comes\n');
    expect(lyricsOf(r.sections[0]!)).toEqual(['Wait: here it comes']);
  });
});

describe('the Lyrics attribute', () => {
  const lyricsDefault = (value: string) =>
    song(`Title: X\nLyrics: ${value}\n\n[A]\n|C |\n`).meta.lyricsDefault;

  it('accepts every spelling of on and off, in any case', () => {
    for (const on of ['on', 'yes', 'true', 'show', '1', 'ON', ' On ']) {
      expect(lyricsDefault(on)).toBe(true);
    }
    for (const off of ['off', 'no', 'false', 'hide', '0', 'OFF', ' Off ']) {
      expect(lyricsDefault(off)).toBe(false);
    }
  });

  it('is undefined when absent, so the app preference stands', () => {
    expect(song('Title: X\n\n[A]\n|C |\n').meta.lyricsDefault).toBeUndefined();
  });

  // A guess here would silently hide the words on stage.
  it('warns and ignores an unrecognised value rather than guessing', () => {
    const r = song('Title: X\nLyrics: sometimes\n\n[A]\n|C |\n');
    expect(r.meta.lyricsDefault).toBeUndefined();
    expect(r.warnings.some((w) => /Lyrics/.test(w.message))).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('is a known attribute, so it stays out of the info panel extras', () => {
    expect(song('Title: X\nLyrics: off\n\n[A]\n|C |\n').meta.extra).toEqual({});
  });
});

describe('time signature', () => {
  it('groups compound metres in threes', () => {
    expect(parseTimeSignature('6/8')?.grouping).toEqual([3, 3]);
    expect(parseTimeSignature('12/8')?.grouping).toEqual([3, 3, 3, 3]);
    expect(parseTimeSignature('7/8')?.grouping).toEqual([4, 3]);
    expect(parseTimeSignature('3/4')?.grouping).toEqual([3]);
  });

  it('rejects nonsense and falls back to 4/4 with a warning', () => {
    expect(parseTimeSignature('common')).toBeNull();
    const r = song('Title: X\nTime: common\n\n[A]\n|C |\n');
    expect(r.meta.time.raw).toBe('4/4');
    expect(r.warnings.some((w) => /time signature/i.test(w.message))).toBe(true);
  });
});

describe('tokens', () => {
  it('parses chords into root, accidental, quality and bass', () => {
    const d = parseToken('D/A', 4) as ChordToken;
    expect(d).toMatchObject({ kind: 'chord', root: 'D', quality: '', bass: 'A' });

    const b = parseToken('Bbmaj9#11', 4) as ChordToken;
    expect(b).toMatchObject({ kind: 'chord', root: 'B', accidental: 'b', quality: 'maj9#11' });

    expect(parseToken('Am7', 4)).toMatchObject({ root: 'A', quality: 'm7' });
  });

  it('recognises rests and no-chord markers', () => {
    expect(parseToken('R', 4).kind).toBe('rest');
    expect(parseToken('N.C.', 4).kind).toBe('nc');
    expect(parseToken('NC', 4).kind).toBe('nc');
  });

  it('keeps unrecognised tokens as literals rather than failing', () => {
    expect(parseToken('stop', 4)).toMatchObject({ kind: 'literal', text: 'stop' });
    const r = song('Title: X\n\n[A]\n|stop |\n');
    expect(r.errors).toEqual([]);
  });
});

describe('bars and rests', () => {
  const barsOf = (src: string) => song(`Title: X\n\n[A]\n${src}\n`).sections[0]!.groups[0]!.chords!.bars;

  it('splits on pipes and marks % as a repeat bar', () => {
    const bars = barsOf('|D/A |% |G |D/A |% |');
    expect(bars).toHaveLength(5);
    expect(bars[1]!.isRepeat).toBe(true);
    expect(bars[0]!.tokens[0]!.text).toBe('D/A');
  });

  it('derives rest duration from beat slots, needing no extra syntax', () => {
    expect(barsOf('|R |')[0]!.tokens[0]!.beats).toBe(4); // whole rest
    expect(barsOf('|D  R|')[0]!.tokens[1]!.beats).toBe(2); // half rest
    expect(barsOf('|D  G  R  R|')[0]!.tokens[3]!.beats).toBe(1); // quarter rest
  });

  it('spreads an uneven split with the remainder on the earlier beats', () => {
    expect(barsOf('|D  G  R|')[0]!.tokens.map((t) => t.beats)).toEqual([2, 1, 1]);
  });

  it('reports a chord line missing its closing pipe', () => {
    const r = song('Title: X\n\n[A]\n|C\n');
    expect(r.errors.some((e) => /closing/.test(e.message))).toBe(true);
  });
});

describe('repeats and comments', () => {
  it('reads xN on a chord line and a trailing comment', () => {
    const cl = song('Title: X\n\n[A]\n|Em |A | x2 -- twice through\n').sections[0]!.groups[0]!.chords!;
    expect(cl.repeat).toBe(2);
    expect(cl.comment).toBe('twice through');
  });

  it('reads xN and a performance note on a section header', () => {
    const s = song('Title: X\n\n[Fade Out] x3 (softly)\n|C |\n').sections[0]!;
    expect(s.repeat).toBe(3);
    expect(s.note).toBe('softly');
    expect(s.rawName).toBe('Fade Out');
  });

  it('treats -- as a comment only at line start, never mid-lyric', () => {
    const s = song('Title: X\n\n[A]\n|C |\n-- a note\nWell--maybe not tonight\n').sections[0]!;
    expect(lyricsOf(s)).toEqual(['Well--maybe not tonight']);
    expect(s.groups[0]!.body.filter((b) => b.kind === 'comment')).toHaveLength(1);
  });

  it('unescapes a lyric that must begin with a literal double dash', () => {
    const s = song('Title: X\n\n[A]\n|C |\n\\-- and then silence\n').sections[0]!;
    expect(lyricsOf(s)).toEqual(['-- and then silence']);
  });
});

describe('grouping', () => {
  it('starts a new group at each chord line and each blank line', () => {
    const s = song('Title: X\n\n[A]\n|C |\none\ntwo\n|G |\nthree\n').sections[0]!;
    expect(s.groups).toHaveLength(2);
    expect(s.groups[0]!.body).toHaveLength(2);
    expect(s.groups[1]!.body).toHaveLength(1);
  });
});

describe('section references', () => {
  const src = [
    'Title: X',
    '',
    '[Verse]',
    '|C |G |',
    'first words',
    '|Am |F |',
    'second words',
    '',
    '[Verse]',
    'new words one',
    '',
    'new words two',
    '',
    '[Verse]',
    '|D |A |',
    'variant words',
  ].join('\n');

  it('classifies definition, lyric-reference and variant', () => {
    const r = song(src);
    expect(r.sections.map((s) => s.role)).toEqual(['definition', 'lyric-reference', 'variant']);
    expect(r.errors).toEqual([]);
  });

  it('reuses the definition chords in order for a lyric-only reference', () => {
    const ref = song(src).sections[1]!;
    expect(ref.groups[0]!.chords!.bars[0]!.tokens[0]!.text).toBe('C');
    expect(ref.groups[1]!.chords!.bars[0]!.tokens[0]!.text).toBe('Am');
    expect(lyricsOf(ref)).toEqual(['new words one', 'new words two']);
  });

  it('does not let a variant overwrite the definition', () => {
    const r = song(`${src}\n\n[Verse]\nfourth words\n`);
    // The 4th Verse must still resolve against the *original* C/G definition.
    expect(r.sections[3]!.groups[0]!.chords!.bars[0]!.tokens[0]!.text).toBe('C');
  });

  it('expands a bare reference to the definition chords and lyrics', () => {
    const r = song('Title: X\n\n[Chorus]\n|C |G |\nsing it\n\n[Chorus]\n');
    const ref = r.sections[1]!;
    expect(ref.role).toBe('reference');
    expect(lyricsOf(ref)).toEqual(['sing it']);
  });

  it('keeps a bare reference bare when a stray comment follows it', () => {
    // The comment sits in [Chorus]'s body but must not demote it to a lyric-reference.
    const r = song('Title: X\n\n[Chorus]\n|C |G |\nsing it\n\n[Chorus]\n-- last time\n\n[Outro]\n|C |\n');
    expect(r.sections[1]!.role).toBe('reference');
    expect(lyricsOf(r.sections[1]!)).toEqual(['sing it']);
  });

  it('errors when a section is referenced before it is defined', () => {
    const r = song('Title: X\n\n[Chorus]\nwords with no chords anywhere\n');
    expect(r.errors.some((e) => /before it is defined/.test(e.message))).toBe(true);
  });

  it('warns and cycles when a reference has more lyric groups than the definition', () => {
    const r = song('Title: X\n\n[V]\n|C |\na\n\n[V]\nb\n\nc\n');
    expect(r.warnings.some((w) => /repeat from the start/.test(w.message))).toBe(true);
  });
});

describe('auto-numbering', () => {
  it('numbers repeated section names', () => {
    const r = song('Title: X\n\n[Verse]\n|C |\na\n\n[Verse]\nb\n');
    expect(r.sections.map((s) => s.displayName)).toEqual(['Verse 1', 'Verse 2']);
  });

  it('leaves a unique name alone', () => {
    const r = song('Title: X\n\n[Intro]\n|C |\n');
    expect(r.sections[0]!.displayName).toBe('Intro');
  });

  it('respects names that already carry their own number', () => {
    const r = song('Title: X\n\n[Verse 1]\n|C |\na\n\n[Verse 2]\n|G |\nb\n');
    expect(r.sections.map((s) => s.displayName)).toEqual(['Verse 1', 'Verse 2']);
  });
});

/**
 * The golden file is a real chart, so it lives in gitignored `songs/local/` and
 * is absent from CI — see the note in `.gitignore`. It is the only test that
 * exercises the parser against a whole song rather than a snippet, so run the
 * suite locally before pushing; CI alone will not catch a regression here.
 */
const GOLDEN = fileURLToPath(new URL('../../songs/local/That Funny Feeling.lcf', import.meta.url));

describe.skipIf(!existsSync(GOLDEN))('golden file: That Funny Feeling', () => {
  const r = parseLcf(existsSync(GOLDEN) ? readFileSync(GOLDEN, 'utf8') : '');

  it('parses with no errors', () => {
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('reads the metadata', () => {
    expect(r.meta).toMatchObject({ title: 'That Funny Feeling', artist: 'Bo Burnham', key: 'E', capo: 2 });
    expect(r.meta.time).toMatchObject({ beats: 4, unit: 4 });
  });

  it('resolves all 16 sections', () => {
    expect(r.sections).toHaveLength(16);
    expect(r.sections.filter((s) => s.name === 'verse')).toHaveLength(5);
    expect(r.sections.filter((s) => s.name === 'pre-chorus')).toHaveLength(5);
    expect(r.sections.filter((s) => s.name === 'chorus')).toHaveLength(3);
  });

  it('gives every section chords once references are resolved', () => {
    for (const s of r.sections) {
      expect(s.groups.some((g) => g.chords), `${s.displayName} has no chords`).toBe(true);
    }
  });

  it('keeps Verse 4 as a 4-bar variant without disturbing Verse 5', () => {
    const verses = r.sections.filter((s) => s.name === 'verse');
    expect(verses[3]!.displayName).toBe('Verse 4');
    expect(verses[3]!.role).toBe('variant');
    expect(chordsOf(verses[3]!)[0]!.bars).toHaveLength(4);
    // Verse 5 must fall back to the original 5-bar definition, not the variant.
    expect(verses[4]!.role).toBe('lyric-reference');
    expect(chordsOf(verses[4]!)[0]!.bars).toHaveLength(5);
  });

  it('keeps the variant note attached ahead of its chords', () => {
    const verse4 = r.sections.filter((s) => s.name === 'verse')[3]!;
    expect(verse4.groups[0]!.chords).toBeUndefined();
    expect(verse4.groups[0]!.body[0]).toMatchObject({ kind: 'comment' });
  });

  it('expands the bare Chorus repeats with their lyrics intact', () => {
    const choruses = r.sections.filter((s) => s.name === 'chorus');
    expect(choruses[1]!.role).toBe('reference');
    expect(lyricsOf(choruses[1]!)).toEqual(lyricsOf(choruses[0]!));
  });

  it('badges the fade out as x3 rather than expanding it', () => {
    const fade = r.sections.at(-1)!;
    expect(fade.rawName).toBe('Fade Out');
    expect(fade.repeat).toBe(3);
    // Two chord lines, stored once. The ×3 is a badge, not three expanded copies.
    expect(chordsOf(fade)).toHaveLength(2);
  });
});

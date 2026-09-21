import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseLcf } from '../lcf/parse';
import type { Song, Token } from '../lcf/types';
import {
  type Note,
  interval,
  keyBelow,
  keyLabel,
  keyName,
  moveNote,
  note,
  noteName,
  parseKey,
  pickerKeys,
} from './notes';
import { resolveKeys, transposeSong, viewSong } from './transpose';

const n = (name: string): Note => note(name[0] as Note['letter'], name[1]);

/** Every token of every chord line, in order, as display text. */
const tokensOf = (song: Song): string[] =>
  song.sections.flatMap((s) =>
    s.groups.flatMap((g) => (g.chords?.bars ?? []).flatMap((b) => b.tokens.map((t) => t.text))),
  );

/** Every root and bass note the chart draws, from the fields the renderer uses. */
const spelledNotesOf = (song: Song): string[] =>
  song.sections.flatMap((s) =>
    s.groups.flatMap((g) =>
      (g.chords?.bars ?? []).flatMap((b) =>
        b.tokens.flatMap((t) =>
          t.kind === 'chord'
            ? [t.root + (t.accidental ?? ''), ...(t.bass ? [t.bass + (t.bassAccidental ?? '')] : [])]
            : [],
        ),
      ),
    ),
  );

/** One accidental at most, and never C♭, F♭, E♯ or B♯. */
const PLAIN_NOTE = /^(?!Cb$|Fb$|E#$|B#$)[A-G][#b]?$/;

const chart = (header: string, line: string) => parseLcf(`Title: T\n${header}\n\n[A]\n${line}\n`);

/** The chords of one line under a key choice. */
const shown = (header: string, line: string, key?: string, capo?: number) =>
  tokensOf(viewSong(chart(header, line), { ...(key ? { key: n(key) } : {}), ...(capo === undefined ? {} : { capo }) }).song);

// ---------------------------------------------------------------------------
// R1.2 — load-bearing. If this goes red, stop.
// ---------------------------------------------------------------------------

describe('the unison invariant', () => {
  const ALL_ROOTS = 'C C# Db D D# Eb E Fb E# F F# Gb G G# Ab A A# Bb B Cb B#'.split(' ');
  const src = `|${ALL_ROOTS.map((r) => `${r}m7/${r} `).join('|')}|`;

  it('renders an untouched chart exactly as its file was written, C♭ and all', () => {
    for (const header of ['Key: C', 'Key: Gb', 'Key: E\nCapo: 2', 'Key: Bbm\nCapo: 5', '']) {
      const song = chart(header, src);
      const view = viewSong(song);
      expect(view.keys.transposed, header).toBe(false);
      expect(view.song, header).toBe(song);
      expect(tokensOf(view.song)).toEqual(ALL_ROOTS.map((r) => `${r}m7/${r}`));
    }
  });

  it('is unison when the choice only restates the file', () => {
    const song = chart('Key: E\nCapo: 2', '|D/A |G |');
    expect(resolveKeys(song, { key: n('E'), capo: 2 }).transposed).toBe(false);
  });

  it('leaves Format Test untouched', () => {
    const path = fileURLToPath(new URL('../../songs/Format Test.lcf', import.meta.url));
    const song = parseLcf(readFileSync(path, 'utf8'));
    expect(viewSong(song).song).toBe(song);
  });
});

// ---------------------------------------------------------------------------
// §1.5, row for row
// ---------------------------------------------------------------------------

describe('the model: Key − Capo', () => {
  const header = 'Key: E\nCapo: 2nd fret';
  const line = '|D/A |G |Em |';

  it.each([
    ['E', 2, 'D', ['D/A', 'G', 'Em']],
    ['E', 0, 'E', ['E/B', 'A', 'F#m']],
    ['D', 0, 'D', ['D/A', 'G', 'Em']],
    ['G', 5, 'D', ['D/A', 'G', 'Em']],
    ['F', 2, 'Eb', ['Eb/Bb', 'Ab', 'Fm']],
    ['Bb', 0, 'Bb', ['Bb/F', 'Eb', 'Cm']],
    ['F#', 0, 'F#', ['F#/C#', 'B', 'G#m']],
    ['Gb', 0, 'Gb', ['Gb/Db', 'B', 'Abm']],
  ] as const)('Key %s, capo %i draws %s shapes', (key, capo, shapes, expected) => {
    const song = chart(header, line);
    const view = viewSong(song, { key: n(key), capo });
    expect(keyLabel(view.keys.shapeKey)).toBe(shapes);
    expect(tokensOf(view.song)).toEqual(expected);
  });

  it('works out the written key from Key and Capo', () => {
    expect(keyLabel(resolveKeys(chart(header, line)).writtenKey)).toBe('D');
  });

  it('treats a missing Key as C', () => {
    expect(shown('', '|C |F |G7 |', 'D')).toEqual(['D', 'G', 'A7']);
  });

  it('treats an unreadable Key as C, with a warning rather than an error', () => {
    const song = chart('Key: sort of E', '|C |');
    expect(song.errors).toEqual([]);
    expect(song.warnings.some((w) => /key/i.test(w.message))).toBe(true);
    expect(tokensOf(viewSong(song, { key: n('D') }).song)).toEqual(['D']);
  });

  it('carries the mode with the key: B♭m up a tone is Cm', () => {
    const keys = resolveKeys(chart('Key: Bbm', '|Bbm |'), { key: n('C') });
    expect(keyLabel(keys.appKey)).toBe('Cm');
  });

  it('clamps capo to 0–11', () => {
    expect(resolveKeys(chart('Key: C', '|C |'), { capo: 14 }).appCapo).toBe(11);
    expect(resolveKeys(chart('Key: C', '|C |'), { capo: -3 }).appCapo).toBe(0);
  });
});

describe('what moves and what does not', () => {
  it('carries the quality verbatim — #11 is not a pitch', () => {
    expect(shown('Key: Bb', '|Bbmaj9#11 |F7(b9,#11) |', 'C')).toEqual(['Cmaj9#11', 'G7(b9,#11)']);
  });

  it('moves slash basses with the root', () => {
    expect(shown('Key: C', '|C/E |F/A |G/B |', 'D')).toEqual(['D/F#', 'G/B', 'A/C#']);
  });

  it('never touches rests, N.C., repeat bars or literals', () => {
    const song = chart('Key: C', '|C  R |N.C. |% |Drums |stop |');
    const moved = viewSong(song, { key: n('E') }).song;
    const bars = moved.sections[0]!.groups[0]!.chords!.bars;
    expect(bars.map((b) => (b.isRepeat ? '%' : b.tokens.map((t: Token) => t.text).join(' ')))).toEqual([
      'E R',
      'N.C.',
      '%',
      'Drums',
      'stop',
    ]);
  });

  it('builds a token the renderer can draw from its fields', () => {
    const [t] = viewSong(chart('Key: C', '|C#m7b5/G# |'), { key: n('Eb') }).song.sections[0]!.groups[0]!.chords!.bars[0]!.tokens;
    expect(t).toMatchObject({ kind: 'chord', root: 'E', quality: 'm7b5', bass: 'B', text: 'Em7b5/B' });
    expect(t).not.toHaveProperty('accidental');
  });

  it('does not mutate the song it was given', () => {
    const song = chart('Key: C', '|C |G |');
    const before = structuredClone(song);
    viewSong(song, { key: n('A') });
    expect(song).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// §2 — spelling
// ---------------------------------------------------------------------------

describe('spelling follows the key', () => {
  it('moves G to B♭ as a minor third: C → E♭, F♯ → A, D → F', () => {
    expect(shown('Key: G', '|C |F# |D |', 'Bb')).toEqual(['Eb', 'A', 'F']);
  });

  it('spells the iii of E as G♯m and the IV of B♭ as E♭', () => {
    expect(shown('Key: C', '|Em |F |', 'E')).toEqual(['G#m', 'A']);
    expect(shown('Key: C', '|Em |F |', 'Bb')).toEqual(['Dm', 'Eb']);
  });

  it('respells every chord when a chart in F♯ is shown in G♭', () => {
    expect(shown('Key: F#', '|F# |B |C# |D#m |G#m7 |', 'Gb')).toEqual(['Gb', 'B', 'Db', 'Ebm', 'Abm7']);
  });

  it('shows the IV of G♭ and the ♭VI of E♭m as B, never C♭', () => {
    expect(shown('Key: C', '|F |', 'Gb')).toEqual(['B']);
    expect(shown('Key: Am', '|F |', 'Eb')).toEqual(['B']);
  });

  it('shows the vii of F♯ and of C♯ as F and C, never E♯ or B♯', () => {
    expect(shown('Key: C', '|Bdim |', 'F#')).toEqual(['Fdim']);
    expect(shown('Key: C', '|Bdim |', 'C#')).toEqual(['Cdim']);
  });

  it('collapses a double sharp to the sharp side in a sharp key', () => {
    // D♯ in C is a ♯II; up an augmented fourth that is G𝄪, which reads as A.
    expect(shown('Key: C', '|D# |', 'F#')).toEqual(['A']);
  });

  it('collapses a double flat to the flat side in a flat key', () => {
    // C to G♭ is a diminished fifth, so A♭ lands on E𝄫 and D♭ on A𝄫.
    expect(shown('Key: C', '|Ab |Bb |Db |', 'Gb')).toEqual(['D', 'E', 'G']);
    expect(shown('Key: G', '|Bb |Eb |', 'Db')).toEqual(['E', 'A']);
  });

  it('never shows a double accidental or C♭/F♭/E♯/B♯, over every key and chromatic root', () => {
    const roots = 'C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B'.split(' ');
    const line = `|${roots.map((r) => `${r}/${r}`).join(' |')} |`;
    for (const from of ['C', 'G', 'F', 'Bb', 'E', 'Gb', 'F#', 'Db', 'Am', 'Ebm']) {
      const minor = from.endsWith('m');
      for (const to of pickerKeys(minor)) {
        const song = viewSong(chart(`Key: ${from}`, line), { key: to }).song;
        for (const name of spelledNotesOf(song)) expect(name, `${from} → ${noteName(to)}`).toMatch(PLAIN_NOTE);
      }
    }
  });

  it('comes back to the original spelling after going up and back down', () => {
    const line = '|G |C |D7 |Em |F#dim |Bm/F# |';
    const up = viewSong(chart('Key: G', line), { key: n('Bb') }).song;
    // Treat the moved chart as if it were a file in B♭, and move it home.
    const back = transposeSong(up, interval(n('Bb'), n('G')), { tonic: n('G'), minor: false });
    expect(tokensOf(back)).toEqual(tokensOf(chart('Key: G', line)));
  });
});

describe('key names', () => {
  it('takes flats except C♯ and F♯, and the lighter minor names', () => {
    const major = Array.from({ length: 12 }, (_, p) => keyLabel(keyName(p, false)));
    const minor = Array.from({ length: 12 }, (_, p) => keyLabel(keyName(p, true)));
    expect(major).toEqual(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']);
    expect(minor).toEqual(['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm']);
  });

  it('offers G♭ and D♭ as well for a major song, and only the table for a minor one', () => {
    expect(pickerKeys(false).map(noteName)).toEqual(
      ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
    );
    expect(pickerKeys(true)).toHaveLength(12);
  });

  it('names a capo-derived shape key from the table: F♯, C♯ and E♭m', () => {
    expect(keyLabel(keyBelow(parseKey('Ab')!, 2))).toBe('F#');
    expect(keyLabel(keyBelow(parseKey('Eb')!, 2))).toBe('C#');
    expect(keyLabel(keyBelow(parseKey('Fm')!, 2))).toBe('Ebm');
  });

  it('keeps the spelling of a key you pick', () => {
    expect(keyLabel(resolveKeys(chart('Key: C', '|C |'), { key: n('Gb') }).shapeKey)).toBe('Gb');
  });

  it('spells a capo-derived written key the way the file does', () => {
    // A G♭-shape chart under a capo: the chords say flats, so the written key is G♭.
    const flats = resolveKeys(chart('Key: Ab\nCapo: 2', '|Gb |Cb |Db |Ebm |'));
    expect(keyLabel(flats.writtenKey)).toBe('Gb');
    const sharps = resolveKeys(chart('Key: Ab\nCapo: 2', '|F# |B |C# |D#m |'));
    expect(keyLabel(sharps.writtenKey)).toBe('F#');
    // And the shapes you get with the capo off are measured from the right letter.
    expect(shown('Key: Ab\nCapo: 2', '|Gb |Db |', undefined, 0)).toEqual(['Ab', 'Eb']);
  });

  it('reads the ways a Key attribute gets written', () => {
    for (const [raw, label] of [
      ['E', 'E'], ['Bb', 'Bb'], ['F#m', 'F#m'], ['C minor', 'Cm'], ['Eb-', 'Ebm'],
      ['A min', 'Am'], ['G major', 'G'], ['B♭', 'Bb'], ['f♯m', 'F#m'],
    ]) {
      expect(keyLabel(parseKey(raw!)!), raw).toBe(label);
    }
    for (const bad of ['H', 'E dorian', '', 'CM', 'somewhere around G']) {
      expect(parseKey(bad), bad).toBeNull();
    }
  });
});

describe('moveNote', () => {
  it('moves letter and pitch together', () => {
    const key = parseKey('Eb')!;
    expect(noteName(moveNote(n('C'), interval(n('C'), n('Eb')), key))).toBe('Eb');
    expect(noteName(moveNote(n('E'), interval(n('C'), n('Eb')), key))).toBe('G');
  });
});

describe('every picker key at every capo', () => {
  const path = fileURLToPath(new URL('../../songs/Format Test.lcf', import.meta.url));
  const LOCAL = fileURLToPath(new URL('../../songs/local/That Funny Feeling.lcf', import.meta.url));
  const sources = [path, ...(existsSync(LOCAL) ? [LOCAL] : [])];

  it('never throws and only ever draws a plainly spelled note', () => {
    for (const file of sources) {
      const song = parseLcf(readFileSync(file, 'utf8'));
      const minor = resolveKeys(song).fileKey.minor;
      for (const key of pickerKeys(minor)) {
        for (let capo = 0; capo < 12; capo++) {
          const view = viewSong(song, { key, capo });
          if (!view.keys.transposed) continue; // unison shows the file, whatever it says
          for (const name of spelledNotesOf(view.song)) expect(name).toMatch(PLAIN_NOTE);
        }
      }
    }
  });
});

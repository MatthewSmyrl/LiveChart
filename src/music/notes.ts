/**
 * Spelled notes, keys and intervals — the core of transposition.
 * See TRANSPOSITION-PLAN.md §2 and §7.
 *
 * Notes are a letter and an alteration, never a bare semitone number. Moving
 * G to B♭ is "up a minor third": two letters and three semitones, applied to
 * every note, which is what makes C land on E♭ rather than D♯. Semitone
 * arithmetic gets every pitch right and every flat key wrong.
 *
 * Pure, no React.
 */

export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

export interface Note {
  letter: Letter;
  /** Semitones from the natural: −1 flat, +1 sharp, ±2 double. */
  alter: number;
}

export interface Key {
  tonic: Note;
  minor: boolean;
}

/** How far every note moves: letters up (0–6) and semitones up (0–11). */
export interface Interval {
  letters: number;
  semitones: number;
}

const LETTERS: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PITCH = [0, 2, 4, 5, 7, 9, 11];
/** Each natural letter's place on the circle of fifths, counted from C. */
const LETTER_FIFTHS: Record<Letter, number> = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 };

const mod = (n: number, m: number): number => ((n % m) + m) % m;
const letterIndex = (l: Letter): number => LETTERS.indexOf(l);

export const UNISON: Interval = { letters: 0, semitones: 0 };

export function isUnison(iv: Interval): boolean {
  return iv.letters === 0 && iv.semitones === 0;
}

export function pitchOf(n: Note): number {
  return mod((NATURAL_PITCH[letterIndex(n.letter)] ?? 0) + n.alter, 12);
}

export function note(letter: Letter, accidental?: string): Note {
  return { letter, alter: accidental === '#' ? 1 : accidental === 'b' ? -1 : 0 };
}

/** ASCII spelling, as a chart file writes it: `Bb`, `F#`. */
export function noteName(n: Note): string {
  return n.letter + (n.alter > 0 ? '#'.repeat(n.alter) : 'b'.repeat(-n.alter));
}

export function sameNote(a: Note, b: Note): boolean {
  return a.letter === b.letter && a.alter === b.alter;
}

export function sameKey(a: Key, b: Key): boolean {
  return a.minor === b.minor && sameNote(a.tonic, b.tonic);
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const KEY_RE = /^([A-Ga-g])\s*([#♯b♭])?\s*(m|min|minor|-|maj|major)?$/i;

/**
 * Reads a `Key:` value: `E`, `Bb`, `F#m`, `C minor`, `Eb-`. Null when it is
 * not a key, which the parser turns into a warning (R1.7).
 */
export function parseKey(raw: string): Key | null {
  const m = KEY_RE.exec(raw.trim());
  if (!m) return null;
  const mode = m[3] ?? '';
  // `M` alone would read as minor under the case-insensitive match; in chord
  // vocabulary it means major, so refuse it rather than guess.
  if (mode === 'M') return null;
  const acc = m[2] === '♯' ? '#' : m[2] === '♭' ? 'b' : m[2];
  return {
    tonic: note((m[1] ?? 'C').toUpperCase() as Letter, acc),
    minor: mode !== '' && !/^maj/i.test(mode),
  };
}

/** Key names by pitch — the table in §2.1. Flats, except C♯ and F♯. */
const MAJOR_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
/** Not the major row plus `m`: C♯m, G♯m, B♭m and E♭m each take the lighter name. */
const MINOR_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

function fromName(name: string): Note {
  return note(name[0] as Letter, name[1]);
}

/** The name a key gets whenever the app has to name one (R2.3). */
export function keyName(pitch: number, minor: boolean): Key {
  const names = minor ? MINOR_KEYS : MAJOR_KEYS;
  return { tonic: fromName(names[mod(pitch, 12)] ?? 'C'), minor };
}

/**
 * What the key picker offers: the table, plus G♭ and D♭ for a major song —
 * real keys with a real alternative spelling, so the choice is the player's.
 */
export function pickerKeys(minor: boolean): Note[] {
  const names = minor
    ? MINOR_KEYS
    : ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  return names.map(fromName);
}

/** `Bb`, `F#m`. */
export function keyLabel(k: Key): string {
  return noteName(k.tonic) + (k.minor ? 'm' : '');
}

/** Sharps positive, flats negative. */
export function keySignature(k: Key): number {
  return LETTER_FIFTHS[k.tonic.letter] + 7 * k.tonic.alter - (k.minor ? 3 : 0);
}

/** The key a capo turns into shapes: `k` down `capo` semitones, named per the table. */
export function keyBelow(k: Key, capo: number): Key {
  if (mod(capo, 12) === 0) return k;
  return keyName(pitchOf(k.tonic) - capo, k.minor);
}

// ---------------------------------------------------------------------------
// Intervals
// ---------------------------------------------------------------------------

export function interval(from: Note, to: Note): Interval {
  return {
    letters: mod(letterIndex(to.letter) - letterIndex(from.letter), 7),
    semitones: mod(pitchOf(to) - pitchOf(from), 12),
  };
}

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** A pitch with one accidental at most, on the key's side (R2.7). */
function plainSpelling(pitch: number, key: Key): Note {
  const side = keySignature(key);
  const names = side > 0 ? SHARP_NAMES : side < 0 ? FLAT_NAMES : MAJOR_KEYS;
  return fromName(names[mod(pitch, 12)] ?? 'C');
}

/** C♭, F♭, E♯ and B♯ are correct on paper and unwanted on a gig (R2.8). */
function plainWhiteKey(n: Note): Note {
  if (n.alter === -1 && (n.letter === 'C' || n.letter === 'F')) {
    return { letter: n.letter === 'C' ? 'B' : 'E', alter: 0 };
  }
  if (n.alter === 1 && (n.letter === 'E' || n.letter === 'B')) {
    return { letter: n.letter === 'E' ? 'F' : 'C', alter: 0 };
  }
  return n;
}

/**
 * Moves a note by a spelled interval — letter and pitch both (R2.5) — then
 * tidies what nobody wants to read: double accidentals (R2.7) and C♭, F♭, E♯,
 * B♯ (R2.8). `key` is the key being moved into, which picks the side a double
 * accidental collapses to.
 *
 * Never call this at unison: an untouched chart shows its file verbatim, C♭
 * included (R2.9). `transposeSong` guarantees that.
 */
export function moveNote(n: Note, iv: Interval, key: Key): Note {
  const idx = mod(letterIndex(n.letter) + iv.letters, 7);
  const letter = LETTERS[idx] ?? 'C';
  const pitch = pitchOf(n) + iv.semitones;
  const alter = mod(pitch - (NATURAL_PITCH[idx] ?? 0) + 6, 12) - 6;
  const moved = Math.abs(alter) >= 2 ? plainSpelling(pitch, key) : { letter, alter };
  return plainWhiteKey(moved);
}

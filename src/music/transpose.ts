/**
 * The chart under a key and capo. See TRANSPOSITION-PLAN.md §1 and §3.
 *
 * The chart draws `Key − Capo`: the shapes your hands make. A file's chords are
 * written in `fileKey − fileCapo`; they are drawn in `appKey − appCapo`; every
 * chord moves by the spelled interval between the two.
 *
 * Pure, no React. `ChartView` receives an already-transposed `Song` and does
 * not know transposition exists.
 */
import type { ChordToken, Song, Token } from '../lcf/types';
import {
  type Interval,
  type Key,
  type Note,
  UNISON,
  interval,
  isUnison,
  keyBelow,
  moveNote,
  note,
  noteName,
  parseKey,
  pitchOf,
  sameKey,
} from './notes';

/** Overrides in force — from the toolbar, or pinned on a setlist entry. */
export interface KeyChoice {
  /** The sounding key's root only. Mode always comes from the file (R1.8). */
  key?: Note;
  capo?: number;
}

export interface KeyState {
  /** `Key:`, or C when the file says nothing or says something unreadable. */
  fileKey: Key;
  fileCapo: number;
  /** What the chords are literally typed in: `fileKey − fileCapo`. */
  writtenKey: Key;
  /** The sounding key now in force. */
  appKey: Key;
  appCapo: number;
  /** What gets drawn: `appKey − appCapo`. */
  shapeKey: Key;
  interval: Interval;
  /** Not at unison — the chart must say so (R4.6). */
  transposed: boolean;
}

const C_MAJOR: Key = { tonic: { letter: 'C', alter: 0 }, minor: false };

const clampCapo = (n: number): number => (Number.isFinite(n) ? Math.min(11, Math.max(0, Math.round(n))) : 0);

/**
 * A written key derived through a capo onto one of the three pitches with two
 * common names is spelled the way the file's own chords are (R2.4) —
 * otherwise every interval is measured from the wrong letter. A tie keeps the
 * table's name.
 */
function spellLikeTheFile(derived: Key, song: Song): Key {
  const p = pitchOf(derived.tonic);
  const ambiguous = derived.minor ? p === 3 : p === 1 || p === 6;
  if (!ambiguous) return derived;

  let sharps = 0;
  let flats = 0;
  for (const s of song.sections) {
    for (const g of s.groups) {
      for (const bar of g.chords?.bars ?? []) {
        for (const t of bar.tokens) {
          if (t.kind !== 'chord') continue;
          for (const acc of [t.accidental, t.bassAccidental]) {
            if (acc === '#') sharps += 1;
            if (acc === 'b') flats += 1;
          }
        }
      }
    }
  }
  if (sharps === flats) return derived;
  const letters = flats > sharps ? { 1: 'D', 3: 'E', 6: 'G' } : { 1: 'C', 3: 'D', 6: 'F' };
  const letter = letters[p as 1 | 3 | 6] as Note['letter'];
  return { tonic: { letter, alter: flats > sharps ? -1 : 1 }, minor: derived.minor };
}

/** Resolves the keys in force, in the precedence of §3: choice over file. */
export function resolveKeys(song: Song, choice: KeyChoice = {}): KeyState {
  const fileKey = (song.meta.key && parseKey(song.meta.key)) || C_MAJOR;
  const fileCapo = clampCapo(song.meta.capo ?? 0);
  const writtenKey = fileCapo === 0 ? fileKey : spellLikeTheFile(keyBelow(fileKey, fileCapo), song);

  const appKey: Key = choice.key ? { tonic: choice.key, minor: fileKey.minor } : fileKey;
  const appCapo = choice.capo === undefined ? fileCapo : clampCapo(choice.capo);

  // A key you pick keeps its spelling (R2.2); one derived through a capo is
  // named by the table (R2.3) — unless it lands on the written key's pitch,
  // where the shapes haven't changed and neither should their spelling.
  let shapeKey = keyBelow(appKey, appCapo);
  if (appCapo !== 0 && pitchOf(shapeKey.tonic) === pitchOf(writtenKey.tonic)) shapeKey = writtenKey;

  const iv = sameKey(writtenKey, shapeKey) ? UNISON : interval(writtenKey.tonic, shapeKey.tonic);
  return { fileKey, fileCapo, writtenKey, appKey, appCapo, shapeKey, interval: iv, transposed: !isUnison(iv) };
}

/** A chord moved root and bass; its quality carried verbatim (R1.4, R1.5). */
export function transposeToken(token: Token, iv: Interval, key: Key): Token {
  if (token.kind !== 'chord' || isUnison(iv)) return token;

  const root = moveNote(note(token.root as Note['letter'], token.accidental), iv, key);
  const bass = token.bass ? moveNote(note(token.bass as Note['letter'], token.bassAccidental), iv, key) : undefined;
  const acc = (n: Note): '#' | 'b' | undefined => (n.alter > 0 ? '#' : n.alter < 0 ? 'b' : undefined);

  const moved: ChordToken = {
    kind: 'chord',
    text: noteName(root) + token.quality + (bass ? `/${noteName(bass)}` : ''),
    beats: token.beats,
    root: root.letter,
    quality: token.quality,
  };
  const rootAcc = acc(root);
  if (rootAcc) moved.accidental = rootAcc;
  if (bass) {
    moved.bass = bass.letter;
    const bassAcc = acc(bass);
    if (bassAcc) moved.bassAccidental = bassAcc;
  }
  return moved;
}

/**
 * The whole song with every chord moved into `shapeKey`. At unison it returns
 * the very same song, so an untouched chart renders exactly as its file was
 * written (R1.2) — the invariant every spelling rule relies on.
 */
export function transposeSong(song: Song, iv: Interval, shapeKey: Key): Song {
  if (isUnison(iv)) return song;
  return {
    ...song,
    sections: song.sections.map((s) => ({
      ...s,
      groups: s.groups.map((g) =>
        g.chords
          ? {
              ...g,
              chords: {
                ...g.chords,
                bars: g.chords.bars.map((b) => ({
                  ...b,
                  tokens: b.tokens.map((t) => transposeToken(t, iv, shapeKey)),
                })),
              },
            }
          : g,
      ),
    })),
  };
}

/** The song as it should be drawn under `choice`, with the keys that produced it. */
export function viewSong(song: Song, choice: KeyChoice = {}): { song: Song; keys: KeyState } {
  const keys = resolveKeys(song, choice);
  return { song: transposeSong(song, keys.interval, keys.shapeKey), keys };
}

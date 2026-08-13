/**
 * Type model for the LiveChart Format (LCF).
 * See docs/lcf-format.md — this file is the executable counterpart of that document.
 */

export interface TimeSignature {
  /** Numerator — beat slots per bar. */
  beats: number;
  /** Denominator — the note value that gets the beat. */
  unit: number;
  /** Beat grouping, e.g. [3, 3] for 6/8, [4] for 4/4. */
  grouping: number[];
  raw: string;
}

export interface SongMeta {
  title: string;
  artist?: string;
  key?: string;
  /** Fret number. `2` and `2nd fret` both parse to 2. */
  capo?: number;
  time: TimeSignature;
  tempo?: number;
  notes?: string;
  /**
   * Whether lyrics are shown when this song opens. Undefined when the file says
   * nothing, in which case the app's saved preference stands.
   */
  lyricsDefault?: boolean;
  /** Any attribute we don't know about, preserved for the info panel. */
  extra: Record<string, string>;
}

export type TokenKind = 'chord' | 'rest' | 'nc' | 'literal';

interface TokenBase {
  kind: TokenKind;
  /** Verbatim source text. */
  text: string;
  /** Beat slots this token occupies within its bar. Drives rest glyph choice. */
  beats: number;
}

export interface ChordToken extends TokenBase {
  kind: 'chord';
  root: string;
  accidental?: '#' | 'b';
  /** Quality/extension, e.g. `m7`, `maj9#11`. Empty for a bare major triad. */
  quality: string;
  /** Bass note of a slash chord, e.g. `A` in `D/A`. */
  bass?: string;
  bassAccidental?: '#' | 'b';
}

export interface RestToken extends TokenBase {
  kind: 'rest';
}
export interface NoChordToken extends TokenBase {
  kind: 'nc';
}
/** Anything unrecognised. Never fails the parse; rendered dimmed. */
export interface LiteralToken extends TokenBase {
  kind: 'literal';
}

export type Token = ChordToken | RestToken | NoChordToken | LiteralToken;

export interface Bar {
  tokens: Token[];
  /** True for a `%` bar — repeat the previous bar. */
  isRepeat: boolean;
}

export interface ChordLine {
  kind: 'chords';
  bars: Bar[];
  /** `xN` trailing the line. 1 when absent. */
  repeat: number;
  comment?: string;
  /** 1-based source line number. */
  line: number;
}

export interface LyricLine {
  kind: 'lyric';
  text: string;
  line: number;
}

export interface CommentLine {
  kind: 'comment';
  text: string;
  line: number;
}

export type BodyLine = LyricLine | CommentLine;

/**
 * A chord line plus the lyric/comment lines it governs, up to the next chord
 * line, blank line, or end of section.
 *
 * Groups are also the scroll-snap boundaries in performance mode — this is what
 * stops a page turn from separating a chord line from its lyrics.
 */
export interface Group {
  chords?: ChordLine;
  body: BodyLine[];
}

export type SectionRole =
  /** First occurrence, carries chord lines. */
  | 'definition'
  /** Bare repeat — reuses the definition's chords *and* lyrics. */
  | 'reference'
  /** Reuses the definition's chords with new lyrics. */
  | 'lyric-reference'
  /** Later occurrence that carries its own chord lines. Stands alone. */
  | 'variant';

export interface Section {
  /** Normalised name used for definition lookup. */
  name: string;
  /** Name as written. */
  rawName: string;
  /** Name with auto-numbering applied, e.g. `Verse 2`. */
  displayName: string;
  /** Occurrence index (1-based) among sections sharing this name. */
  occurrence: number;
  /** Total occurrences of this name in the song. */
  occurrenceCount: number;
  /** Performance direction from `(...)`, e.g. `softly`. */
  note?: string;
  /** `xN` on the header. 1 when absent. Rendered as a badge, not expanded. */
  repeat: number;
  role: SectionRole;
  /** Fully resolved — references already have their chords filled in. */
  groups: Group[];
  line: number;
}

export interface ParseIssue {
  line: number;
  message: string;
}

export interface Song {
  meta: SongMeta;
  sections: Section[];
  /** Recoverable problems. The song is still displayable. */
  warnings: ParseIssue[];
  /** Unrecoverable problems, surfaced in the import view. */
  errors: ParseIssue[];
}

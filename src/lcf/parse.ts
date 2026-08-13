/**
 * LCF parser — see docs/lcf-format.md.
 *
 * Contract: this module is pure and never throws on malformed input. Problems
 * are reported as `song.errors` / `song.warnings` so the import view can show
 * them, because a chart that half-renders is more useful mid-gig than a blank
 * screen.
 */
import type {
  Bar,
  BodyLine,
  ChordLine,
  Group,
  ParseIssue,
  Section,
  SectionRole,
  Song,
  SongMeta,
  TimeSignature,
  Token,
} from './types';

const DEFAULT_TIME: TimeSignature = { beats: 4, unit: 4, grouping: [4], raw: '4/4' };

/** Root, optional accidental, quality/extension, optional slash bass. */
const CHORD_RE = /^([A-G])(#|b)?([^/\s]*)(?:\/([A-G])(#|b)?)?$/;
const SECTION_RE = /^\[([^\]]*)\]\s*(.*)$/;
const REPEAT_RE = /^x\s*(\d+)$/i;

// ---------------------------------------------------------------------------
// Header attributes
// ---------------------------------------------------------------------------

/**
 * Reads a yes/no attribute value. Null when it means neither, which the caller
 * turns into a warning rather than a guess — silently choosing for the player
 * is how a chart ends up wrong on stage.
 */
export function parseFlag(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (['on', 'yes', 'true', 'show', '1'].includes(v)) return true;
  if (['off', 'no', 'false', 'hide', '0'].includes(v)) return false;
  return null;
}

/** Compound metres group in threes; 5/8 and 7/8 get conventional defaults. */
function groupingFor(beats: number, unit: number): number[] {
  if (unit === 8) {
    if (beats % 3 === 0) return Array<number>(beats / 3).fill(3);
    if (beats === 5) return [3, 2];
    if (beats === 7) return [4, 3];
  }
  return [beats];
}

export function parseTimeSignature(raw: string): TimeSignature | null {
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(raw);
  if (!m) return null;
  const beats = Number(m[1]);
  const unit = Number(m[2]);
  if (!beats || !unit) return null;
  return { beats, unit, grouping: groupingFor(beats, unit), raw: `${beats}/${unit}` };
}

// ---------------------------------------------------------------------------
// Tokens and bars
// ---------------------------------------------------------------------------

/** Spread `total` beats over `n` tokens, remainder to the earlier tokens. */
function distributeBeats(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const rem = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

export function parseToken(text: string, beats: number): Token {
  if (text === 'R' || text === 'r') return { kind: 'rest', text, beats };

  // `N.C.`, `NC`, `n.c.` all mean no chord.
  if (text.replace(/\./g, '').toUpperCase() === 'NC') {
    return { kind: 'nc', text, beats };
  }

  const m = CHORD_RE.exec(text);
  if (m) {
    const accidental = m[2] as '#' | 'b' | undefined;
    const bassAccidental = m[5] as '#' | 'b' | undefined;
    return {
      kind: 'chord',
      text,
      beats,
      root: m[1] ?? '',
      ...(accidental ? { accidental } : {}),
      quality: m[3] ?? '',
      ...(m[4] ? { bass: m[4] } : {}),
      ...(bassAccidental ? { bassAccidental } : {}),
    };
  }

  // Unrecognised tokens survive as literals rather than failing the parse.
  return { kind: 'literal', text, beats };
}

function parseBar(segment: string, time: TimeSignature): Bar {
  const parts = segment.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1 && parts[0] === '%') {
    return { tokens: [], isRepeat: true };
  }
  const beats = distributeBeats(time.beats, parts.length);
  return {
    tokens: parts.map((p, i) => parseToken(p, beats[i] ?? 0)),
    isRepeat: false,
  };
}

function parseChordLine(
  raw: string,
  line: number,
  time: TimeSignature,
  errors: ParseIssue[],
  warnings: ParseIssue[],
): ChordLine | null {
  const t = raw.trim();
  const lastPipe = t.lastIndexOf('|');
  if (lastPipe === 0) {
    errors.push({ line, message: 'Chord line needs both an opening and a closing "|".' });
    return null;
  }

  let trailer = t.slice(lastPipe + 1).trim();
  let comment: string | undefined;
  const commentAt = trailer.indexOf('--');
  if (commentAt >= 0) {
    comment = trailer.slice(commentAt + 2).trim();
    trailer = trailer.slice(0, commentAt).trim();
  }

  let repeat = 1;
  if (trailer) {
    const m = REPEAT_RE.exec(trailer);
    if (m) {
      repeat = Math.max(1, Number(m[1]));
    } else {
      warnings.push({ line, message: `Ignored unrecognised text after the last "|": "${trailer}"` });
    }
  }

  const bars = t
    .slice(1, lastPipe)
    .split('|')
    .map((seg) => parseBar(seg, time));

  return {
    kind: 'chords',
    bars,
    repeat,
    ...(comment ? { comment } : {}),
    line,
  };
}

// ---------------------------------------------------------------------------
// Section headers
// ---------------------------------------------------------------------------

interface SectionHeader {
  rawName: string;
  note?: string;
  repeat: number;
}

function parseSectionHeader(raw: string): SectionHeader | null {
  const m = SECTION_RE.exec(raw.trim());
  if (!m) return null;

  let rest = (m[2] ?? '').trim();
  const commentAt = rest.indexOf('--');
  if (commentAt >= 0) rest = rest.slice(0, commentAt).trim();

  let note: string | undefined;
  const noteMatch = /\(([^)]*)\)/.exec(rest);
  if (noteMatch) {
    note = (noteMatch[1] ?? '').trim();
    rest = rest.replace(noteMatch[0], ' ').trim();
  }

  let repeat = 1;
  const repeatMatch = REPEAT_RE.exec(rest);
  if (repeatMatch) repeat = Math.max(1, Number(repeatMatch[1]));

  return { rawName: (m[1] ?? '').trim(), ...(note ? { note } : {}), repeat };
}

/** Case-insensitive, whitespace-normalised key used for definition lookup. */
function normaliseName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

interface SourceLine {
  text: string;
  line: number;
}

/** A comment only at line start — never mid-lyric. See docs/lcf-format.md, "Comments". */
function isCommentLine(trimmed: string): boolean {
  return trimmed.startsWith('--');
}

function unescapeLyric(trimmed: string): string {
  return trimmed.startsWith('\\--') ? trimmed.slice(1) : trimmed;
}

function buildGroups(
  body: SourceLine[],
  time: TimeSignature,
  errors: ParseIssue[],
  warnings: ParseIssue[],
): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;

  const flush = (): void => {
    if (current && (current.chords || current.body.length > 0)) groups.push(current);
    current = null;
  };

  for (const { text, line } of body) {
    const trimmed = text.trim();

    if (!trimmed) {
      flush(); // blank line = phrase break = group boundary
      continue;
    }

    if (isCommentLine(trimmed)) {
      if (!current) current = { body: [] };
      current.body.push({ kind: 'comment', text: trimmed.slice(2).trim(), line });
      continue;
    }

    if (trimmed.startsWith('|')) {
      flush();
      const chords = parseChordLine(trimmed, line, time, errors, warnings);
      current = chords ? { chords, body: [] } : { body: [] };
      continue;
    }

    if (!current) current = { body: [] };
    current.body.push({ kind: 'lyric', text: unescapeLyric(trimmed), line });
  }

  flush();
  return groups;
}

function cloneGroup(g: Group): Group {
  return structuredClone(g);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

interface RawSection {
  header: SectionHeader;
  body: SourceLine[];
  line: number;
}

export function parseLcf(source: string): Song {
  const errors: ParseIssue[] = [];
  const warnings: ParseIssue[] = [];
  const lines = source.replace(/\r\n?/g, '\n').split('\n');

  // --- Pass 1: split header attributes from raw sections ---------------------
  const attributes = new Map<string, string>();
  const rawSections: RawSection[] = [];
  let currentRaw: RawSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i] ?? '';
    const trimmed = text.trim();
    const lineNo = i + 1;

    if (trimmed.startsWith('[')) {
      const header = parseSectionHeader(trimmed);
      if (header) {
        currentRaw = { header, body: [], line: lineNo };
        rawSections.push(currentRaw);
        continue;
      }
      // Unclosed bracket — fall through and treat as an ordinary line.
      warnings.push({ line: lineNo, message: 'Line starts with "[" but has no closing "]".' });
    }

    if (currentRaw) {
      currentRaw.body.push({ text, line: lineNo });
      continue;
    }

    // Still in the header block.
    if (!trimmed || isCommentLine(trimmed)) continue;
    const colon = trimmed.indexOf(':');
    if (colon > 0) {
      const name = trimmed.slice(0, colon).trim().toLowerCase();
      attributes.set(name, trimmed.slice(colon + 1).trim());
    } else {
      warnings.push({ line: lineNo, message: `Ignored line before the first section: "${trimmed}"` });
    }
  }

  // --- Metadata --------------------------------------------------------------
  const known = new Set(['title', 'artist', 'key', 'capo', 'time', 'tempo', 'notes', 'lyrics']);
  const extra: Record<string, string> = {};
  for (const [k, v] of attributes) if (!known.has(k)) extra[k] = v;

  const timeRaw = attributes.get('time');
  let time = DEFAULT_TIME;
  if (timeRaw) {
    const parsed = parseTimeSignature(timeRaw);
    if (parsed) time = parsed;
    else warnings.push({ line: 0, message: `Unrecognised time signature "${timeRaw}"; using 4/4.` });
  }

  const lyricsRaw = attributes.get('lyrics');
  let lyricsDefault: boolean | undefined;
  if (lyricsRaw !== undefined) {
    const flag = parseFlag(lyricsRaw);
    if (flag === null) {
      warnings.push({
        line: 0,
        message: `Unrecognised Lyrics value "${lyricsRaw}"; expected on or off.`,
      });
    } else {
      lyricsDefault = flag;
    }
  }

  const capoRaw = attributes.get('capo');
  const capoMatch = capoRaw ? /\d+/.exec(capoRaw) : null;
  const tempoRaw = attributes.get('tempo');
  const tempoMatch = tempoRaw ? /\d+/.exec(tempoRaw) : null;

  const title = attributes.get('title');
  if (!title) errors.push({ line: 0, message: 'Missing required attribute "Title".' });

  const meta: SongMeta = {
    title: title ?? 'Untitled',
    ...(attributes.get('artist') ? { artist: attributes.get('artist') } : {}),
    ...(attributes.get('key') ? { key: attributes.get('key') } : {}),
    ...(capoMatch ? { capo: Number(capoMatch[0]) } : {}),
    time,
    ...(tempoMatch ? { tempo: Number(tempoMatch[0]) } : {}),
    ...(attributes.get('notes') ? { notes: attributes.get('notes') } : {}),
    ...(lyricsDefault === undefined ? {} : { lyricsDefault }),
    extra,
  };

  // --- Pass 2: build groups, assign roles, resolve references ----------------
  const definitions = new Map<string, Group[]>();
  const sections: Section[] = [];

  for (const raw of rawSections) {
    const name = normaliseName(raw.header.rawName);
    const ownGroups = buildGroups(raw.body, time, errors, warnings);
    const hasChords = ownGroups.some((g) => g.chords);
    // Emptiness is judged on lyrics, not on body lines: a stray comment sitting
    // between two section headers belongs to the earlier section's body, and
    // must not demote a bare `[Chorus]` repeat into a lyric-reference.
    const hasLyrics = ownGroups.some((g) => g.body.some((b) => b.kind === 'lyric'));
    const definition = definitions.get(name);

    let role: SectionRole;
    let groups: Group[];

    if (!definition) {
      if (!hasChords) {
        errors.push({
          line: raw.line,
          message: `Section "${raw.header.rawName}" is used before it is defined with chords.`,
        });
      }
      role = 'definition';
      groups = ownGroups;
      definitions.set(name, ownGroups);
    } else if (hasChords) {
      // A later occurrence carrying chords is a variant; it must not clobber
      // the definition, or every subsequent reference would silently change.
      role = 'variant';
      groups = ownGroups;
    } else if (!hasLyrics) {
      // Bare repeat. Any comment-only groups it carries are kept in front.
      role = 'reference';
      groups = [...ownGroups, ...definition.map(cloneGroup)];
    } else {
      role = 'lyric-reference';
      const chordGroups = definition.filter((g) => g.chords);
      if (chordGroups.length === 0) {
        groups = ownGroups;
      } else {
        const lyricGroups = ownGroups.filter((g) => g.body.some((b) => b.kind === 'lyric'));
        if (lyricGroups.length > chordGroups.length) {
          warnings.push({
            line: raw.line,
            message:
              `"${raw.header.rawName}" has ${lyricGroups.length} lyric groups but its definition ` +
              `has ${chordGroups.length} chord groups; chords will repeat from the start.`,
          });
        }
        let idx = 0;
        groups = ownGroups.map((g) => {
          if (!g.body.some((b) => b.kind === 'lyric')) return g;
          const src = chordGroups[idx % chordGroups.length];
          idx += 1;
          const body: BodyLine[] = g.body;
          return src?.chords ? { chords: structuredClone(src.chords), body } : { body };
        });
      }
    }

    sections.push({
      name,
      rawName: raw.header.rawName,
      displayName: raw.header.rawName, // filled in below
      occurrence: 0,
      occurrenceCount: 0,
      ...(raw.header.note ? { note: raw.header.note } : {}),
      repeat: raw.header.repeat,
      role,
      groups,
      line: raw.line,
    });
  }

  // --- Pass 3: auto-numbering ------------------------------------------------
  const totals = new Map<string, number>();
  for (const s of sections) totals.set(s.name, (totals.get(s.name) ?? 0) + 1);

  const seen = new Map<string, number>();
  for (const s of sections) {
    const n = (seen.get(s.name) ?? 0) + 1;
    seen.set(s.name, n);
    const total = totals.get(s.name) ?? 1;
    s.occurrence = n;
    s.occurrenceCount = total;
    // Respect names that already carry their own number.
    s.displayName = total > 1 && !/\d\s*$/.test(s.rawName) ? `${s.rawName} ${n}` : s.rawName;
  }

  return { meta, sections, warnings, errors };
}

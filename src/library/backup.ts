import { identify, looksLikeChart } from './identity';
import type { StoredSong } from './types';

export const BACKUP_FORMAT = 'livechart-backup';
export const BACKUP_VERSION = 1;

export interface BackupSong {
  title: string;
  text: string;
  addedAt?: number;
  updatedAt?: number;
}

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  songs: BackupSong[];
  /** `lc.*` preferences — font scale, step, theme, pedal bindings. */
  prefs: Record<string, string>;
}

/**
 * One file holding every song's `.lcf` text plus the preferences.
 *
 * iOS clears script-writable storage after 7 days of non-use, and only
 * home-screen installs are exempt, so this is what makes the library
 * trustworthy between gigs rather than merely convenient. The songs go in as
 * their original source, so a backup can be unpicked by hand if this app ever
 * stops existing.
 */
export function serializeBackup(songs: StoredSong[], prefs: Record<string, string>): string {
  const backup: Backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    songs: songs.map(({ title, text, addedAt, updatedAt }) => ({
      title,
      text,
      addedAt,
      updatedAt,
    })),
    prefs,
  };
  return JSON.stringify(backup, null, 2);
}

export type ParsedImport =
  | { kind: 'backup'; songs: BackupSong[]; prefs: Record<string, string> }
  | { kind: 'song'; title: string; text: string }
  | { kind: 'unusable'; reason: string };

/** Reads a `.lcf` chart or a backup bundle. Never throws — see `parseLcf`. */
export function readImport(fileName: string, text: string): ParsedImport {
  const trimmed = text.trim();
  if (!trimmed) return { kind: 'unusable', reason: 'the file is empty' };

  // Only JSON can be a backup, and only a chart can start with anything else,
  // so the first character is enough to decide which way to read it.
  if (trimmed.startsWith('{')) {
    const backup = readBackup(trimmed);
    if (backup) return backup;
    return { kind: 'unusable', reason: 'it looks like JSON but not like a LiveChart backup' };
  }

  if (!looksLikeChart(trimmed)) {
    return { kind: 'unusable', reason: 'it has no header, section or chord line' };
  }
  const { title } = identify(text, fileName);
  return { kind: 'song', title, text };
}

function readBackup(json: string): ParsedImport | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;

  const record = raw as Record<string, unknown>;
  if (record.format !== BACKUP_FORMAT) return null;

  // A newer bundle may carry fields we don't know about; the songs and prefs it
  // does carry are still worth restoring, so read what we recognise and ignore
  // the rest rather than refusing the whole file.
  const songs: BackupSong[] = [];
  if (Array.isArray(record.songs)) {
    for (const entry of record.songs) {
      if (typeof entry !== 'object' || entry === null) continue;
      const song = entry as Record<string, unknown>;
      if (typeof song.text !== 'string' || !song.text.trim()) continue;
      const title =
        typeof song.title === 'string' && song.title.trim()
          ? song.title.trim()
          : identify(song.text).title;
      songs.push({
        title,
        text: song.text,
        ...(typeof song.addedAt === 'number' ? { addedAt: song.addedAt } : {}),
        ...(typeof song.updatedAt === 'number' ? { updatedAt: song.updatedAt } : {}),
      });
    }
  }

  const prefs: Record<string, string> = {};
  if (typeof record.prefs === 'object' && record.prefs !== null) {
    for (const [k, v] of Object.entries(record.prefs as Record<string, unknown>)) {
      // Only our own keys, and only strings: a bundle must not be able to write
      // arbitrary entries into localStorage.
      if (k.startsWith('lc.') && typeof v === 'string') prefs[k] = v;
    }
  }

  return { kind: 'backup', songs, prefs };
}

/**
 * A song as the library holds it.
 *
 * `text` is the song of record: the verbatim `.lcf` source, exactly as imported.
 * Everything else here is derived from it and can be recomputed, which is what
 * makes an export a genuine backup rather than a snapshot of our data model.
 */
export interface StoredSong {
  /** Stable key derived from the title. See `idFor`. */
  id: string;
  /** Display name, from the file's own `Title` attribute where it has one. */
  title: string;
  /** Verbatim `.lcf` source. */
  text: string;
  /** ms since epoch. */
  addedAt: number;
  updatedAt: number;
}

/**
 * One position in a running order: a song, and optionally the key and capo it
 * is played at from this set. Per position rather than per song, so the same
 * song twice in a night can sit in two keys.
 */
export interface SetEntry {
  /** A `StoredSong.id`. */
  id: string;
  /** The sounding key's spelled root only — `"Gb"`, `"Eb"`. Mode comes from the file. */
  key?: string;
  /** 0–11. */
  capo?: number;
}

/**
 * A running order.
 *
 * `songs` holds entries in playing order. Their ids are derived from the
 * title, so a setlist survives re-importing an edited chart — which is the
 * whole reason song identity works that way.
 *
 * Entries may repeat and may point at songs that aren't here; see `setlists.ts`.
 * Sets stored before entries existed hold bare ids, and are normalised as they
 * are read — never migrated in place.
 */
export interface Setlist {
  /** Random, not derived from the name, so renaming is free. */
  id: string;
  name: string;
  songs: SetEntry[];
  /** ms since epoch. */
  createdAt: number;
  updatedAt: number;
}

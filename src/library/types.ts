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
 * A running order.
 *
 * `songs` holds `StoredSong.id`s in playing order. Because those ids are
 * derived from the title, a setlist survives re-importing an edited chart —
 * which is the whole reason song identity works that way.
 *
 * Entries may repeat and may point at songs that aren't here; see `setlists.ts`.
 */
export interface Setlist {
  /** Random, not derived from the name, so renaming is free. */
  id: string;
  name: string;
  songs: string[];
  /** ms since epoch. */
  createdAt: number;
  updatedAt: number;
}

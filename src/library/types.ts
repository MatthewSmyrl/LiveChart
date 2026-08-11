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

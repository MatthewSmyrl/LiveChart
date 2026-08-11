import type { StoredSong } from './types';

const DB_NAME = 'livechart';
const DB_VERSION = 1;
const STORE = 'songs';

/**
 * The song store.
 *
 * Hand-written rather than wrapped in a library, for the same reason the
 * service worker is: one object store, three operations, and no appetite for
 * the dependency surface. Every call rejects rather than throwing synchronously,
 * so a browser with IndexedDB switched off degrades to a warning in the library
 * screen instead of a blank app.
 */
let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser has no storage for a song library.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open the song library.'));
    // Another tab holding an older version open. Rare, and not worth a retry
    // loop — the next launch will find it closed.
    request.onblocked = () => reject(new Error('Another copy of LiveChart has the library open.'));
  });

  // A failed open must not be cached, or one transient error would leave the
  // library broken for the rest of the session.
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

/** Resolves when the transaction commits, not merely when the request returns. */
function committed(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('The song library rejected a write.'));
    tx.onabort = () => reject(tx.error ?? new Error('A write to the song library was abandoned.'));
  });
}

export async function loadSongs(): Promise<StoredSong[]> {
  const db = await open();
  const tx = db.transaction(STORE, 'readonly');
  const request = tx.objectStore(STORE).getAll() as IDBRequest<StoredSong[]>;
  const [songs] = await Promise.all([
    new Promise<StoredSong[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error ?? new Error('Could not read the songs.'));
    }),
    committed(tx),
  ]);
  return songs;
}

/** Writes every song given, in one transaction: a restore is all or nothing. */
export async function saveSongs(songs: StoredSong[]): Promise<void> {
  if (songs.length === 0) return;
  const db = await open();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  for (const song of songs) store.put(song);
  await committed(tx);
}

export async function deleteSong(id: string): Promise<void> {
  const db = await open();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(id);
  await committed(tx);
}

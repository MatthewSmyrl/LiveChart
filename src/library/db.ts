import type { Setlist, StoredSong } from './types';

const DB_NAME = 'livechart';
/** 2 added the setlists store. Existing songs are untouched by the upgrade. */
const DB_VERSION = 2;
const STORE = 'songs';
const SETS = 'setlists';

/**
 * The song and setlist stores.
 *
 * Hand-written rather than wrapped in a library, for the same reason the
 * service worker is: two object stores, a handful of operations, and no
 * appetite for the dependency surface. Every call rejects rather than throwing
 * synchronously, so a browser with IndexedDB switched off degrades to a warning
 * in the library screen instead of a blank app.
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
      if (!db.objectStoreNames.contains(SETS)) db.createObjectStore(SETS, { keyPath: 'id' });
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

async function readAll<T>(store: string, what: string): Promise<T[]> {
  const db = await open();
  const tx = db.transaction(store, 'readonly');
  const request = tx.objectStore(store).getAll() as IDBRequest<T[]>;
  const [rows] = await Promise.all([
    new Promise<T[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error ?? new Error(`Could not read the ${what}.`));
    }),
    committed(tx),
  ]);
  return rows;
}

/** Writes every row given, in one transaction: a restore is all or nothing. */
async function writeAll<T>(store: string, rows: T[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  const objectStore = tx.objectStore(store);
  for (const row of rows) objectStore.put(row);
  await committed(tx);
}

async function deleteRow(store: string, id: string): Promise<void> {
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(id);
  await committed(tx);
}

export const loadSongs = (): Promise<StoredSong[]> => readAll<StoredSong>(STORE, 'songs');
export const saveSongs = (songs: StoredSong[]): Promise<void> => writeAll(STORE, songs);
export const deleteSong = (id: string): Promise<void> => deleteRow(STORE, id);

export const loadSetlists = (): Promise<Setlist[]> => readAll<Setlist>(SETS, 'setlists');
export const saveSetlists = (setlists: Setlist[]): Promise<void> => writeAll(SETS, setlists);
export const deleteSetlist = (id: string): Promise<void> => deleteRow(SETS, id);

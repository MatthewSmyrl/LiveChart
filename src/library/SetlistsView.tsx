import { useMemo, useState } from 'react';
import { parseLcf } from '../lcf/parse';
import { type Note, noteName, parseKey, prettyNote, sameNote } from '../music/notes';
import { resolveKeys } from '../music/transpose';
import { KeyPanel } from '../render/KeyPanel';
import {
  addToSetlist,
  byName,
  choiceFor,
  firstPlayable,
  moveBy,
  newSetlist,
  pinAt,
  removeAt,
  renameSetlist,
} from './setlists';
import { byTitle } from './merge';
import type { SetEntry, Setlist, StoredSong } from './types';

/** `Key G♭ · Capo 2`, or null when the entry pins nothing. */
function pinLabel(entry: SetEntry): string | null {
  const key = entry.key ? parseKey(entry.key) : null;
  const parts = [
    ...(key ? [`Key ${prettyNote(key.tonic)}`] : []),
    ...(entry.capo === undefined ? [] : [`Capo ${entry.capo}`]),
  ];
  return parts.length ? parts.join(' · ') : null;
}

/**
 * The key panel for one position in a set — the same panel as on the chart,
 * so there is one way to pick a key. What it writes is pinned to the position,
 * and a pin that only restates the file is not kept, so a row goes back to
 * showing nothing when it is back at the file's key.
 */
function EntryKeys({
  setlist,
  index,
  song,
  onChange,
  onClose,
}: {
  setlist: Setlist;
  index: number;
  song: StoredSong;
  onChange: (setlist: Setlist) => void;
  onClose: () => void;
}) {
  const parsed = useMemo(() => parseLcf(song.text), [song.text]);
  const entry = setlist.songs[index];
  if (!entry) return null;

  const file = resolveKeys(parsed);
  const keys = resolveKeys(parsed, choiceFor(entry));
  const pin = (key: Note, capo: number) =>
    onChange(
      pinAt(setlist, index, {
        key: sameNote(key, file.fileKey.tonic) ? undefined : noteName(key),
        capo: capo === file.fileCapo ? undefined : capo,
      }),
    );

  return (
    <KeyPanel
      keys={keys}
      base={file}
      title={`${song.title} — number ${index + 1}`}
      intro="Played at this key and capo whenever the set reaches this position. The file itself is not changed."
      onKey={(key) => pin(key, keys.appCapo)}
      onCapo={(capo) => pin(keys.appKey.tonic, Math.min(11, Math.max(0, capo)))}
      onReset={() => onChange(pinAt(setlist, index, {}))}
      onClose={onClose}
    />
  );
}

/**
 * Two different reasons a set can't be started, wanting different explanations:
 * an empty set, and one whose songs are all missing from this device.
 */
function whyNotStart(setlist: Setlist): string {
  return setlist.songs.length === 0
    ? 'Add a song to this set first'
    : 'None of these songs are on this device';
}

/**
 * Setlists — the running order the pedal follows.
 *
 * Reordering is a pair of buttons rather than a drag. Touch drag-and-drop
 * inside a scrolling list is the fiddliest interaction on iOS, and this is a
 * screen you use standing up, ten minutes before a gig, with one thumb.
 */
export function SetlistsView({
  songs,
  setlists,
  activeSetId,
  onSave,
  onRemove,
  onStart,
}: {
  songs: StoredSong[];
  setlists: Setlist[];
  activeSetId: string | null;
  onSave: (setlist: Setlist) => void;
  onRemove: (id: string) => void;
  onStart: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const titles = useMemo(() => new Map(songs.map((s) => [s.id, s.title])), [songs]);
  const has = (songId: string) => titles.has(songId);

  const editing = setlists.find((s) => s.id === editingId) ?? null;

  const create = () => {
    const set = newSetlist(`Set ${setlists.length + 1}`);
    onSave(set);
    setEditingId(set.id);
  };

  if (editing) {
    return (
      <SetlistEditor
        setlist={editing}
        songs={songs}
        titles={titles}
        onChange={onSave}
        onDelete={() => {
          setEditingId(null);
          onRemove(editing.id);
        }}
        onDone={() => setEditingId(null)}
      />
    );
  }

  return (
    <>
      <div className="library__actions">
        <button className="btn" onClick={create}>
          New setlist
        </button>
      </div>

      {setlists.length === 0 ? (
        <p className="library__empty">
          No setlists yet. A setlist is a running order: once one is playing, the pedal moves you
          from the last chord of a song to the top of the next.
        </p>
      ) : (
        <ul className="library__list">
          {byName(setlists).map((set) => {
            const playable = firstPlayable(set.songs, has) !== null;
            return (
              <li
                className={`library__row ${set.id === activeSetId ? 'library__row--current' : ''}`}
                key={set.id}
              >
                <button className="library__open" onClick={() => setEditingId(set.id)}>
                  {set.name}
                  <span className="library__count">
                    {set.songs.length === 0
                      ? 'empty'
                      : `${set.songs.length} song${set.songs.length === 1 ? '' : 's'}`}
                    {set.id === activeSetId ? ' · playing' : ''}
                  </span>
                </button>
                {/* The only button on this row, and nothing destructive within
                    reach of it. Deleting a set lives inside the set, where you
                    have to have opened it first — starting one is something you
                    do in a hurry, and losing a running order to a fat finger is
                    not. Disabled rather than hidden when nothing in the set is
                    on this device, so the reason stays visible. */}
                <button
                  className="btn btn--on"
                  onClick={() => onStart(set.id)}
                  disabled={!playable}
                  title={playable ? undefined : whyNotStart(set)}
                >
                  Start
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function SetlistEditor({
  setlist,
  songs,
  titles,
  onChange,
  onDelete,
  onDone,
}: {
  setlist: Setlist;
  songs: StoredSong[];
  titles: Map<string, string>;
  onChange: (setlist: Setlist) => void;
  onDelete: () => void;
  onDone: () => void;
}) {
  // Held locally while typing, so the name isn't written to storage — and the
  // list isn't re-sorted — once per keystroke. Committed on blur and on Done.
  const [draftName, setDraftName] = useState(setlist.name);
  const [confirming, setConfirming] = useState(false);
  // The position whose key panel is open.
  const [pinning, setPinning] = useState<number | null>(null);
  const pinningId = pinning === null ? undefined : setlist.songs[pinning]?.id;
  const pinningSong = pinningId ? songs.find((s) => s.id === pinningId) : undefined;
  const commitName = () => {
    if (draftName.trim() !== setlist.name) onChange(renameSetlist(setlist, draftName));
  };

  return (
    <>
      {/* Deleting a set lives in here rather than on its row in the list. The
          row's job is Start, which you press in a hurry; this is the one action
          that loses work, so it costs opening the set first and then a
          confirmation. */}
      <div className="library__actions">
        {confirming ? (
          <>
            <span className="library__hint library__grow">Delete “{setlist.name}”?</span>
            <button className="btn" onClick={() => setConfirming(false)}>
              Keep
            </button>
            <button className="btn btn--danger" onClick={onDelete}>
              Delete
            </button>
          </>
        ) : (
          <>
            <input
              className="library__name"
              value={draftName}
              aria-label="Setlist name"
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitName}
            />
            <button
              className="btn library__spaced"
              onClick={() => setConfirming(true)}
              aria-label={`Delete ${setlist.name}`}
            >
              Delete set
            </button>
            <button
              className="btn btn--on"
              onClick={() => {
                commitName();
                onDone();
              }}
            >
              Done
            </button>
          </>
        )}
      </div>

      {setlist.songs.length === 0 ? (
        <p className="library__empty">Nothing in this set yet. Add songs from the list below.</p>
      ) : (
        <>
          <p className="library__hint">Tap a song to set the key and capo it's played at in this set.</p>
          <ol className="library__list">
          {setlist.songs.map((entry, i) => {
            const songId = entry.id;
            const title = titles.get(songId);
            const pin = pinLabel(entry);
            return (
              <li className="library__row" key={`${songId}#${i}`}>
                <span className="library__pos">{i + 1}</span>
                {title ? (
                  <button className="library__open" onClick={() => setPinning(i)}>
                    {title}
                    {/* Only when something is pinned: a set that has never
                        been transposed must not grow a column of noise. */}
                    {pin && <span className="library__count library__pin">{pin}</span>}
                  </button>
                ) : (
                  <span className="library__entry library__entry--missing">
                    {/* A song can be deleted, or a setlist restored before its
                        charts are. The set still plays; this entry is stepped
                        over, and importing the chart fills it back in. */}
                    {songId}
                    <span className="library__count">not on this device</span>
                  </span>
                )}
                <button
                  className="btn"
                  onClick={() => onChange(moveBy(setlist, i, -1))}
                  disabled={i === 0}
                  aria-label={`Move ${title ?? songId} up`}
                >
                  ↑
                </button>
                <button
                  className="btn"
                  onClick={() => onChange(moveBy(setlist, i, 1))}
                  disabled={i === setlist.songs.length - 1}
                  aria-label={`Move ${title ?? songId} down`}
                >
                  ↓
                </button>
                <button
                  className="btn"
                  onClick={() => onChange(removeAt(setlist, i))}
                  aria-label={`Take ${title ?? songId} out of the set`}
                >
                  ✕
                </button>
              </li>
            );
          })}
          </ol>
        </>
      )}

      {pinning !== null && pinningSong && (
        <EntryKeys
          setlist={setlist}
          index={pinning}
          song={pinningSong}
          onChange={onChange}
          onClose={() => setPinning(null)}
        />
      )}

      <h2 className="library__heading">Add a song</h2>
      {songs.length === 0 ? (
        <p className="library__empty">There are no songs to add yet.</p>
      ) : (
        <ul className="library__list">
          {byTitle(songs).map((song) => {
            const already = setlist.songs.filter((e) => e.id === song.id).length;
            return (
              <li className="library__row" key={song.id}>
                {/* The whole row adds, and adding twice is allowed: a reprise
                    in the encore is the same song played again. */}
                <button
                  className="library__open"
                  onClick={() => onChange(addToSetlist(setlist, song.id))}
                >
                  {song.title}
                  {already > 0 && (
                    <span className="library__count">
                      in the set{already > 1 ? ` ${already} times` : ''}
                    </span>
                  )}
                </button>
                <button
                  className="btn"
                  onClick={() => onChange(addToSetlist(setlist, song.id))}
                  aria-label={`Add ${song.title} to the set`}
                >
                  +
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

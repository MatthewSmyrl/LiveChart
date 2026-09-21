import { useEffect } from 'react';
import { type Note, pickerKeys, prettyKey, prettyNote, sameNote } from '../music/notes';
import type { KeyState } from '../music/transpose';

/**
 * Key and capo for the song on screen — a deliberate stop between numbers, not
 * a mid-song action, so it sits over the chart like the pedal screen and holds
 * the chrome open while it is up. See TRANSPOSITION-PLAN.md §4.
 */
export function KeyPanel({
  keys,
  base,
  baseIsSet = false,
  title = 'Key and capo',
  intro = 'The key is how the song sounds; the chart draws the shapes you play with the capo on.',
  onKey,
  onCapo,
  onReset,
  onClose,
}: {
  keys: KeyState;
  /** What Reset returns to: the setlist's pinned values, or the file's. */
  base: KeyState;
  baseIsSet?: boolean;
  title?: string;
  intro?: string;
  onKey: (key: Note) => void;
  onCapo: (capo: number) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.code === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const { appKey, appCapo, shapeKey, transposed } = keys;
  const minor = keys.fileKey.minor;
  const atBase = sameNote(appKey.tonic, base.appKey.tonic) && appCapo === base.appCapo;

  return (
    <div className="learn" role="dialog" aria-modal="true" aria-label={title}>
      <div className="learn__panel">
        <h2 className="learn__title">{title}</h2>
        <p className="learn__intro">{intro}</p>

        <div className="keys" role="group" aria-label="Sounding key">
          {pickerKeys(minor).map((k) => {
            const on = sameNote(k, appKey.tonic);
            const isFile = sameNote(k, base.appKey.tonic);
            return (
              <button
                key={prettyNote(k)}
                className={`btn keys__key ${on ? 'btn--on' : ''} ${isFile ? 'keys__key--file' : ''}`}
                aria-pressed={on}
                onClick={() => onKey(k)}
              >
                {prettyNote(k)}
                {minor ? 'm' : ''}
              </button>
            );
          })}
        </div>

        <div className="learn__row">
          <div className="learn__label">
            <b>Capo</b>
            <span className="learn__hint">{appCapo === 0 ? 'none' : `fret ${appCapo}`}</span>
          </div>
          <div className="toolbar__group">
            <button className="btn" onClick={() => onCapo(appCapo - 1)} disabled={appCapo <= 0} aria-label="Capo down a fret">
              −
            </button>
            <span className="toolbar__readout">{appCapo}</span>
            <button className="btn" onClick={() => onCapo(appCapo + 1)} disabled={appCapo >= 11} aria-label="Capo up a fret">
              +
            </button>
          </div>
        </div>

        <p className={`learn__status ${transposed ? 'keys__moved' : ''}`}>
          Sounds in <b>{prettyKey(appKey)}</b>
          {appCapo > 0 && (
            <>
              {' '}
              with the capo at {appCapo} — you play <b>{prettyKey(shapeKey)}</b> shapes
            </>
          )}
          .{' '}
          {transposed ? 'The chart is transposed.' : 'The chart is as written.'}
        </p>

        <div className="learn__actions">
          <button className="btn" onClick={onReset} disabled={atBase}>
            Reset to {baseIsSet ? 'set' : 'file'} ({prettyKey(base.appKey)}
            {base.appCapo ? `, capo ${base.appCapo}` : ''})
          </button>
          <button className="btn btn--on" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

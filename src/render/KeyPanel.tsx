import { useEffect } from 'react';
import { type Note, pickerKeys, prettyKey, prettyNote, sameNote } from '../music/notes';
import type { KeyState } from '../music/transpose';

/** `E`, or `E·2` with a capo on. What the toolbar's Key button reads. */
export function keyBadge(keys: KeyState): string {
  return prettyKey(keys.appKey) + (keys.appCapo ? `·${keys.appCapo}` : '');
}

/**
 * Key and capo for the song on screen — a deliberate stop between numbers, not
 * a mid-song action, so it sits over the chart like the pedal screen and holds
 * the chrome open while it is up. See TRANSPOSITION-PLAN.md §4.
 */
export function KeyPanel({
  keys,
  onKey,
  onCapo,
  onReset,
  onClose,
}: {
  keys: KeyState;
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

  const { appKey, appCapo, fileKey, fileCapo, shapeKey, transposed } = keys;
  const minor = fileKey.minor;
  const atFile = sameNote(appKey.tonic, fileKey.tonic) && appCapo === fileCapo;

  return (
    <div className="learn" role="dialog" aria-modal="true" aria-label="Key and capo">
      <div className="learn__panel">
        <h2 className="learn__title">Key and capo</h2>
        <p className="learn__intro">
          The key is how the song sounds; the chart draws the shapes you play with the capo on.
        </p>

        <div className="keys" role="group" aria-label="Sounding key">
          {pickerKeys(minor).map((k) => {
            const on = sameNote(k, appKey.tonic);
            const isFile = sameNote(k, fileKey.tonic);
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
          <button className="btn" onClick={onReset} disabled={atFile}>
            Reset to file ({prettyKey(fileKey)}
            {fileCapo ? `, capo ${fileCapo}` : ''})
          </button>
          <button className="btn btn--on" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

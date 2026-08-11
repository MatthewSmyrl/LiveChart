import { useEffect, useState } from 'react';
import {
  DEFAULT_BINDINGS,
  describeCode,
  isIncomplete,
  isUsableCode,
  learn,
  type Bindings,
} from './keymap';
import type { Direction } from './scrollPlan';
import { describeWake, type WakeStatus } from './useWakeLock';

/**
 * Capture screen for teaching the app what a pedal actually sends.
 *
 * The switch labelled "next" on the box may send anything — arrows, page keys,
 * a function key — and the same pedal changes mode with a button combination
 * that is easy to hit by accident. Rather than guess, we listen.
 */
export function PedalLearn({
  bindings,
  onChange,
  onClose,
  wake,
}: {
  bindings: Bindings;
  onChange: (next: Bindings) => void;
  onClose: () => void;
  /** Reported here rather than over the chart. See `useWakeLock`. */
  wake: WakeStatus;
}) {
  const [capturing, setCapturing] = useState<Direction | null>(null);
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (capturing === null) {
        if (event.code === 'Escape') onClose();
        return;
      }
      // Capture phase, so the performance handler never sees these presses.
      event.preventDefault();
      event.stopPropagation();
      // Escape cancels rather than binds — binding it would be a trap, since
      // Escape is the only way out of a capture that is picking up nothing.
      if (event.code === 'Escape') {
        setCapturing(null);
        return;
      }
      if (event.repeat) return;
      if (!isUsableCode(event.code)) {
        setRejected(true);
        setCapturing(null);
        return;
      }
      setRejected(false);
      onChange(learn(bindings, capturing, event.code));
      setCapturing(null);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [bindings, capturing, onChange, onClose]);

  const row = (action: Direction, label: string, hint: string) => (
    <div className="learn__row">
      <div className="learn__label">
        <b>{label}</b>
        <span className="learn__hint">{hint}</span>
      </div>
      <div className="learn__codes">
        {bindings[action].length === 0 ? (
          <span className="learn__none">nothing bound</span>
        ) : (
          bindings[action].map((code) => (
            <kbd className="learn__code" key={code}>
              {describeCode(code)}
            </kbd>
          ))
        )}
      </div>
      <button
        className={`btn ${capturing === action ? 'btn--on' : ''}`}
        onClick={() => {
          setRejected(false);
          setCapturing(capturing === action ? null : action);
        }}
      >
        {capturing === action ? 'Listening…' : 'Learn'}
      </button>
    </div>
  );

  return (
    <div className="learn" role="dialog" aria-modal="true" aria-label="Learn pedal">
      <div className="learn__panel">
        <h2 className="learn__title">Learn pedal</h2>
        <p className="learn__intro">
          Press <b>Learn</b>, then press that switch on the pedal. Whatever it sends replaces the
          current binding.
        </p>

        {row('forward', 'Advance', 'the switch you use to turn the page')}
        {row('back', 'Go back', 'the other switch')}

        {capturing !== null && (
          <p className="learn__status">
            Listening for the <b>{capturing === 'forward' ? 'advance' : 'go back'}</b> switch — press
            it now, or press Esc to cancel.
          </p>
        )}

        {rejected && (
          <p className="learn__warn">
            That press arrived without an identifiable key code, so there is nothing to bind. Try
            the pedal's other keyboard mode — many have two or three, switched by holding both
            switches on power-up.
          </p>
        )}

        {isIncomplete(bindings) && (
          <p className="learn__warn">
            One action has nothing bound. Both switches appear to send the same code — put the pedal
            in a two-key mode, or restore the defaults and use tap zones.
          </p>
        )}

        <div className="learn__row">
          <div className="learn__label">
            <b>Keep screen awake</b>
            <span className="learn__hint">{describeWake(wake)}</span>
          </div>
        </div>

        <div className="learn__actions">
          <button className="btn" onClick={() => onChange(DEFAULT_BINDINGS)}>
            Restore defaults
          </button>
          <button className="btn btn--on" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

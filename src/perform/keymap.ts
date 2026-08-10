import type { Direction } from './scrollPlan';

/**
 * Pedal and keyboard bindings.
 *
 * Bluetooth page-turners are not standardised — the same pedal ships in modes
 * that send arrows, page keys or media keys, and the labels on the box are
 * often wrong. So bindings are stored as raw `event.code` values and can be
 * relearned from the pedal itself.
 */
export interface Bindings {
  forward: string[];
  back: string[];
}

export const DEFAULT_BINDINGS: Bindings = {
  forward: ['ArrowDown', 'ArrowRight', 'PageDown', 'Space'],
  back: ['ArrowUp', 'ArrowLeft', 'PageUp'],
};

/** The subset of KeyboardEvent this module needs, so tests need no DOM. */
export interface KeyLike {
  code: string;
  repeat: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

/**
 * Which way a key press should turn the page, if any.
 *
 * Auto-repeat is ignored outright: a foot resting on a pedal would otherwise
 * scroll the song away, and there is no way to recover gracefully mid-verse.
 * Modified presses are left to the browser — Cmd+Arrow is a navigation
 * shortcut, not a page turn.
 */
export function actionFor(bindings: Bindings, event: KeyLike): Direction | null {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return null;
  // A binding set saved before the capture guard existed could hold an empty
  // code, which would then match every unidentified press.
  if (!isUsableCode(event.code)) return null;
  if (bindings.forward.includes(event.code)) return 'forward';
  if (bindings.back.includes(event.code)) return 'back';
  return null;
}

/**
 * Whether a captured `event.code` is worth storing.
 *
 * Some Bluetooth HID pedals report an empty or `Unidentified` code — the press
 * registers, but there is nothing to match on later. Binding it would leave the
 * learn screen looking successful and the pedal dead on stage.
 */
export function isUsableCode(code: string): boolean {
  return code.length > 0 && code !== 'Unidentified';
}

/**
 * Assign a captured code to one action.
 *
 * Learning replaces rather than extends: a pedal whose "next" button sends
 * `ArrowUp` would otherwise retreat as well as advance, because the default
 * bindings would still be live. Whatever the pedal actually sends wins.
 */
export function learn(bindings: Bindings, action: Direction, code: string): Bindings {
  return action === 'forward'
    ? { forward: [code], back: bindings.back.filter((c) => c !== code) }
    : { forward: bindings.forward.filter((c) => c !== code), back: [code] };
}

/** True once at least one action has no key left to trigger it. */
export function isIncomplete(bindings: Bindings): boolean {
  return bindings.forward.length === 0 || bindings.back.length === 0;
}

/** Human-readable name for a raw code, for the settings and learn screens. */
export function describeCode(code: string): string {
  const known: Record<string, string> = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    PageUp: 'Page Up',
    PageDown: 'Page Down',
    Space: 'Space',
    Enter: 'Enter',
    Escape: 'Esc',
  };
  return known[code] ?? code.replace(/^(Key|Digit)/, '');
}

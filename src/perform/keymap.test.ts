import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BINDINGS,
  actionFor,
  isIncomplete,
  isUsableCode,
  learn,
  type Bindings,
  type KeyLike,
} from './keymap';

function press(code: string, over: Partial<KeyLike> = {}): KeyLike {
  return { code, repeat: false, ctrlKey: false, metaKey: false, altKey: false, ...over };
}

describe('actionFor', () => {
  it('turns the page on the default bindings', () => {
    for (const code of ['ArrowDown', 'ArrowRight', 'PageDown', 'Space']) {
      expect(actionFor(DEFAULT_BINDINGS, press(code))).toBe('forward');
    }
    for (const code of ['ArrowUp', 'ArrowLeft', 'PageUp']) {
      expect(actionFor(DEFAULT_BINDINGS, press(code))).toBe('back');
    }
  });

  it('ignores auto-repeat, so a foot resting on a pedal does not run the song away', () => {
    expect(actionFor(DEFAULT_BINDINGS, press('ArrowDown', { repeat: true }))).toBeNull();
  });

  it('leaves modified presses to the browser', () => {
    expect(actionFor(DEFAULT_BINDINGS, press('ArrowDown', { metaKey: true }))).toBeNull();
    expect(actionFor(DEFAULT_BINDINGS, press('ArrowDown', { ctrlKey: true }))).toBeNull();
    expect(actionFor(DEFAULT_BINDINGS, press('ArrowDown', { altKey: true }))).toBeNull();
  });

  it('ignores unbound keys', () => {
    expect(actionFor(DEFAULT_BINDINGS, press('KeyQ'))).toBeNull();
  });

  it('never matches an unidentifiable press against a corrupted binding', () => {
    // A set saved before the capture guard existed could hold an empty code,
    // which would otherwise fire on every press an HID pedal fails to identify.
    const corrupt: Bindings = { forward: [''], back: ['Unidentified'] };
    expect(actionFor(corrupt, press(''))).toBeNull();
    expect(actionFor(corrupt, press('Unidentified'))).toBeNull();
  });
});

describe('isUsableCode', () => {
  it('rejects the codes a Bluetooth pedal sends when the host cannot identify it', () => {
    expect(isUsableCode('')).toBe(false);
    expect(isUsableCode('Unidentified')).toBe(false);
  });

  it('accepts anything the browser can actually name', () => {
    expect(isUsableCode('ArrowDown')).toBe(true);
    expect(isUsableCode('F13')).toBe(true);
  });
});

describe('learn', () => {
  it('replaces the defaults for the action being learned', () => {
    const learned = learn(DEFAULT_BINDINGS, 'forward', 'F13');
    expect(learned.forward).toEqual(['F13']);
    expect(actionFor(learned, press('ArrowDown'))).toBeNull();
    expect(actionFor(learned, press('F13'))).toBe('forward');
  });

  it('takes the code away from the opposite action', () => {
    // A pedal whose "next" button sends ArrowUp must not also retreat.
    const learned = learn(DEFAULT_BINDINGS, 'forward', 'ArrowUp');
    expect(learned.back).not.toContain('ArrowUp');
    expect(actionFor(learned, press('ArrowUp'))).toBe('forward');
  });

  it('survives learning both halves of a two-switch pedal', () => {
    const learned = learn(learn(DEFAULT_BINDINGS, 'forward', 'ArrowUp'), 'back', 'ArrowDown');
    expect(actionFor(learned, press('ArrowUp'))).toBe('forward');
    expect(actionFor(learned, press('ArrowDown'))).toBe('back');
    expect(isIncomplete(learned)).toBe(false);
  });
});

describe('isIncomplete', () => {
  it('flags a binding set that has lost an action', () => {
    // Both switches of the pedal sending the same code leaves nothing to retreat with.
    const clash = learn(learn(DEFAULT_BINDINGS, 'forward', 'F13'), 'back', 'F13');
    expect(clash.forward).toEqual([]);
    expect(isIncomplete(clash)).toBe(true);
  });

  it('accepts the defaults', () => {
    expect(isIncomplete(DEFAULT_BINDINGS)).toBe(false);
  });

  it('accepts a restored set', () => {
    const restored: Bindings = { forward: ['F13'], back: ['F14'] };
    expect(isIncomplete(restored)).toBe(false);
  });
});

import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'web',
  },
}));

import { isNativePlatform } from './nativePlatform';

describe('nativePlatform helper', () => {
  it('returns false when Capacitor reports a web platform', () => {
    expect(isNativePlatform()).toBe(false);
  });
});


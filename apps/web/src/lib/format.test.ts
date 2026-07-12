import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';

describe('format helpers', () => {
  it('formats numbers for Turkish and English locales', () => {
    expect(formatNumber(1234, 'tr')).toBe('1.234');
    expect(formatNumber(1234, 'en')).toBe('1,234');
  });

  it('formats dates according to locale', () => {
    const value = '2026-07-12T15:30:00.000Z';
    expect(formatDate(value, 'tr')).toMatch(/2026/);
    expect(formatDate(value, 'en')).toMatch(/2026/);
    expect(formatDateTime(value, 'en')).toMatch(/2026/);
  });
});

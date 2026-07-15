import { describe, expect, it } from 'vitest';
import {
  addDays,
  pad2,
  parseDateTimeLocal,
  sameDay,
  toDateTimeLocalValue,
} from './datetime-local';

describe('datetime-local helpers', () => {
  it('round-trips local datetime values', () => {
    const source = new Date(2026, 6, 14, 23, 59, 0, 0);
    const value = toDateTimeLocalValue(source);
    expect(value).toBe('2026-07-14T23:59');
    const parsed = parseDateTimeLocal(value);
    expect(parsed).not.toBeNull();
    expect(parsed!.getFullYear()).toBe(2026);
    expect(parsed!.getMonth()).toBe(6);
    expect(parsed!.getDate()).toBe(14);
    expect(parsed!.getHours()).toBe(23);
    expect(parsed!.getMinutes()).toBe(59);
  });

  it('compares calendar days and pads numbers', () => {
    const a = new Date(2026, 0, 1, 8, 0);
    const b = new Date(2026, 0, 1, 22, 0);
    expect(sameDay(a, b)).toBe(true);
    expect(sameDay(a, addDays(a, 1))).toBe(false);
    expect(pad2(5)).toBe('05');
  });
});

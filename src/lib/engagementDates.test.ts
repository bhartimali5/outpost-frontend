import { describe, it, expect } from 'vitest';
import {
  addDays,
  daysBetween,
  defaultRange,
  lastWeekStarts,
  mondayOf,
  todayInIst,
  validateRange,
} from './engagementDates';

describe('engagementDates', () => {
  describe('todayInIst', () => {
    it('uses the IST calendar day, not the UTC one', () => {
      // 20:00 UTC on the 14th is already 01:30 on the 15th in IST
      expect(todayInIst(new Date('2026-11-14T20:00:00Z'))).toBe('2026-11-15');
    });

    it('stays on the same day early in the UTC day', () => {
      expect(todayInIst(new Date('2026-11-14T02:00:00Z'))).toBe('2026-11-14');
    });
  });

  describe('addDays / daysBetween', () => {
    it('shifts across month and year boundaries', () => {
      expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
      expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
      expect(addDays('2026-11-16', -30)).toBe('2026-10-17');
    });

    it('counts whole days', () => {
      expect(daysBetween('2026-11-10', '2026-11-16')).toBe(6);
      expect(daysBetween('2026-11-16', '2026-11-10')).toBe(-6);
      expect(daysBetween('2026-01-01', '2027-01-02')).toBe(366);
    });
  });

  describe('mondayOf', () => {
    it('returns the same day for a Monday', () => {
      expect(mondayOf('2026-11-09')).toBe('2026-11-09');
    });

    it('returns the previous Monday for mid-week and Sunday', () => {
      expect(mondayOf('2026-11-12')).toBe('2026-11-09'); // Thursday
      expect(mondayOf('2026-11-15')).toBe('2026-11-09'); // Sunday
    });
  });

  describe('lastWeekStarts', () => {
    it('returns 8 Mondays, oldest first, ending with the current week', () => {
      const weeks = lastWeekStarts('2026-11-14'); // a Saturday
      expect(weeks).toHaveLength(8);
      expect(weeks[7]).toBe('2026-11-09');
      expect(weeks[0]).toBe('2026-09-21');
      expect(weeks.every((w) => mondayOf(w) === w)).toBe(true);
    });
  });

  describe('defaultRange', () => {
    it('is the 30 days ending today', () => {
      expect(defaultRange('2026-11-16')).toEqual({ from: '2026-10-17', to: '2026-11-16' });
    });
  });

  describe('validateRange', () => {
    it('accepts a normal range and a single day', () => {
      expect(validateRange('2026-11-01', '2026-11-16')).toBeNull();
      expect(validateRange('2026-11-16', '2026-11-16')).toBeNull();
    });

    it('rejects a start after the end', () => {
      expect(validateRange('2026-11-16', '2026-11-01')).toMatch(/on or before/);
    });

    it('rejects missing dates', () => {
      expect(validateRange('', '2026-11-01')).toMatch(/both/);
    });

    it('allows exactly 366 days and rejects more', () => {
      expect(validateRange('2026-01-01', '2027-01-02')).toBeNull();
      expect(validateRange('2026-01-01', '2027-01-03')).toMatch(/366/);
    });
  });
});

/// <reference types="jest" />
// Pure helpers (spec §21 "Pure TS"): link detection, hand-off URLs, labels, formatting and IST dates.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/lib/outbox', () => ({ runWrite: jest.fn() }));
jest.mock('@/lib/functions', () => ({ callFunction: jest.fn(), FnError: class extends Error {} }));

import { findUrl } from '@/features/saved/api';
import { directionsUrl, swiggyUrl } from '@/features/handoff/urls';
import { internetLabel } from '@/features/saved/labels';
import { dotJoin, formatDistance, priceMarks } from '@/lib/format';
import { addDays, friendlyDate, timeAgo, todayIST } from '@/lib/dates';

describe('findUrl', () => {
  test('finds the link inside a message and drops trailing punctuation', () => {
    expect(findUrl('Try this https://www.instagram.com/reel/abc123/?igsh=x). So good!')).toBe('https://www.instagram.com/reel/abc123/?igsh=x');
  });
  test('no link → null', () => expect(findUrl('Meghana biryani was amazing, ₹350 each')).toBeNull());
});

describe('hand-off links (§11.1)', () => {
  test('Directions searches by name and pins the Google place', () => {
    expect(directionsUrl('Meghana Foods', 'ChIJabc')).toBe('https://www.google.com/maps/search/?api=1&query=Meghana%20Foods&query_place_id=ChIJabc');
  });
  test('practice places have no Google id to pin', () => {
    expect(directionsUrl('CTR (Shri Sagar)', 'practice:ctr')).toBe('https://www.google.com/maps/search/?api=1&query=CTR%20(Shri%20Sagar)');
  });
  test('Swiggy search is a plain link', () => expect(swiggyUrl('Burma Burma')).toBe('https://www.swiggy.com/search?query=Burma%20Burma'));
});

describe('internetLabel (§14 B1)', () => {
  test.each([
    ['https://www.instagram.com/reel/x', 'From a reel'],
    ['https://m.youtube.com/watch?v=1', 'From a video'],
    ['https://youtu.be/1', 'From a video'],
    ['https://example.com/best-dosa', 'From a link'],
    [null, 'Found online'],
    ['not a url', 'From a link'],
  ])('%s → %s', (url, label) => expect(internetLabel(url)).toBe(label));
});

describe('formatting', () => {
  test('distance', () => {
    expect(formatDistance(4)).toBe('10 m');
    expect(formatDistance(123)).toBe('120 m');
    expect(formatDistance(1234)).toBe('1.2 km');
    expect(formatDistance(12345)).toBe('12 km');
    expect(formatDistance(null)).toBe('');
  });
  test('Google price level → ₹ marks', () => {
    expect(priceMarks('PRICE_LEVEL_MODERATE')).toBe('₹₹');
    expect(priceMarks('PRICE_LEVEL_UNSPECIFIED')).toBeNull();
  });
  test('dotJoin skips empty parts', () => expect(dotJoin('Indiranagar', null, '', false, 'Café')).toBe('Indiranagar · Café'));
});

describe('dates in IST (§18.1)', () => {
  afterEach(() => jest.useRealTimers());
  test('"today" switches at IST midnight, not UTC midnight', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-16T19:00:00Z')); // 00:30 on Oct 17 in India
    expect(todayIST()).toBe('2026-10-17');
  });
  test('friendlyDate', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-17T06:00:00Z'));
    expect(friendlyDate('2026-10-17')).toBe('Today');
    expect(friendlyDate('2026-10-16')).toBe('Yesterday');
    expect(friendlyDate('2026-10-09')).toBe('Oct 9');
    expect(friendlyDate('2025-12-31')).toBe('Dec 31, 2025');
  });
  test('addDays crosses months and years', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  test('timeAgo', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-17T06:00:00Z'));
    expect(timeAgo('2026-10-17T05:59:30Z')).toBe('now');
    expect(timeAgo('2026-10-17T05:55:00Z')).toBe('5m');
    expect(timeAgo('2026-10-17T03:00:00Z')).toBe('3h');
    expect(timeAgo('2026-10-14T06:00:00Z')).toBe('3d');
    expect(timeAgo('2026-10-01T06:00:00Z')).toBe('Oct 1');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPastDate, todayISO } from '@/lib/validation';

/**
 * 경기 날짜 판정은 실행 환경의 타임존과 무관해야 한다.
 *
 * Vercel 서버리스는 UTC 로 돌고 사용자는 KST(UTC+9)다. 로컬 타임존을 쓰면
 * 매일 KST 00:00~09:00 의 9시간 동안 서버가 "어제" 를 오늘로 보고, 이미 끝난
 * 경기에도 참석 등록이 통과한다. 이 테스트가 그 회귀를 막는다.
 */
describe('todayISO / isPastDate — 타임존', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** 특정 UTC 시각으로 시계를 고정한다. */
  function freeze(utcISO: string) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(utcISO));
  }

  it('KST 자정 직후에는 KST 기준 날짜를 쓴다 (UTC 로는 아직 어제)', () => {
    // 2026-08-25 00:30 KST = 2026-08-24 15:30 UTC
    freeze('2026-08-24T15:30:00Z');
    expect(todayISO()).toBe('2026-08-25');
  });

  it('KST 오전 8시(UTC 로는 전날 23시)에도 KST 날짜를 쓴다', () => {
    // 2026-08-25 08:00 KST = 2026-08-24 23:00 UTC
    freeze('2026-08-24T23:00:00Z');
    expect(todayISO()).toBe('2026-08-25');

    // 핵심 회귀: 어제(08-24) 경기는 이 시각에 반드시 마감이어야 한다.
    // 로컬(UTC) 기준이면 todayISO()가 '2026-08-24' 라서 마감되지 않았다.
    expect(isPastDate('2026-08-24')).toBe(true);
  });

  it('KST 오후에는 UTC 와 날짜가 같다', () => {
    // 2026-08-25 21:00 KST = 2026-08-25 12:00 UTC
    freeze('2026-08-25T12:00:00Z');
    expect(todayISO()).toBe('2026-08-25');
  });

  it('경기 당일은 마감이 아니다 (날짜 기준, 시간은 보지 않는다)', () => {
    freeze('2026-08-25T12:00:00Z');
    // 의도를 명시적으로 고정한다: matchDate 가 오늘이면 아직 등록 가능.
    // matchTime 은 마감 판정에 쓰지 않는다.
    expect(isPastDate('2026-08-25')).toBe(false);
    expect(isPastDate('2026-08-26')).toBe(false);
    expect(isPastDate('2026-08-24')).toBe(true);
  });
});

import { z } from 'zod';

/**
 * 경기 날짜 판정의 기준 타임존. 한국 사용자를 위한 서비스이므로 KST 로 고정한다.
 *
 * 로컬 타임존(new Date().getFullYear() 등)을 쓰면 실행 환경에 따라 답이 달라진다.
 * Vercel 서버리스는 UTC 로 도는데 KST 는 UTC+9 라서, 매일 KST 00:00~09:00 의
 * 9시간 동안 서버가 "어제" 를 오늘로 본다 — 그 사이에는 이미 끝난 경기에도
 * 참석 등록이 통과한다. 브라우저(KST)와 서버(UTC)가 서로 다른 날짜를 보는
 * 문제도 같은 원인이다. 그래서 양쪽 모두 이 함수를 통해 KST 로 판단한다.
 */
const MATCH_TIMEZONE = 'Asia/Seoul';

/** 오늘 날짜를 KST 기준 YYYY-MM-DD 로. 실행 환경의 타임존과 무관하다. */
export function todayISO(): string {
  // en-CA 로케일이 YYYY-MM-DD 형식을 낸다.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MATCH_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** 공백만 입력한 이름/구장을 거부한다 (spec FR-012). */
const trimmedText = (max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1).max(max));

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다');

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM (24시간) 형식이어야 합니다');

export const POSITIONS = ['FW', 'MF', 'DF', 'GK'] as const;

/**
 * 경기 예약 페이지 링크(플랩·매치 등). 선택 항목이다.
 *
 * 이 값은 화면에서 <a href> 로 렌더되므로 스킴을 http/https 로 제한한다.
 * 제한하지 않으면 `javascript:alert(1)` 같은 값이 클릭 가능한 링크가 되어
 * XSS 가 된다 — React 의 자동 이스케이프는 href 스킴을 막아주지 않는다.
 */
const matchUrlString = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.string().max(500))
  .refine(
    (v) => {
      if (v === '') return true;
      try {
        const u = new URL(v);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'http 또는 https 로 시작하는 링크만 넣을 수 있습니다' },
  )
  // 빈 문자열은 "입력 안 함" 이므로 null 로 저장한다.
  .transform((v) => (v === '' ? null : v));

export const createInviteSchema = z.object({
  hostName: trimmedText(20),
  matchDate: dateString,
  matchTime: timeString,
  venue: trimmedText(50),
  matchUrl: matchUrlString.nullish().transform((v) => v ?? null),
});

export const createResponseSchema = z.object({
  slug: z.string().min(1).max(32),
  guestName: trimmedText(20),
  position: z.enum(POSITIONS),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type CreateResponseInput = z.infer<typeof createResponseSchema>;

/** 문자열 비교로 판정한다. 두 값 모두 로컬 기준 YYYY-MM-DD 라 사전순 = 시간순. */
export function isPastDate(matchDate: string): boolean {
  return matchDate < todayISO();
}

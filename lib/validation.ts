import { z } from 'zod';

/** 오늘 날짜를 로컬 타임존 기준 YYYY-MM-DD 로. UTC 변환 시 하루 밀리는 것을 막는다. */
export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

export const createInviteSchema = z.object({
  hostName: trimmedText(20),
  matchDate: dateString,
  matchTime: timeString,
  venue: trimmedText(50),
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

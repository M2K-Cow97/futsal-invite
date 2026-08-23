import { count, gte, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { badRequest, baseUrl, internalError } from '@/lib/http';
import { newManageToken, newSlug } from '@/lib/ids';
import { invites } from '@/lib/schema';
import { createInviteSchema, isPastDate } from '@/lib/validation';

/**
 * 시간당 전체 생성 상한.
 *
 * 인증이 없어 누구나 무한히 만들 수 있고, 무료 티어 디스크가 차면 정상 쓰기까지
 * 실패해 서비스가 멈춘다. IP 기준 제한이 정석이지만 서버리스에서는 인스턴스마다
 * 메모리가 따로라 외부 저장소(Redis)가 필요하다. 인프라를 늘리지 않고 최악(디스크
 * 고갈)만 막는 전역 상한을 둔다. 개인용 규모에서 정상 사용자가 닿을 수 없는 값이다.
 *
 * 한계: 전역이라 한 사람이 상한을 채우면 그 시간 동안 다른 사람도 못 만든다.
 * 트래픽이 늘면 IP 기준(@upstash/ratelimit 등)으로 교체한다.
 */
const MAX_INVITES_PER_HOUR = 200;

/** POST /api/invites — 초대장 생성 (spec FR-001, FR-013) */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = createInviteSchema.safeParse(body);
    if (!parsed.success) return badRequest();

    const { hostName, matchDate, matchTime, venue } = parsed.data;
    if (isPastDate(matchDate)) return badRequest('past_date');

    const [{ value: recent }] = await db
      .select({ value: count() })
      .from(invites)
      .where(gte(invites.createdAt, sql`now() - interval '1 hour'`));

    if (recent >= MAX_INVITES_PER_HOUR) return badRequest('rate_limited');

    const slug = newSlug();
    const manageToken = newManageToken();

    await db.insert(invites).values({ slug, manageToken, hostName, matchDate, matchTime, venue });

    const base = baseUrl(request);
    return NextResponse.json(
      {
        slug,
        manageToken,
        inviteUrl: `${base}/i/${slug}`,
        manageUrl: `${base}/m/${manageToken}`,
      },
      { status: 201 },
    );
  } catch (cause) {
    return internalError(cause);
  }
}

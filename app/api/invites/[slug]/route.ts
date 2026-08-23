import { count, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { internalError, notFound } from '@/lib/http';
import { invites, responses } from '@/lib/schema';
import { isPastDate } from '@/lib/validation';

/**
 * GET /api/invites/[slug] — 공개 정보 조회 (spec FR-002)
 * manageToken 은 select 목록에 없다. 실수로 흘러나갈 수 없게 구조로 막는다.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const [invite] = await db
      .select({
        id: invites.id,
        hostName: invites.hostName,
        matchDate: invites.matchDate,
        matchTime: invites.matchTime,
        venue: invites.venue,
        matchUrl: invites.matchUrl,
      })
      .from(invites)
      .where(eq(invites.slug, slug))
      .limit(1);

    if (!invite) return notFound();

    /*
     * 포지션별 현재 인원. 게스트가 "어디가 비었는지" 보고 고르게 한다.
     * 이름은 내보내지 않는다 — 명단은 주최자(/m/{token})만 본다.
     */
    const rows = await db
      .select({ position: responses.position, value: count() })
      .from(responses)
      .where(eq(responses.inviteId, invite.id))
      .groupBy(responses.position);

    const counts: Record<string, number> = { FW: 0, MF: 0, DF: 0, GK: 0 };
    for (const r of rows) counts[r.position] = r.value;

    const { id: _id, ...publicFields } = invite;

    return NextResponse.json({
      ...publicFields,
      matchTime: invite.matchTime.slice(0, 5),
      isPast: isPastDate(invite.matchDate),
      counts,
    });
  } catch (cause) {
    return internalError(cause);
  }
}

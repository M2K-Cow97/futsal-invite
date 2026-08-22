import { asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { internalError, notFound } from '@/lib/http';
import { invites, responses } from '@/lib/schema';
import { POSITIONS } from '@/lib/validation';
import type { Position } from '@/lib/schema';

/** GET /api/manage/[token] — 참석자 명단 + 포지션 집계 (spec FR-005) */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const [invite] = await db
      .select({
        id: invites.id,
        hostName: invites.hostName,
        matchDate: invites.matchDate,
        matchTime: invites.matchTime,
        venue: invites.venue,
      })
      .from(invites)
      .where(eq(invites.manageToken, token))
      .limit(1);

    // 토큰이 틀리면 초대장이 존재하는지조차 알려주지 않는다 (spec FR-006).
    if (!invite) return notFound();

    const rows = await db
      .select({
        guestName: responses.guestName,
        position: responses.position,
        respondedAt: responses.updatedAt,
      })
      .from(responses)
      .where(eq(responses.inviteId, invite.id))
      .orderBy(asc(responses.updatedAt));

    const counts = Object.fromEntries(POSITIONS.map((p) => [p, 0])) as Record<Position, number>;
    for (const row of rows) counts[row.position] += 1;

    return NextResponse.json({
      hostName: invite.hostName,
      matchDate: invite.matchDate,
      matchTime: invite.matchTime.slice(0, 5),
      venue: invite.venue,
      responses: rows,
      counts,
      total: rows.length,
    });
  } catch (cause) {
    return internalError(cause);
  }
}

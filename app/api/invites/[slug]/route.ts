import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { internalError, notFound } from '@/lib/http';
import { invites } from '@/lib/schema';
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
        hostName: invites.hostName,
        matchDate: invites.matchDate,
        matchTime: invites.matchTime,
        venue: invites.venue,
      })
      .from(invites)
      .where(eq(invites.slug, slug))
      .limit(1);

    if (!invite) return notFound();

    return NextResponse.json({
      ...invite,
      matchTime: invite.matchTime.slice(0, 5),
      isPast: isPastDate(invite.matchDate),
    });
  } catch (cause) {
    return internalError(cause);
  }
}

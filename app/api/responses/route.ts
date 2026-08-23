import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { badRequest, internalError, notFound } from '@/lib/http';
import { invites, responses } from '@/lib/schema';
import { createResponseSchema, isPastDate } from '@/lib/validation';

/** POST /api/responses — 참석 응답 등록/갱신 (spec FR-003, FR-004) */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = createResponseSchema.safeParse(body);
    if (!parsed.success) return badRequest();

    const { slug, guestName, position } = parsed.data;

    const [invite] = await db
      .select({
        id: invites.id,
        hostName: invites.hostName,
        matchDate: invites.matchDate,
        matchTime: invites.matchTime,
        venue: invites.venue,
      })
      .from(invites)
      .where(eq(invites.slug, slug))
      .limit(1);

    if (!invite) return notFound();

    /*
     * 경기 날짜가 지나면 마감한다. 링크 자체에는 유효기간이 없고(영구),
     * 경기일이 실질적 마감 기준이다. 클라이언트도 막지만 서버가 최종 판단한다
     * — 링크를 직접 호출하면 클라이언트 검사는 건너뛸 수 있다.
     */
    if (isPastDate(invite.matchDate)) return badRequest('past_match');

    // select-then-insert 는 동시 요청에서 중복을 만든다. DB 제약에 맡겨 원자적으로 처리한다.
    await db
      .insert(responses)
      .values({ inviteId: invite.id, guestName, position })
      .onConflictDoUpdate({
        target: [responses.inviteId, responses.guestName],
        set: { position, updatedAt: sql`now()` },
      });

    // 티켓 화면이 이 응답만으로 완성되도록 경기 정보를 함께 돌려준다.
    return NextResponse.json({
      guestName,
      position,
      hostName: invite.hostName,
      matchDate: invite.matchDate,
      matchTime: invite.matchTime.slice(0, 5),
      venue: invite.venue,
    });
  } catch (cause) {
    return internalError(cause);
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { badRequest, baseUrl, internalError } from '@/lib/http';
import { newManageToken, newSlug } from '@/lib/ids';
import { invites } from '@/lib/schema';
import { createInviteSchema, isPastDate } from '@/lib/validation';

/** POST /api/invites — 초대장 생성 (spec FR-001, FR-013) */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = createInviteSchema.safeParse(body);
    if (!parsed.success) return badRequest();

    const { hostName, matchDate, matchTime, venue } = parsed.data;
    if (isPastDate(matchDate)) return badRequest('past_date');

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

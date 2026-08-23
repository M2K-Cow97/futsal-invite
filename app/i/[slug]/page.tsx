import { count, eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { InviteFlow } from '@/components/InviteFlow';
import { db } from '@/lib/db';
import { invites, responses } from '@/lib/schema';
import { isPastDate } from '@/lib/validation';

type Props = { params: Promise<{ slug: string }> };

/** manageToken 은 select 하지 않는다 (spec FR-002). */
async function loadInvite(slug: string) {
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

  return invite ?? null;
}

/**
 * 포지션별 현재 인원. 게스트가 어디가 비었는지 보고 고르게 한다.
 * 이름은 읽지 않는다 — 명단은 주최자(/m/{token})만 본다.
 */
async function loadCounts(inviteId: number) {
  const rows = await db
    .select({ position: responses.position, value: count() })
    .from(responses)
    .where(eq(responses.inviteId, inviteId))
    .groupBy(responses.position);

  const counts: Record<string, number> = { FW: 0, MF: 0, DF: 0, GK: 0 };
  for (const r of rows) counts[r.position] = r.value;
  return counts;
}

/** 카톡 링크 미리보기 (spec FR-011) */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const invite = await loadInvite(slug).catch(() => null);

  if (!invite) {
    return { title: '초대장을 찾을 수 없어요' };
  }

  const title = `${invite.hostName}이(가) 풋살에 초대했어요 ⚽`;
  const description = `${invite.matchDate} ${invite.matchTime.slice(0, 5)} · ${invite.venue}`;

  /*
   * openGraph.images 를 지정하지 않으면 app/opengraph-image.tsx 가 자동으로
   * 상속된다. 그 이미지는 초대장 내용을 담지 않는 고정 이미지다 —
   * 주최자 이름·구장은 링크를 실제로 연 사람만 보게 둔다(카톡 서버에 남지 않게).
   * 반면 title/description 은 미리보기 텍스트로 필요하므로 넣는다.
   */
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', locale: 'ko_KR' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function InvitePage({ params }: Props) {
  const { slug } = await params;
  const invite = await loadInvite(slug);

  if (!invite) notFound();

  const counts = await loadCounts(invite.id).catch(() => null);

  return (
    <InviteFlow
      slug={slug}
      hostName={invite.hostName}
      counts={counts}
      match={{
        matchDate: invite.matchDate,
        matchTime: invite.matchTime.slice(0, 5),
        venue: invite.venue,
        matchUrl: invite.matchUrl,
      }}
      isPast={isPastDate(invite.matchDate)}
    />
  );
}

import { count, eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { InviteFlow } from '@/components/InviteFlow';
import { db } from '@/lib/db';
import { invites, responses } from '@/lib/schema';
import { fetchVenueImage } from '@/lib/venue-image';
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

  /*
   * 주최자는 공격수로 이미 뛰고 있다 ("공격수는 오직 나뿐이야").
   * FW 는 1명에서 시작한다 — 응답 테이블에는 없지만 자리는 차 있다.
   * app/api/invites/[slug]/route.ts 와 같은 규칙을 쓴다.
   */
  const counts: Record<string, number> = { FW: 1, MF: 0, DF: 0, GK: 0 };
  for (const r of rows) counts[r.position] += r.value;
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

  /*
   * 구장 이미지. 예약 페이지에서 대표 이미지를 긁어오고, 실패하면 기본 이미지를
   * 쓴다(남의 서비스에 의존하는 기능이라 실패를 정상 경로로 본다).
   * 저장하지 않고 렌더 시점에 가져온다 — 예약 페이지의 사진이 바뀌면 따라간다.
   */
  const venueImage = invite.matchUrl ? await fetchVenueImage(invite.matchUrl) : null;

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
        venueImage,
      }}
      isPast={isPastDate(invite.matchDate)}
    />
  );
}

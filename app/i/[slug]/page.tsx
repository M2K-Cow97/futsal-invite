import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { InviteFlow } from '@/components/InviteFlow';
import { db } from '@/lib/db';
import { invites } from '@/lib/schema';
import { isPastDate } from '@/lib/validation';

type Props = { params: Promise<{ slug: string }> };

/** manageToken 은 select 하지 않는다 (spec FR-002). */
async function loadInvite(slug: string) {
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

  return invite ?? null;
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

  return (
    <InviteFlow
      slug={slug}
      hostName={invite.hostName}
      match={{
        matchDate: invite.matchDate,
        matchTime: invite.matchTime.slice(0, 5),
        venue: invite.venue,
      }}
      isPast={isPastDate(invite.matchDate)}
    />
  );
}

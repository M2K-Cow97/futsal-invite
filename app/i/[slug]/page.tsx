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

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
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

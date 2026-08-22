import { asc, eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { invites, responses, type Position } from '@/lib/schema';
import { POSITIONS } from '@/lib/validation';

export const metadata: Metadata = {
  title: '참석자 명단',
  robots: { index: false, follow: false },
};

const POSITION_LABEL: Record<Position, string> = {
  FW: '공격수',
  MF: '미드필더',
  DF: '수비수',
  GK: '골키퍼',
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dow = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
  return `${y}. ${String(m).padStart(2, '0')}. ${String(d).padStart(2, '0')} (${dow})`;
}

/** 주최자 명단 화면 (spec Story 3). 갱신은 새로고침으로 — 실시간 구독은 범위 밖. */
export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const [invite] = await db
    .select({
      id: invites.id,
      slug: invites.slug,
      hostName: invites.hostName,
      matchDate: invites.matchDate,
      matchTime: invites.matchTime,
      venue: invites.venue,
    })
    .from(invites)
    .where(eq(invites.manageToken, token))
    .limit(1);

  // 토큰이 틀리면 초대장 존재 여부조차 노출하지 않는다 (spec FR-006).
  if (!invite) notFound();

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

  return (
    <main className="stage">
      <div className="card">
        <div className="screen">
          <h1 className="title">참석자 명단 📋</h1>
          <p className="subtitle">
            {formatDate(invite.matchDate)} {invite.matchTime.slice(0, 5)} · {invite.venue}
          </p>

          <div className="counts">
            {POSITIONS.map((p) => (
              <div className="count-cell" key={p}>
                <div className="count-pos">{p}</div>
                <div className="count-num">{counts[p]}</div>
              </div>
            ))}
          </div>

          {rows.length === 0 ? (
            <p className="empty">아직 아무도 응답하지 않았어요 🥲</p>
          ) : (
            <ul className="roster">
              {rows.map((row) => (
                <li key={row.guestName}>
                  <span className="guest">{row.guestName}</span>
                  <span className="pos-tag">{POSITION_LABEL[row.position]}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="hint">총 {rows.length}명 · 새로고침하면 최신 명단이 보여요</p>

          <a
            className="btn btn-ghost btn-block"
            href={`/i/${invite.slug}`}
            style={{ marginTop: 14, textDecoration: 'none' }}
          >
            초대 화면 미리보기
          </a>
        </div>
      </div>
    </main>
  );
}

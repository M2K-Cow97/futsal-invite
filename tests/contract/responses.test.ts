import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { POST as createInvite } from '@/app/api/invites/route';
import { POST as createResponse } from '@/app/api/responses/route';
import { invites, responses } from '@/lib/schema';
import { createTestDb, futureDate, pastDate, postJson } from '../setup';

const BASE = 'http://localhost:3000';
let testDb: Awaited<ReturnType<typeof createTestDb>>['db'];

beforeAll(async () => {
  ({ db: testDb } = await createTestDb());
});

async function makeInvite(venue = 'OO풋살파크') {
  const res = await createInvite(
    postJson(`${BASE}/api/invites`, {
      hostName: '경덕',
      matchDate: futureDate(),
      matchTime: '19:00',
      venue,
    }),
  );
  return res.json();
}

function respond(slug: string, guestName: string, position: string) {
  return createResponse(postJson(`${BASE}/api/responses`, { slug, guestName, position }));
}

describe('POST /api/responses', () => {
  it('응답을 저장하고 티켓 렌더링에 필요한 경기 정보를 함께 반환한다', async () => {
    const invite = await makeInvite('응답테스트장');
    const res = await respond(invite.slug, '민수', 'MF');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      guestName: '민수',
      position: 'MF',
      hostName: '경덕',
      venue: '응답테스트장',
      matchTime: '19:00',
    });
  });

  it('같은 이름으로 다시 응답하면 행이 늘지 않고 포지션만 갱신된다', async () => {
    const invite = await makeInvite();

    await respond(invite.slug, '지훈', 'DF');
    const second = await respond(invite.slug, '지훈', 'GK');
    expect(second.status).toBe(200);
    expect((await second.json()).position).toBe('GK');

    const rows = await testDb.select().from(responses);
    const mine = rows.filter((r) => r.guestName === '지훈');
    expect(mine).toHaveLength(1);
    expect(mine[0].position).toBe('GK');
  });

  it('다른 이름은 각각 별도 행으로 쌓인다', async () => {
    const invite = await makeInvite();
    await respond(invite.slug, '가가', 'MF');
    await respond(invite.slug, '나나', 'DF');
    await respond(invite.slug, '다다', 'GK');

    const rows = await testDb.select().from(responses);
    const names = rows.map((r) => r.guestName);
    expect(names).toContain('가가');
    expect(names).toContain('나나');
    expect(names).toContain('다다');
  });

  it('서로 다른 초대장에서는 같은 이름이 각각 저장된다', async () => {
    const a = await makeInvite('A구장');
    const b = await makeInvite('B구장');

    await respond(a.slug, '동명이인', 'MF');
    await respond(b.slug, '동명이인', 'GK');

    const rows = await testDb.select().from(responses);
    expect(rows.filter((r) => r.guestName === '동명이인')).toHaveLength(2);
  });

  it('알 수 없는 포지션은 400 이다', async () => {
    const invite = await makeInvite();
    const res = await respond(invite.slug, '민수', 'ST');
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_input');
  });

  it('이름이 비면 400 이다', async () => {
    const invite = await makeInvite();
    expect((await respond(invite.slug, '', 'MF')).status).toBe(400);
    expect((await respond(invite.slug, '   ', 'MF')).status).toBe(400);
  });

  it('없는 slug 는 404 다', async () => {
    const res = await respond('nope123456', '민수', 'MF');
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('not_found');
  });

  it('응답 수 상한을 넘으면 400 이지만, 기존 참석자의 포지션 변경은 허용한다', async () => {
    const invite = await makeInvite('상한테스트장');
    const [row] = await testDb
      .select({ id: invites.id })
      .from(invites)
      .where(eq(invites.slug, invite.slug));

    // 상한(100)까지 직접 채운다. API 로 100번 돌리면 테스트가 느려진다.
    await testDb.insert(responses).values(
      Array.from({ length: 100 }, (_, i) => ({
        inviteId: row.id,
        guestName: `채움${i}`,
        position: 'MF' as const,
      })),
    );

    // 새 이름은 거부된다.
    const blocked = await respond(invite.slug, '초과자', 'DF');
    expect(blocked.status).toBe(400);
    expect((await blocked.json()).error).toBe('response_limit');

    // 이미 등록된 이름은 행이 늘지 않으므로 포지션 변경이 된다.
    const update = await respond(invite.slug, '채움0', 'GK');
    expect(update.status).toBe(200);
    expect((await update.json()).position).toBe('GK');
  });

  it('경기 날짜가 지난 초대장은 마감돼 400 이다', async () => {
    // 생성 API 는 과거 날짜를 거부하므로 지난 경기는 DB 에 직접 넣는다.
    // (실제로는 만든 뒤 경기일이 지나간 초대장이 이 상태가 된다)
    await testDb.insert(invites).values({
      slug: 'pastslug01',
      manageToken: 'past-manage-token-000001',
      hostName: '경덕',
      matchDate: pastDate(),
      matchTime: '19:00',
      venue: '지난경기장',
    });

    // 다른 테스트가 쓰지 않는 이름이어야 저장 여부를 정확히 판별할 수 있다.
    const res = await respond('pastslug01', '지각왕', 'MF');
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('past_match');

    // 응답이 저장되지 않았어야 한다.
    const rows = await testDb.select().from(responses);
    expect(rows.some((r) => r.guestName === '지각왕')).toBe(false);
  });
});

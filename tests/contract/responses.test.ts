import { beforeAll, describe, expect, it } from 'vitest';
import { POST as createInvite } from '@/app/api/invites/route';
import { POST as createResponse } from '@/app/api/responses/route';
import { responses } from '@/lib/schema';
import { createTestDb, futureDate, postJson } from '../setup';

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
});

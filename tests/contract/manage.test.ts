import { beforeAll, describe, expect, it } from 'vitest';
import { POST as createInvite } from '@/app/api/invites/route';
import { GET as getManage } from '@/app/api/manage/[token]/route';
import { POST as createResponse } from '@/app/api/responses/route';
import { createTestDb, futureDate, postJson } from '../setup';

const BASE = 'http://localhost:3000';

beforeAll(async () => {
  await createTestDb();
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

function fetchManage(token: string) {
  return getManage(new Request(`${BASE}/api/manage/${token}`), {
    params: Promise.resolve({ token }),
  });
}

describe('GET /api/manage/[token]', () => {
  it('명단과 포지션별 집계를 정확히 반환한다', async () => {
    const invite = await makeInvite('집계테스트장');
    await respond(invite.slug, '민수', 'MF');
    await respond(invite.slug, '지훈', 'GK');
    await respond(invite.slug, '태양', 'MF');
    await respond(invite.slug, '현우', 'DF');

    const res = await fetchManage(invite.manageToken);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.venue).toBe('집계테스트장');
    expect(body.total).toBe(4);
    expect(body.counts).toEqual({ FW: 0, MF: 2, DF: 1, GK: 1 });
    expect(body.responses.map((r: { guestName: string }) => r.guestName)).toEqual([
      '민수',
      '지훈',
      '태양',
      '현우',
    ]);
  });

  it('갱신된 응답은 새 행 없이 최신 포지션으로 집계된다', async () => {
    const invite = await makeInvite();
    await respond(invite.slug, '민수', 'MF');
    await respond(invite.slug, '민수', 'GK');

    const body = await (await fetchManage(invite.manageToken)).json();
    expect(body.total).toBe(1);
    expect(body.counts).toEqual({ FW: 0, MF: 0, DF: 0, GK: 1 });
  });

  it('응답이 0건이면 빈 배열과 0 집계를 반환한다', async () => {
    const invite = await makeInvite();
    const body = await (await fetchManage(invite.manageToken)).json();

    expect(body.total).toBe(0);
    expect(body.responses).toEqual([]);
    expect(body.counts).toEqual({ FW: 0, MF: 0, DF: 0, GK: 0 });
  });

  it('다른 초대장의 응답은 섞이지 않는다', async () => {
    const a = await makeInvite('A구장');
    const b = await makeInvite('B구장');
    await respond(a.slug, '에이', 'MF');
    await respond(b.slug, '비비', 'GK');

    const bodyA = await (await fetchManage(a.manageToken)).json();
    expect(bodyA.total).toBe(1);
    expect(bodyA.responses[0].guestName).toBe('에이');
  });

  it('잘못된 토큰은 404 이고 초대장 존재 여부도 노출하지 않는다', async () => {
    await makeInvite();
    const res = await fetchManage('definitely-not-a-real-token');

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: 'not_found' });
  });

  it('slug 를 관리 토큰으로 쓸 수 없다', async () => {
    const invite = await makeInvite();
    // 공유 링크를 아는 사람이 명단까지 볼 수는 없어야 한다.
    const res = await fetchManage(invite.slug);
    expect(res.status).toBe(404);
  });
});

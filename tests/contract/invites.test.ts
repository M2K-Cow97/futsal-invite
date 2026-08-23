import { beforeAll, describe, expect, it } from 'vitest';
import { POST as createInvite } from '@/app/api/invites/route';
import { GET as getInvite } from '@/app/api/invites/[slug]/route';
import { createTestDb, futureDate, pastDate, postJson } from '../setup';

const BASE = 'http://localhost:3000';

beforeAll(async () => {
  await createTestDb();
});

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    hostName: '경덕',
    matchDate: futureDate(),
    matchTime: '19:00',
    venue: 'OO풋살파크',
    ...overrides,
  };
}

describe('POST /api/invites', () => {
  it('초대장을 만들고 slug·manageToken·두 URL 을 반환한다', async () => {
    const res = await createInvite(postJson(`${BASE}/api/invites`, validBody()));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.slug).toHaveLength(10);
    expect(body.manageToken).toHaveLength(21);
    expect(body.inviteUrl).toBe(`${BASE}/i/${body.slug}`);
    expect(body.manageUrl).toBe(`${BASE}/m/${body.manageToken}`);
  });

  it('매번 다른 slug 를 발급한다', async () => {
    const a = await (await createInvite(postJson(`${BASE}/api/invites`, validBody()))).json();
    const b = await (await createInvite(postJson(`${BASE}/api/invites`, validBody()))).json();
    expect(a.slug).not.toBe(b.slug);
    expect(a.manageToken).not.toBe(b.manageToken);
  });

  it('경기 링크는 선택 항목이며 http/https 만 허용한다', async () => {
    // 없어도 만들어진다.
    const none = await createInvite(postJson(`${BASE}/api/invites`, validBody()));
    expect(none.status).toBe(201);

    // https 는 저장되고 조회에 그대로 나온다.
    const ok = await createInvite(
      postJson(`${BASE}/api/invites`, {
        ...validBody(),
        matchUrl: 'https://www.plabfootball.com/match/1234567',
      }),
    );
    expect(ok.status).toBe(201);
    const { slug } = await ok.json();
    const got = await getInvite(new Request(`${BASE}/api/invites/${slug}`), {
      params: Promise.resolve({ slug }),
    });
    expect((await got.json()).matchUrl).toBe('https://www.plabfootball.com/match/1234567');

    /*
     * javascript: 는 반드시 막아야 한다 — 이 값은 화면에서 <a href> 로
     * 렌더되므로 통과하면 클릭 가능한 XSS 가 된다. React 의 자동 이스케이프는
     * href 스킴을 막아주지 않는다.
     */
    for (const bad of ['javascript:alert(1)', 'ftp://x.com/a', 'not a url', ' javascript:x ']) {
      const res = await createInvite(postJson(`${BASE}/api/invites`, { ...validBody(), matchUrl: bad }));
      expect(res.status, `${bad} 는 거부돼야 한다`).toBe(400);
    }
  });

  it('과거 날짜는 400 past_date 로 거부한다', async () => {
    const res = await createInvite(
      postJson(`${BASE}/api/invites`, validBody({ matchDate: pastDate() })),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('past_date');
  });

  it('필수 필드가 비면 400 이다', async () => {
    for (const missing of ['hostName', 'matchDate', 'matchTime', 'venue']) {
      const body = validBody({ [missing]: '' });
      const res = await createInvite(postJson(`${BASE}/api/invites`, body));
      expect(res.status, `${missing} 누락`).toBe(400);
    }
  });

  it('공백만 입력한 이름·구장을 거부한다', async () => {
    const res = await createInvite(
      postJson(`${BASE}/api/invites`, validBody({ hostName: '   ' })),
    );
    expect(res.status).toBe(400);
  });

  it('길이 제한을 넘기면 400 이다', async () => {
    const res = await createInvite(
      postJson(`${BASE}/api/invites`, validBody({ hostName: 'ㄱ'.repeat(21) })),
    );
    expect(res.status).toBe(400);
  });

  it('잘못된 시간 형식을 거부한다', async () => {
    const res = await createInvite(
      postJson(`${BASE}/api/invites`, validBody({ matchTime: '25:00' })),
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/invites/[slug]', () => {
  it('공개 정보를 반환하고 manageToken 은 절대 포함하지 않는다', async () => {
    const created = await (
      await createInvite(postJson(`${BASE}/api/invites`, validBody({ venue: '테스트구장' })))
    ).json();

    const res = await getInvite(new Request(`${BASE}/api/invites/${created.slug}`), {
      params: Promise.resolve({ slug: created.slug }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.hostName).toBe('경덕');
    expect(body.venue).toBe('테스트구장');
    expect(body.matchTime).toBe('19:00');
    expect(body.isPast).toBe(false);

    // 관리 토큰 유출 방지 (spec FR-002) — 이 테스트가 회귀 방지선이다.
    expect(body).not.toHaveProperty('manageToken');
    expect(body).not.toHaveProperty('manage_token');
    expect(JSON.stringify(body)).not.toContain(created.manageToken);
  });

  it('없는 slug 는 404 not_found 다', async () => {
    const res = await getInvite(new Request(`${BASE}/api/invites/nope123456`), {
      params: Promise.resolve({ slug: 'nope123456' }),
    });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('not_found');
  });
});

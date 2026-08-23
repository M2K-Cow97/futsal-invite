import { expect, test, type Page } from '@playwright/test';

/**
 * 5화면 완주 스모크.
 * 특히 SC-004(싫어 버튼이 눌리지 않는다)와 SC-005(공격수 확정 불가)는
 * 회귀하면 앱의 재미가 깨지는 핵심 불변식이라 명시적으로 검증한다.
 */

function futureDate(daysAhead = 20): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

/** 주최자 흐름으로 초대장을 만들고 두 링크를 돌려준다. */
async function createInvite(page: Page) {
  await page.goto('/');

  const submit = page.getByRole('button', { name: /초대장 만들기/ });
  await expect(submit).toBeDisabled();

  await page.fill('#hostName', '경덕');
  await page.fill('#matchDate', futureDate());
  await page.fill('#matchTime', '19:00');
  await page.fill('#venue', 'OO풋살파크');
  await expect(submit).toBeEnabled();

  await submit.click();
  await page.waitForSelector('.link-box');

  return {
    inviteUrl: await page.locator('.link-box input').first().inputValue(),
    manageUrl: await page.locator('.link-box input').nth(1).inputValue(),
  };
}

test('주최자가 링크를 만들고 게스트가 5화면을 완주해 명단에 등록된다', async ({ page }) => {
  const { inviteUrl, manageUrl } = await createInvite(page);

  // ① invite
  await page.goto(inviteUrl);
  await expect(page.getByRole('heading', { name: /나랑 풋살할래/ })).toBeVisible();

  // ② siuuu
  await page.getByRole('button', { name: /좋아/ }).click();
  await expect(page.getByText(/좋siuuuuu/)).toBeVisible();

  // ③ matchday — 주최자가 정한 일정이 읽기 전용으로 보인다
  await page.getByRole('button', { name: /날짜 고르기/ }).click();
  await expect(page.getByText('OO풋살파크')).toBeVisible();

  const next = page.getByRole('button', { name: /다음/ });
  await expect(next).toBeDisabled(); // 이름 없으면 진행 불가
  await page.fill('#guestName', '민수');
  await expect(next).toBeEnabled();
  await next.click();

  // ④ position → ⑤ ticket
  await page.getByRole('button', { name: /미드필더/ }).click();
  await expect(page.locator('.ticket')).toBeVisible();
  await expect(page.locator('.ticket')).toContainText('민수');
  await expect(page.locator('.ticket')).toContainText('미드필더');
  await expect(page.locator('.ticket')).toContainText('OO풋살파크');

  // 주최자 명단에 반영 (SC-006)
  await page.goto(manageUrl);
  await expect(page.locator('.roster')).toContainText('민수');
  await expect(page.locator('.roster')).toContainText('미드필더');
});

test('SC-004: "싫어." 버튼은 도망가고 3회 후 "포기해." 가 되며 거절이 성립하지 않는다', async ({
  page,
}) => {
  const { inviteUrl } = await createInvite(page);
  await page.goto(inviteUrl);

  const no = page.locator('.invite-no');
  const before = await no.boundingBox();
  if (!before) throw new Error('싫어 버튼이 없습니다');

  // 실제 포인터를 버튼 위로 옮긴다 — 사람이 하는 동작과 같다.
  for (let i = 0; i < 3; i++) {
    const box = await no.boundingBox();
    if (!box) break;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(450);
  }

  const after = await no.boundingBox();
  if (!after) throw new Error('싫어 버튼이 사라졌습니다');
  const moved = Math.abs(after.x - before.x) > 5 || Math.abs(after.y - before.y) > 5;
  expect(moved, '버튼이 도망가야 한다').toBe(true);

  await expect(no).toHaveText('포기해.');

  // 강제로 눌러도 화면이 넘어가지 않아야 한다.
  await no.click({ force: true, timeout: 3000 }).catch(() => {});
  await expect(page.getByRole('heading', { name: /나랑 풋살할래/ })).toBeVisible();
});

test('SC-005: 공격수는 2단 팝업으로 막히고 어떤 경로로도 확정되지 않는다', async ({ page }) => {
  const { inviteUrl, manageUrl } = await createInvite(page);
  await page.goto(inviteUrl);

  await page.getByRole('button', { name: /좋아/ }).click();
  await page.getByRole('button', { name: /날짜 고르기/ }).click();
  await page.fill('#guestName', '공격수지망생');
  await page.getByRole('button', { name: /다음/ }).click();

  // 팝업① → "안할께.." 로 닫기
  await page.getByRole('button', { name: /공격수/ }).click();
  await expect(page.getByText(/정말 할거야/)).toBeVisible();
  await page.getByRole('button', { name: '안할께..' }).click();
  await expect(page.getByRole('heading', { name: '어떤 포지션 할꺼야?' })).toBeVisible();

  // 팝업① → "그래도 할래" → 팝업② → "돌아가기"
  await page.getByRole('button', { name: /공격수/ }).click();
  await page.getByRole('button', { name: '그래도 할래' }).click();
  await expect(page.getByText(/GOAT 공격수는 나뿐이야/)).toBeVisible();

  // 팝업②에는 "돌아가기" 하나뿐이다 — 확정 버튼이 존재하지 않는다.
  await expect(page.locator('.modal .btn')).toHaveCount(1);
  await page.getByRole('button', { name: '돌아가기' }).click();

  // 포지션 화면으로 돌아오고 티켓은 나오지 않는다.
  await expect(page.getByRole('heading', { name: '어떤 포지션 할꺼야?' })).toBeVisible();
  await expect(page.locator('.ticket')).toHaveCount(0);

  // 서버에도 FW 가 저장되지 않았다.
  await page.goto(manageUrl);
  await expect(page.getByText('아직 아무도 응답하지 않았어요 🥲')).toBeVisible();
});

test('없는 초대장은 404 안내 화면을 보여준다', async ({ page }) => {
  await page.goto('/i/doesnotexist');
  await expect(page.getByRole('heading', { name: /찾을 수 없어요/ })).toBeVisible();
});

test('잘못된 관리 링크는 404 안내 화면을 보여준다', async ({ page }) => {
  await page.goto('/m/definitely-not-a-real-token');
  await expect(page.getByRole('heading', { name: /잘못된 관리 링크/ })).toBeVisible();
});

/**
 * 모바일 터치 전용 회귀 테스트.
 * hover 가 없는 환경에서 "싫어." 버튼이 (a) "좋아!" 를 덮어 수락을 막거나
 * (b) 카운터 문구에 가려 탭이 안 먹는 문제가 있었다. 둘 다 게임을 멈춰버린다.
 */
test.describe('모바일 터치', () => {
  test.skip(({ isMobile }) => !isMobile, '터치 환경 전용');

  test('"싫어." 버튼이 "좋아!" 를 덮지 않는다', async ({ page }) => {
    const { inviteUrl } = await createInvite(page);
    await page.goto(inviteUrl);

    const no = page.locator('.invite-no');
    const yes = page.locator('.invite-yes');

    // 도망은 FLEE_LIMIT(3)회까지. 그 뒤엔 거절 관문이 열리므로 3회 안에서 검증한다.
    for (let i = 0; i < 3; i++) {
      await no.tap();
      await page.waitForTimeout(400);

      const n = await no.boundingBox();
      const y = await yes.boundingBox();
      if (!n || !y) throw new Error('버튼을 찾을 수 없습니다');

      const overlapping = !(
        n.x + n.width < y.x ||
        y.x + y.width < n.x ||
        n.y + n.height < y.y ||
        y.y + y.height < n.y
      );
      expect(overlapping, `${i + 1}회차에서 "좋아!" 와 겹쳤다`).toBe(false);
    }

    // 도망친 뒤에도 수락은 가능해야 한다.
    await yes.tap();
    await expect(page.getByText(/좋siuuuuu/)).toBeVisible();
  });

  test('카운터 문구가 버튼 탭을 삼키지 않는다', async ({ page }) => {
    const { inviteUrl } = await createInvite(page);
    await page.goto(inviteUrl);

    const no = page.locator('.invite-no');
    // 카운터 문구가 나타난 뒤에도 탭이 계속 먹혀야 한다 (pointer-events: none).
    for (let i = 0; i < 3; i++) {
      await no.tap({ timeout: 3000 });
      await page.waitForTimeout(400);
    }
    await expect(no).toHaveText('포기해.');

    // 도망이 끝나면 탭이 거절 관문을 연다 — 여기서도 탭이 막히면 안 된다.
    await no.tap({ timeout: 3000 });
    await expect(page.locator('.lever-slider')).toBeVisible();
  });
});

/**
 * 거절 관문(미니게임) 회귀 테스트.
 * 4단계 전부 "깰 수 있어 보이지만 절대 못 깬다" 가 핵심이므로,
 * 각 단계가 성공 경로를 내주지 않는지 확인한다.
 */
test.describe('거절 관문', () => {
  /** 도망 3회 후 "포기해." 를 눌러 관문을 연다. */
  async function openGauntlet(page: import('@playwright/test').Page) {
    const { inviteUrl } = await createInvite(page);
    await page.goto(inviteUrl);

    const no = page.locator('.invite-no');
    for (let i = 0; i < 3; i++) {
      const box = await no.boundingBox();
      if (!box) break;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(420);
    }
    await expect(no).toHaveText('포기해.');
    await no.click({ force: true });
    await expect(page.locator('.lever-slider')).toBeVisible();
  }

  /** 슬라이더를 특정 값에 놓고 손을 뗀다. */
  async function setLever(page: import('@playwright/test').Page, v: number) {
    await page.locator('.lever-slider').evaluate((el, val) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(el, String(val));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, v);
    await page.evaluate(() =>
      document
        .querySelector('.lever-slider')!
        .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })),
    );
    await page.evaluate(() =>
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })),
    );
  }

  test('① 레버: 목표값에 정확히 맞춰도 달성 직전 배신당한다', async ({ page }) => {
    await openGauntlet(page);

    await setLever(page, 87.0);
    // 일단 "달성" 을 보여준다 — 이게 킹받는 지점이다.
    await expect(page.locator('.lever-msg')).toContainText('달성');
    // 그리고 곧 재교정으로 뒤집는다.
    await expect(page.locator('.lever-msg.bad')).toContainText('재교정');
    // 값이 목표에서 벗어난다.
    await expect(page.locator('.lever-value')).not.toHaveText('87.00', { timeout: 4000 });
  });

  /** 레버 → 기울기 → 프리킥 순서로 진행한다. */
  async function skipLever(page: import('@playwright/test').Page) {
    for (let i = 0; i < 4; i++) {
      await setLever(page, 20 + i);
      await page.waitForTimeout(320);
    }
    await page.getByRole('button', { name: '다른 방법으로 거절' }).click();
    await expect(page.locator('.tilt-track')).toBeVisible();
  }

  /** 기울기 단계: 공을 한 번 세워 배신을 유도하면 탈출 버튼이 열린다. */
  async function skipTilt(page: import('@playwright/test').Page) {
    // 시작 후 자동 조종으로 공을 목표 구역에 세운다 → 배신 → 탈출 버튼
    await page.locator('.modal-actions .btn').first().click();
    await page.evaluate(async () => {
      const ball = () => parseFloat(
        (document.querySelector('.tilt-ball') as HTMLElement).style.left,
      );
      for (let i = 0; i < 700; i++) {
        const g = Math.max(-25, Math.min(25, (50 - ball()) * 0.9));
        const e = new Event('deviceorientation');
        Object.defineProperty(e, 'gamma', { value: g });
        Object.defineProperty(e, 'beta', { value: 20 });
        window.dispatchEvent(e);
        await new Promise((r) => setTimeout(r, 30));
        if (document.querySelector('.btn-primary.btn-block')) return;
      }
    });
    await page.getByRole('button', { name: '다른 방법으로 거절' }).click();
  }

  test('② 기울기: 공을 세워도 센서 재보정으로 배신당한다', async ({ page }) => {
    await openGauntlet(page);
    await skipLever(page);

    await page.locator('.modal-actions .btn').first().click();

    // 자동 조종으로 공을 목표 구역에 세운다.
    const outcome = await page.evaluate(async () => {
      const ball = () =>
        parseFloat((document.querySelector('.tilt-ball') as HTMLElement).style.left);
      const msg = () => document.querySelector('.lever-msg')?.textContent ?? '';
      let sawAlmost = false;

      for (let i = 0; i < 700; i++) {
        const g = Math.max(-25, Math.min(25, (50 - ball()) * 0.9));
        const e = new Event('deviceorientation');
        Object.defineProperty(e, 'gamma', { value: g });
        Object.defineProperty(e, 'beta', { value: 20 });
        window.dispatchEvent(e);
        await new Promise((r) => setTimeout(r, 30));
        if (msg().includes('안정화')) sawAlmost = true;
        if (msg().includes('재보정')) return { sawAlmost, betrayed: true };
      }
      return { sawAlmost, betrayed: false };
    });

    // 일단 "안정화 완료" 를 보여준 뒤 재보정으로 뒤집는다.
    expect(outcome.sawAlmost, '안정화 메시지가 떠야 한다').toBe(true);
    expect(outcome.betrayed, '재보정으로 배신해야 한다').toBe(true);
  });

  test('② 기울기: 센서를 못 쓰는 환경에서는 드래그 폴백으로 동작한다', async ({ page }) => {
    // 카카오톡 인앱 브라우저를 흉내낸다 — 링크가 카톡으로 공유되므로 실제 기본 경로다.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) KAKAOTALK/10.5.0',
      });
    });
    await openGauntlet(page);
    await skipLever(page);

    // 센서를 시도하지 않고 손가락 모드로 안내해야 한다.
    await expect(page.locator('.lever-hint')).toContainText('카톡');
    await expect(page.locator('.modal-actions .btn').first()).toHaveText(/손가락/);

    await page.locator('.modal-actions .btn').first().click();

    // 드래그로 공이 실제로 움직여야 한다 (물리 루프가 폴백에서도 돌아야 함).
    const track = page.locator('.tilt-track');
    const box = await track.boundingBox();
    if (!box) throw new Error('트랙을 찾을 수 없습니다');
    const readBall = () =>
      page.locator('.tilt-ball').evaluate((el) => parseFloat((el as HTMLElement).style.left));

    const before = await readBall();
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
      await page.waitForTimeout(50);
    }
    const after = await readBall();
    expect(Math.abs(after - before), '드래그로 공이 움직여야 한다').toBeGreaterThan(10);
  });

  test('③ 프리킥: 어떤 파워로도 골이 인정되지 않는다', async ({ page }) => {
    await openGauntlet(page);
    await skipLever(page);
    await skipTilt(page);
    await expect(page.locator('.pitch')).toBeVisible();

    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /슛/ }).click();
      // 매번 실패 사유가 나온다.
      await expect(page.locator('.lever-msg.bad')).toBeVisible({ timeout: 4000 });
      const retry = page.getByRole('button', { name: '다시 차기' });
      if (i < 2) await retry.click();
    }
    await expect(page.getByRole('button', { name: '다른 방법으로 거절' })).toBeVisible();
  });

  test('④ 약관: 끝까지 읽어도 동의 체크박스가 활성화되지 않는다', async ({ page }) => {
    await openGauntlet(page);
    await skipLever(page);
    await skipTilt(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /슛/ }).click();
      await page.waitForTimeout(1150);
      const retry = page.getByRole('button', { name: '다시 차기' });
      if (await retry.isVisible()) await retry.click();
    }
    await page.getByRole('button', { name: '다른 방법으로 거절' }).click();

    // 키패드: 4회 틀리면 다음으로
    for (let i = 0; i < 4; i++) {
      for (const d of ['1', '2', '3']) {
        await page.locator('.keypad-key').filter({ hasText: new RegExp(`^${d}$`) }).first().click();
      }
      await page.locator('.keypad-key.ok').click();
      await page.waitForTimeout(950);
    }
    await page.getByRole('button', { name: '다른 방법으로 거절' }).click();
    await expect(page.locator('.terms-box')).toBeVisible();

    // 끝까지 스크롤해도 체크박스는 끝내 비활성이다.
    for (let i = 0; i < 4; i++) {
      await page.locator('.terms-box').evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await page.waitForTimeout(720);
    }
    await expect(page.locator('.terms-agree input')).toBeDisabled();

    // 결국 거절은 성립하지 않고 invite 화면으로 돌아온다.
    await page.locator('.modal-actions .btn').first().click();
    await expect(page.getByRole('heading', { name: /나랑 풋살할래/ })).toBeVisible();
    await expect(page.locator('.invite-yes')).toBeEnabled();
  });
});

import { expect, test, type Page } from '@playwright/test';

/**
 * 초대 흐름 스모크 + 거절 관문 회귀 테스트.
 *
 * 이 앱의 재미는 "거절이 절대 성립하지 않는다" 는 불변식에 걸려 있다.
 * 화면 문구와 연출은 자주 바뀌므로, 테스트는 **문구보다 구조**(클래스 마커)와
 * **불변식**(거절 불가·공격수 확정 불가·상한 도달 불가)에 걸어 둔다.
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

/** 초대 화면 → 포지션 화면까지. 게스트 이름을 넣고 진행한다. */
async function goToPosition(page: Page, guestName = '민수') {
  // ② 수락
  await page.getByRole('button', { name: /좋아/ }).click();
  await expect(page.locator('.media-box')).toBeVisible();

  // ③ 일정 확인 + 이름 입력
  await page.locator('.btn-accent').first().click();
  await expect(page.locator('#guestName')).toBeVisible();
  await page.fill('#guestName', guestName);

  // ④ 포지션
  await page.locator('.btn-primary.btn-block').first().click();
  await expect(page.locator('.position-grid')).toBeVisible();
}

test('주최자가 링크를 만들고 게스트가 완주해 명단에 등록된다', async ({ page }) => {
  const { inviteUrl, manageUrl } = await createInvite(page);

  await page.goto(inviteUrl);
  await expect(page.getByRole('heading', { name: /나랑 풋살할래/ })).toBeVisible();

  await goToPosition(page);

  // 미드필더로 확정 → 티켓
  await page.getByRole('button', { name: /미드필더/ }).click();
  await expect(page.locator('.ticket')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.ticket')).toContainText('민수');
  await expect(page.locator('.ticket')).toContainText('미드필더');
  await expect(page.locator('.ticket')).toContainText('OO풋살파크');

  // 주최자 명단에 반영 (SC-006)
  await page.goto(manageUrl);
  await expect(page.locator('.roster')).toContainText('민수');
  await expect(page.locator('.roster')).toContainText('미드필더');
});

test('SC-004: "싫어." 는 도망가고 3회 후 거절이 성립하지 않는다', async ({ page }) => {
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
  expect(
    Math.abs(after.x - before.x) > 5 || Math.abs(after.y - before.y) > 5,
    '버튼이 도망가야 한다',
  ).toBe(true);
  await expect(no).toHaveText('포기해.');

  // 강제로 눌러도 거절이 성립하지 않고 관문이 열린다.
  await no.click({ force: true });
  await expect(page.locator('.reason-list')).toBeVisible();
});

test('SC-005: 공격수는 4단 경고로 막히고 어떤 경로로도 확정되지 않는다', async ({ page }) => {
  const { inviteUrl, manageUrl } = await createInvite(page);
  await page.goto(inviteUrl);
  await goToPosition(page, '공격수지망생');

  // 1·2단은 "안할께.." 로 빠져나올 수 있다.
  await page.getByRole('button', { name: /공격수/ }).click();
  await expect(page.locator('.modal-text')).toBeVisible();
  await page.getByRole('button', { name: '안할께..' }).click();
  await expect(page.locator('.position-grid')).toBeVisible();

  // 끝까지 밀어붙인다: 1단 → 2단 → 3단 → 4단
  await page.getByRole('button', { name: /공격수/ }).click();
  await page.getByRole('button', { name: '그래도 할래' }).click();
  await page.getByRole('button', { name: '그래도 할래' }).click();

  // 3단에는 물러날 선택지만 남는다.
  await expect(page.locator('.modal-actions .btn')).toHaveCount(1);
  await page.getByRole('button', { name: '싫은데' }).click();

  // 4단도 마찬가지 — 확정 버튼이 존재하지 않는다.
  await expect(page.locator('.modal-actions .btn')).toHaveCount(1);
  await page.getByRole('button', { name: /다른 포지션/ }).click();

  // 포지션 화면으로 돌아오고 티켓은 나오지 않는다.
  await expect(page.locator('.position-grid')).toBeVisible();
  await expect(page.locator('.ticket')).toHaveCount(0);

  // 서버에도 FW 가 저장되지 않았다 — 명단은 비어 있어야 한다.
  await page.goto(manageUrl);
  await expect(page.locator('.roster')).toHaveCount(0);
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
 * 모바일 터치 전용 회귀.
 * hover 가 없는 환경에서 "싫어." 가 "좋아!" 를 덮어 수락을 막거나,
 * 카운터 문구에 가려 탭이 안 먹는 문제가 있었다. 둘 다 게임을 멈춰버린다.
 */
test.describe('모바일 터치', () => {
  test.skip(({ isMobile }) => !isMobile, '터치 환경 전용');

  test('"싫어." 버튼이 "좋아!" 를 덮지 않는다', async ({ page }) => {
    const { inviteUrl } = await createInvite(page);
    await page.goto(inviteUrl);

    const no = page.locator('.invite-no');
    const yes = page.locator('.invite-yes');

    // 도망은 3회까지. 그 뒤엔 관문이 열리므로 그 안에서 검증한다.
    for (let i = 0; i < 3; i++) {
      await no.tap();
      await page.waitForTimeout(420);

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
    await expect(page.locator('.media-box')).toBeVisible();
  });

  test('카운터 문구가 버튼 탭을 삼키지 않는다', async ({ page }) => {
    const { inviteUrl } = await createInvite(page);
    await page.goto(inviteUrl);

    const no = page.locator('.invite-no');
    // 카운터 문구가 나타난 뒤에도 탭이 계속 먹혀야 한다 (pointer-events: none).
    for (let i = 0; i < 3; i++) {
      await no.tap({ timeout: 3000 });
      await page.waitForTimeout(420);
    }
    await expect(no).toHaveText('포기해.');

    // 도망이 끝나면 탭이 관문을 연다 — 여기서도 막히면 안 된다.
    await no.tap({ timeout: 3000 });
    await expect(page.locator('.reason-list')).toBeVisible();
  });
});

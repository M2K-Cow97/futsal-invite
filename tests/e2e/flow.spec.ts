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

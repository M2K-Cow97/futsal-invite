import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    // Chromium 만 쓴다 — `npx playwright install chromium` 한 번으로 끝나게.
    // 실기기(모바일 사파리) 확인은 원본 기획대로 수동 1회 (constitution 개발 워크플로우).
    {
      // 실제 터치스크린 조건(hover 없음, coarse 포인터)으로 돌린다 —
      // "싫어." 버튼의 모바일 동작이 데스크톱과 근본적으로 다르기 때문이다.
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});

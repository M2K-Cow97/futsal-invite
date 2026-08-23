# Tasks: 풋살 초대장 링크 공유

**Feature**: 001-futsal-invite-link | **Date**: 2026-08-22

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md),
[contracts/api.md](./contracts/api.md)

`[P]` = 다른 `[P]` 태스크와 병렬 실행 가능(파일 충돌 없음).

---

## Phase 1: Setup

- [x] **T001** Next.js 프로젝트 초기화 — `package.json` 스크립트, `next.config.mjs`,
  `tsconfig.json`, `.gitignore`, `.env.example`
- [x] **T002** 의존성 설치 — next/react/drizzle-orm/@neondatabase/serverless/zod/nanoid/html2canvas,
  dev: typescript/@types/*/drizzle-kit/vitest/dotenv
- [x] **T003** `drizzle.config.ts` 작성 — Neon 연결, `lib/schema.ts` 를 스키마 소스로 지정

## Phase 2: 데이터 계층

- [x] **T004** `lib/schema.ts` — `position` enum, `invites`, `responses` 테이블 정의.
  `(invite_id, guest_name)` unique 제약 포함 (data-model.md 그대로)
- [x] **T005** `lib/db.ts` — Neon HTTP 드라이버 + Drizzle 클라이언트 (서버 전용)
- [x] **T006** `lib/ids.ts` — `newSlug()` 10자, `newManageToken()` 21자 (nanoid)
- [x] **T007** `lib/validation.ts` — Zod 스키마 3개
  (`createInviteSchema`, `createResponseSchema`), 과거 날짜 거부 로직 포함
- [x] **T008** 스키마 반영 확인 — Neon 은 `npm run db:push`,
  로컬은 `npm run db:local` 이 동일 DDL 을 적용한다

## Phase 3: API (User Story 1·2·3 기반)

- [x] **T009** `app/api/invites/route.ts` — `POST` 초대장 생성.
  검증 → slug/token 발급 → insert → 201 + 4개 URL (FR-001, FR-013)
- [x] **T010** [P] `app/api/invites/[slug]/route.ts` — `GET` 공개 정보.
  **`manage_token` 컬럼 미선택**, `isPast` 계산, 404 (FR-002, FR-006)
- [x] **T011** [P] `app/api/responses/route.ts` — `POST` 응답 upsert.
  `ON CONFLICT (invite_id, guest_name) DO UPDATE`, 경기 정보 동봉 반환 (FR-003, FR-004)
- [x] **T012** [P] `app/api/manage/[token]/route.ts` — `GET` 명단 + 포지션 집계 + total,
  잘못된 토큰 404 (FR-005, FR-006)

## Phase 4: 계약 테스트

- [x] **T013** [P] `tests/contract/invites.test.ts` — 생성 201, 과거 날짜 400,
  조회 200, **manageToken 미노출 검증**, 없는 slug 404
- [x] **T014** [P] `tests/contract/responses.test.ts` — 응답 200,
  재응답 시 행 수 불변 + position 갱신, 잘못된 position 400, 없는 slug 404
- [x] **T015** [P] `tests/contract/manage.test.ts` — 명단·집계 정확성,
  0건 응답 형태, 잘못된 토큰 404
- [x] **T016** `vitest.config.mts` + `tests/setup.ts` — PGlite(인프로세스 Postgres)로
  실제 UNIQUE 제약·ON CONFLICT 를 검증한다. 외부 DB 불필요

## Phase 5: 디자인 시스템 & 레이아웃

- [x] **T017** `app/globals.css` — 목업 기반 디자인 토큰
  (다크 그린 배경, 크림 카드, 노랑 액센트), 모바일 우선 반응형,
  `@keyframes` (호날두 킥, SIUUU 등장, 화면 전환 페이드)
- [x] **T018** `app/layout.tsx` — 루트 레이아웃, 한글 폰트, 기본 메타데이터

## Phase 6: User Story 1 — 초대받은 사람의 5화면 흐름 (P1, 핵심)

- [x] **T019** `components/screens/InviteScreen.tsx` — ① "나랑 풋살할래? ⚽".
  "싫어." 버튼 회피(`onMouseEnter`/`onTouchStart` → 킥 애니메이션 →
  `pointer-events:none` → 랜덤 좌표 이동), 회피 3회 후 "포기해.",
  진행 중 `onClick` 가드 (AC 1~3, SC-004)
- [x] **T020** [P] `components/screens/SiuuuScreen.tsx` — ② GIF + 사운드.
  `Audio.play()` 는 부모의 "좋아!" 클릭 핸들러에서 시작(자동재생 회피),
  실패 시 무음 진행. GIF 부재 시 이모지 플레이스홀더 (AC 4)
- [x] **T021** [P] `components/screens/MatchdayScreen.tsx` — ③ 일정.
  `editable`/`readonly` 2모드(설계 결정 2). readonly 에서 게스트 이름 입력,
  `isPast` 면 "이미 지난 경기예요" 표시 (AC 5~6, AC Story4-3)
- [x] **T022** [P] `components/screens/PositionScreen.tsx` — ④ 포지션 4버튼.
  MF/DF/GK 즉시 제출, FW 는 2단 팝업만 열고 **제출 경로 없음** (AC 7~11, SC-005)
- [x] **T023** [P] `components/screens/TicketScreen.tsx` — ⑤ 확정 티켓 카드 렌더링,
  `html2canvas` 동적 import 로 PNG 저장, 실패 시 안내 (AC 12)
- [x] **T024** `components/InviteFlow.tsx` — 5화면 전환 컨트롤러.
  `useState<Screen>` 하나로 토글, 포지션 확정 시 `POST /api/responses`,
  제출 중 로딩·에러 처리
- [x] **T025** `app/i/[slug]/page.tsx` — 서버 컴포넌트: 초대장 조회 →
  `InviteFlow` 에 주입. `generateMetadata` 로 OG 태그 (FR-011)
- [x] **T026** [P] `app/i/[slug]/not-found.tsx` — "초대장을 찾을 수 없어요" (AC Story4-1)
- [x] **T027** [P] `app/i/[slug]/loading.tsx` — Neon cold start 흡수용 스켈레톤 (research 결정 2)

## Phase 7: User Story 2 — 주최자 초대장 생성 (P1)

- [x] **T028** `app/page.tsx` — 홈. `MatchdayScreen` 의 `editable` 모드 재사용 +
  주최자 이름 입력. 4개 필드 미입력 시 버튼 disabled,
  제출 → 링크 2개 표시 (AC Story2-1~2, 4)
- [x] **T029** [P] `components/CopyLinkBox.tsx` — 링크 표시 + 클립보드 복사 +
  복사 완료 피드백 (AC Story2-3)

## Phase 8: User Story 3 — 참석자 명단 (P2)

- [x] **T030** `app/m/[token]/page.tsx` — 관리 화면. 경기 정보,
  포지션별 집계, 참석자 목록, 0건 안내, 새로고침 버튼 (AC Story3-1~2)
- [x] **T031** [P] `app/m/[token]/not-found.tsx` — 잘못된 토큰 404 화면 (AC Story3-3)

## Phase 9: 에셋 폴백 & 마감

- [x] **T032** 에셋 폴백 유틸 — 이미지 `onError` → 이모지 플레이스홀더,
  사운드 재생 실패 무시 (Edge Cases)
- [x] **T033** `public/assets/README.md` — 사용자가 넣을 에셋 파일명·용도 안내
- [x] **T034** 반응형 검증 — 390px(모바일) / 1280px(데스크톱) 5화면 레이아웃 (SC-003)

## Phase 10: E2E & 배포

- [x] **T035** `tests/e2e/flow.spec.ts` — Playwright 스모크:
  링크 생성 → 5화면 완주 → 명단 반영 확인. SC-004("싫어" 클릭 불가)와
  SC-005(공격수 확정 불가)를 명시적으로 검증
- [x] **T036** `README.md` — 프로젝트 개요, spec-kit 산출물 링크, 로컬 실행·배포 요약
- [x] **T037a** 로컬 개발용 DB 스크립트 (`scripts/local-db.mjs`, `npm run db:local`) —
  Neon 계정 없이도 앱을 돌려볼 수 있게
- [ ] **T037b** Vercel 배포 + 환경변수 설정 + 실기기(모바일 사파리) 1회 확인 — **사용자 작업**

---

## 의존 관계

```text
Setup (T001-T003)
   ↓
데이터 계층 (T004-T008)
   ↓
API (T009-T012) ──────────▶ 계약 테스트 (T013-T016)
   ↓
디자인 시스템 (T017-T018)
   ↓
Story1 화면 (T019-T023) ──▶ InviteFlow (T024) ──▶ 라우트 (T025-T027)
   ↓                                                    ↓
Story2 홈 (T028-T029)                                   │
   ↓                                                    │
Story3 명단 (T030-T031)                                 │
   ↓                                                    ↓
마감 (T032-T034) ──────────────────────▶ E2E·배포 (T035-T037)
```

## MVP 경계

**T001~T027 + T028** 까지가 최소 동작 제품이다.
이 지점에서 주최자가 링크를 만들고 초대받은 사람이 5화면을 완주해 응답이 저장된다.
T030(명단)은 P2 로, 없어도 초대는 성립한다.

---

## 검증 결과 (2026-08-22)

로컬에서 실제 서버·DB 를 띄워 전 구간을 확인했다.

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | 통과 |
| `npx next build` | 통과 — 8개 라우트, First Load JS 103kB |
| `npm test` (계약) | **22/22 통과** (PGlite = 실제 Postgres 18) |
| `npm run test:e2e` | **18/18 통과** (mobile 터치 390px + desktop 1280px, 2건은 데스크톱에서 skip) |
| API 수동 확인 | 생성·조회·upsert·404 전부 기대대로 |

E2E 가 검증한 핵심 불변식:
- **SC-004** — "싫어." 버튼이 실제로 도망가고(좌표 이동 확인), 3회 후 "포기해." 로 바뀌며,
  강제 클릭(`force: true`)에도 거절이 성립하지 않는다
- **SC-005** — 공격수는 팝업①·② 양쪽 경로 모두에서 확정되지 않고,
  서버 명단도 "아직 아무도 응답하지 않았어요" 로 남는다
- **FR-002** — 공개 API 응답에 `manageToken` 이 포함되지 않는다 (문자열 수준으로 검사)
- **SC-006** — 게스트 응답이 주최자 명단에 반영된다

발견·수정한 이슈:
- `@/` 경로 별칭이 webpack 에서 해석되지 않아 `next.config.mjs` 에 명시적 alias 추가
- TypeScript 7 이 Next 15 와 비호환 → TS 6 으로 고정, 폐기된 `baseUrl` 제거
- 팝업 백드롭이 밝은 카드 위에서 충분히 어둡지 않아 불투명도 55% → 72% 로 조정
- `drizzle-orm` 이 devDependencies 에 있어 배포 시 빌드가 깨질 상태였던 것을 dependencies 로 이동

### 모바일 터치 검증 (추가)

실제 터치 프로파일(`hasTouch: true`, hover 없음)로 재검증하면서 3건을 발견·수정했다.
데스크톱 hover 로만 테스트했을 때는 드러나지 않던 문제들이다.

1. **"싫어." 가 "좋아!" 를 덮었다** — 2회차부터 겹쳐 수락 자체가 막힐 수 있었다.
   → 좌표 재추첨(최대 24회, 10px 여유)으로 해결. 20회 반복 시 겹침 0회, 최소 간격 13px
2. **카운터 문구가 탭을 삼켰다** — 버튼이 문구 아래로 도망가면 눌려도 반응이 없어 게임이 멈췄다.
   → `.flee-count { pointer-events: none }`. 25회 연속 탭 막힘 0회
3. **모바일에선 눌러야만 도망갔다** — hover 가 없어 "닿기 전에 피하는" 재미가 사라졌다.
   → `touchmove` 근접 감지(46px)를 터치 기기에만 등록

회귀 방지용 모바일 전용 E2E 2건을 추가했다 (`tests/e2e/flow.spec.ts` 의 `모바일 터치` describe).
Playwright `mobile` 프로젝트도 `hasTouch: true` 로 바꿔 앞으로는 터치 조건에서 검증된다.

---

## 추가 기능: 거절 관문 (2026-08-22)

모바일에는 hover 가 없어 도망가는 버튼만으로는 재미가 약하다는 피드백을 받아
회피 3회 이후 4단계 미니게임이 거절을 막는 구조를 추가했다.

- [x] **T038** `components/reject/types.ts` · `RejectShell.tsx` — 공용 타입과 팝업 껍데기
- [x] **T039** `LeverStage.tsx` — 정밀 레버. 87.00 달성 시 "달성" → "재교정" 배신,
  손 뗄 때 흔들림(가까울수록 크게)
- [x] **T040** [P] `FreekickStage.tsx` — 파워 게이지 왕복 + 항상 실패. 핑계 6종 랜덤
- [x] **T041** [P] `KeypadStage.tsx` — 메시 집 버튼키. 항상 오답, 힌트 자리수가 매번 바뀜
- [x] **T042** [P] `TermsStage.tsx` — 장문 약관. 끝에 닿으면 조항 +25 & 위로 튕김,
  3회 후 "동의 버튼이 존재하지 않습니다". 체크박스 영구 비활성
- [x] **T043** `RejectGauntlet.tsx` — 4단계 순서 컨트롤러
- [x] **T044** `InviteScreen.tsx` 연결 — 회피 3회 후 도망 중단, "포기해." 탭 시 관문 오픈
- [x] **T045** `app/globals.css` — 미니게임 4종 스타일 (피치·게이지·키패드·약관)
- [x] **T046** E2E 3건 추가 — 레버 배신, 프리킥 항상 실패, 약관 체크박스 영구 비활성

검증: E2E **18/18 통과**, 계약 22/22 유지, 빌드 통과
(`/i/[slug]` First Load JS 106kB → 110kB, 미니게임 4종 추가분 3.6kB).
4단계 전부 성공 경로가 없음을 실제 플레이로 확인했다 (레버 87.00 → 48.05 리셋 등).

---

## 추가: 기울기 센서 단계 (2026-08-23)

"모바일이니까 각도 같은 걸 쓸 수 있나" 질문에서 출발해 거절 관문 ②로 추가했다.

- [x] **T047** `lib/tilt.ts` — 센서 감지·권한 요청·구독·진동 래퍼
- [x] **T048** `components/reject/TiltStage.tsx` — 폰을 기울여 공을 목표 구역에
  2초간 세우는 게임. 세우면 "안정화 완료" → "센서 오차 감지, 재보정" 으로 배신
- [x] **T049** 관문 순서에 삽입 (`lever → tilt → freekick → keypad → terms`)
- [x] **T050** E2E 2건 추가 — 배신 발동, 드래그 폴백 동작

### 센서 제약 (조사 결과 반영)

웹에서 자이로를 쓰려면 제약이 많다. 조사해서 코드에 반영했다.

| 제약 | 대응 |
|---|---|
| **HTTPS 필수** (secure context). Android Chrome 은 M76 부터 http 에서 제거 | `isSecureContext` 검사 → `insecure` 상태로 드래그 폴백. 로컬 테스트는 mkcert + `--experimental-https` |
| **iOS 는 `requestPermission()` 필요** (Safari iOS 14.5+), 사용자 제스처 안에서만 | "센서 켜고 시작" 탭 핸들러에서 호출 |
| **iOS 권한은 단 한 번**. 거부되면 프로그램으로 재요청 불가 | 인앱 브라우저·http 는 **요청 자체를 하지 않고** 폴백으로 보내 기회를 낭비하지 않는다 |
| **카카오톡 iOS WKWebView 는 모션을 막을 수 있다** (호스트 앱이 델리게이트 미구현 시 프롬프트 없이 denied) | UA 로 `KAKAOTALK` 감지 → 드래그 폴백 + "⋯ → 다른 브라우저로 열기" 안내. **링크를 카톡으로 공유하는 앱이라 이게 기본 경로다** |
| `gamma` 는 폰을 세우면 짐벌락으로 부호가 뒤집힘 | `beta` 절대값 75도 초과 시 입력 무시, `gamma` 는 ±45도만 유효 범위로 |
| **iOS 는 `navigator.vibrate` 미지원** (iOS 26 기준) | 햅틱에 의존하는 연출을 만들지 않음. 있으면 보너스 |

### 발견·수정한 버그

- **드래그 폴백에서 공이 움직이지 않았다** — 물리 루프가 `phase === 'playing'` 만
  검사해 `'fallback'` 에서는 아예 돌지 않았다. 카톡으로 들어온 사용자는 죽은 화면을 봤을 것이다.
  두 모드 모두 루프를 돌리고, 배신 후 원래 모드로 복귀하도록 `modeRef` 추가
- **난이도가 과했다** — gamma 30도에 공이 벽에서 벽으로 1초에 튕겼다(제어 불가).
  가속 0.055→0.012, 감쇠 0.965→0.9 로 조정해 약 4.6초에 세울 수 있게 맞췄다
- **탈출이 너무 늦었다** — 1회 시도가 ~5초라 3회 실패 요구는 지루했다. 1회로 완화

검증: E2E **12/12**(mobile), 계약 22/22, 빌드 통과 (`/i/[slug]` 110→111kB)

# Implementation Plan: 풋살 초대장 링크 공유

**Branch**: `001-futsal-invite-link` | **Date**: 2026-08-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-futsal-invite-link/spec.md`

## Summary

주최자가 경기 정보를 입력해 초대 링크를 만들고, 초대받은 사람이 그 링크에서 원본 목업의
5화면 장난 흐름을 겪은 뒤 참석자로 등록되는 웹앱.

기술적으로는 Next.js App Router 단일 배포 단위에 Route Handler 로 4개 API 를 두고,
Neon Postgres 에 Invite/Response 두 테이블만 둔다. 5화면 전환은 서버 왕복 없이
클라이언트 컴포넌트 하나에서 상태 토글로 처리한다 — 원본 기획의 "단일 페이지 화면 전환"
구조를 그대로 유지하되, 진입 시 초대장 데이터를 서버에서 주입하고 포지션 확정 시 POST 한 번을 보낸다.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Vercel 런타임)

**Primary Dependencies**: Next.js 15 (App Router), React 19, Drizzle ORM,
`@neondatabase/serverless`, Zod (입력 검증), `html2canvas` (티켓 PNG), `nanoid` (slug/token)

**Storage**: Neon Postgres (Free tier). 테이블 2개: `invites`, `responses`

**Testing**: Vitest — API 계약 테스트만. UI 애니메이션은 Playwright 스모크 1본 + 수동 확인

**Target Platform**: 모바일 웹 우선 (iOS Safari / Android Chrome), 데스크톱 중앙정렬 카드

**Project Type**: Web application (프론트 + API 통합 단일 Next.js 앱)

**Performance Goals**: 링크 열기 → invite 화면 표시 p95 < 2s (Neon cold start 포함).
애니메이션 60fps (CSS transform 만 사용, layout 유발 속성 회피)

**Constraints**: Vercel Hobby + Neon Free 한도. 크론/워커/WebSocket 없음.
번들에 무거운 라이브러리 추가 금지 (`html2canvas` 는 티켓 화면 진입 시 동적 import)

**Scale/Scope**: 초대장 수십 건, 초대장당 응답 < 20건. 화면 5개 + 주최자 화면 2개

## Constitution Check

*GATE: Phase 0 이전 통과 필수. Phase 1 설계 후 재확인.*

| 원칙 | 준수 | 근거 |
|---|---|---|
| I. 목업이 진실이다 | ✅ | 5화면 순서·문구·인터랙션을 spec AC 1~12 로 고정. matchday 만 입력→읽기전용으로 변경(초대받는 사람은 일정을 정하지 않음 — 주최자 화면에서 동일 입력 UI 를 재사용해 목업 보존) |
| II. 링크 하나로 완결 | ✅ | 인증 없음. slug = 열람+응답 권한, manage_token = 명단 조회 권한. OG 태그로 카톡 미리보기 |
| III. 서버는 최소한만 | ✅ | API 4개(POST 초대장, GET 초대장, POST 응답, GET 명단). 애니메이션·화면전환·사운드는 전부 클라이언트. 전역 스토어 없음 (`useState` 하나) |
| IV. 무료 티어 | ✅ | Vercel Hobby, Neon Free. cold start 는 로딩 스켈레톤으로 흡수. 폴링/실시간 없음 |
| V. 장난 페이지 수준 보안 | ✅ | token 은 nanoid 21자(~125bit). Zod 전량 검증. React 기본 이스케이프(`innerHTML` 미사용). rate limit 은 무료 범위에서 생략하고 입력 길이·건수 상한으로 대체 |

**복잡도 정당화**: Drizzle ORM 도입 — 생 SQL 금지(원칙 기술제약) 준수와
타입 안전 확보를 위해. 마이그레이션은 `drizzle-kit push` 로 단순 유지.

## Project Structure

### Documentation (this feature)

```text
specs/001-futsal-invite-link/
├── plan.md              # 이 문서
├── spec.md              # 무엇을/왜
├── research.md          # Phase 0: 기술 결정 근거
├── data-model.md        # Phase 1: 엔티티·스키마
├── quickstart.md        # Phase 1: 로컬 실행·배포 절차
├── contracts/
│   └── api.md           # Phase 1: API 계약
└── tasks.md             # Phase 2 (/speckit-tasks 산출)
```

### Source Code (repository root)

```text
app/
├── layout.tsx                    # 루트 레이아웃, 폰트, 전역 스타일
├── page.tsx                      # 주최자: 초대장 생성 폼 (Story 2)
├── globals.css                   # 디자인 토큰 + 5화면 스타일 + keyframes
├── i/[slug]/
│   ├── page.tsx                  # 서버: 초대장 조회 + OG 메타 생성
│   └── not-found.tsx             # 없는 초대장 안내
├── m/[token]/
│   └── page.tsx                  # 주최자: 참석자 명단 (Story 3)
└── api/
    ├── invites/route.ts          # POST 초대장 생성
    ├── invites/[slug]/route.ts   # GET 공개 정보
    ├── responses/route.ts        # POST 참석 응답 (upsert)
    └── manage/[token]/route.ts   # GET 명단 + 집계

components/
├── InviteFlow.tsx                # 5화면 전환 컨트롤러 (클라이언트, 핵심)
├── screens/
│   ├── InviteScreen.tsx          # ① 싫어 버튼 도망
│   ├── SiuuuScreen.tsx           # ② GIF + 사운드
│   ├── MatchdayScreen.tsx        # ③ 일정 표시(읽기전용)
│   ├── PositionScreen.tsx        # ④ 포지션 + 2단 팝업
│   └── TicketScreen.tsx          # ⑤ 티켓 + PNG 저장
└── CopyLinkBox.tsx               # 링크 복사 UI

lib/
├── db.ts                         # Neon + Drizzle 클라이언트
├── schema.ts                     # Drizzle 테이블 정의
├── validation.ts                 # Zod 스키마
└── ids.ts                        # slug/token 생성

tests/
├── contract/
│   ├── invites.test.ts           # 생성·조회 계약
│   ├── responses.test.ts         # 응답 upsert 계약
│   └── manage.test.ts            # 명단·404 계약
└── e2e/
    └── flow.spec.ts              # Playwright: 5화면 완주 스모크

public/assets/                    # siu.gif 등 (사용자 제공, 부재 시 플레이스홀더)
drizzle/                          # 마이그레이션 산출물
```

## 핵심 설계 결정

### 1. 5화면을 클라이언트 단일 컴포넌트로 유지

원본 기획의 `state = { currentScreen }` 토글 구조를 그대로 가져온다.
`InviteFlow.tsx` 가 `useState<Screen>('invite')` 하나를 들고 5개 자식을 조건 렌더링한다.
서버 컴포넌트(`app/i/[slug]/page.tsx`)는 초대장 데이터를 fetch 해 props 로 주입만 한다.

**이유**: 화면 전환마다 라우팅하면 애니메이션 연속성과 사운드 재생 컨텍스트가 깨진다.
특히 AC-4(클릭 이벤트 내 `Audio.play()`)는 같은 유저 제스처 안에서 실행돼야 하므로
네비게이션을 끼울 수 없다.

### 2. matchday 화면의 역할 분리

목업 ③은 날짜/시간/구장을 **입력**하는 화면이다. 하지만 링크 공유 모델에서는
일정을 주최자가 이미 정했으므로 초대받은 사람은 입력하지 않는다.

**결정**: 동일한 UI 컴포넌트를 두 모드로 쓴다.
- 주최자 홈(`/`) → `editable` 모드: 목업 그대로 date/time/text 입력 + 미입력 시 disabled
- 초대 흐름 ③ → `readonly` 모드: 같은 카드 레이아웃에 값만 표시 + 게스트 이름 입력 1개 추가

이렇게 목업의 화면 디자인은 보존되고(원칙 I), 입력 UI 도 버려지지 않는다.
게스트 이름을 여기서 받는 이유: ticket 화면에 이름이 필요하고, position 클릭이
곧 최종 제출이므로 그 전에 받아야 한다.

### 3. "싫어." 버튼 회피 구현

- 데스크톱: `onMouseEnter`, 모바일: `onTouchStart`
- 핸들러에서 ① 킥 애니메이션 클래스 부여 ② `pointer-events: none` 즉시 적용
  ③ 컨테이너 경계 내 랜덤 좌표로 `transform: translate()` ④ 애니메이션 후 `pointer-events` 복구
- `position: absolute` + 컨테이너 `position: relative`, 좌표는 버튼 크기를 뺀 범위에서 계산
- 회피 카운터 3 이상이면 라벨을 "포기해." 로

**클릭 방지 보강**: `onClick` 에도 가드를 둬서 회피 애니메이션 진행 중이면 무시한다.
빠른 탭으로 `touchstart` → `click` 이 연속 발생하는 모바일 케이스 대비 (AC-2, SC-004).

**모바일(hover 없음) 처리** — 목업은 hover 를 전제하지만 터치 기기에는 hover 가 없다.
`touchstart` 만 쓰면 "눌러야 도망가는" 사후 반응이 되어 재미가 반감된다. 그래서
아레나에 `touchmove` 리스너를 달아 손가락이 버튼 중심 46px 안으로 들어오면 미리 피한다.
`matchMedia('(hover: hover)')` 로 분기해 마우스 기기에는 등록하지 않는다.

**"좋아!" 가림 방지** — 랜덤 좌표가 "좋아!" 버튼과 겹치면 수락 자체가 막힌다(치명적).
후보 좌표를 최대 24회 재추첨해 10px 여유를 두고 겹침을 피하고, 그래도 못 찾으면
아레나 최하단으로 밀어낸다. 카운터 문구(`.flee-count`)는 `pointer-events: none` 으로
도망간 버튼 위에 겹쳐도 탭을 삼키지 않게 한다.

### 3-b. 거절 관문 (모바일 대응의 핵심)

도망가는 버튼은 hover 를 전제한 인터랙션이라 모바일에서 재미가 크게 떨어진다.
근접 감지로 보완했지만 근본적으로 약하다. 그래서 **회피 3회 이후에는 도망을 멈추고
4단계 미니게임이 거절을 막는다**.

설계 원칙: **깰 수 있어 보이지만 절대 못 깬다.** 명백히 불가능하면 바로 포기하지만,
"거의 됐는데!" 싶으면 계속 매달린다. 그래서 모든 단계는 성공 직전까지 도달하게 하고
마지막 순간에 배신한다.

| 단계 | 컴포넌트 | 배신 방식 |
|---|---|---|
| ① 정밀 레버 | `LeverStage` | 87.00 에 맞추면 "달성" 을 보여준 뒤 "장치 재교정" 으로 리셋. 손을 뗄 때마다 바늘이 흔들리고, 가까울수록 더 크게 흔들린다 |
| ② 거절 프리킥 | `FreekickStage` | 파워 게이지에 스윗스팟(75~81%)이 있지만 결과와 무관하다. 매번 다른 핑계(키퍼 선방·VAR 오프사이드·바람)로 실패 |
| ③ 메시 집 버튼키 | `KeypadStage` | 무엇을 넣어도 오답. 힌트의 자리수가 시도마다 바뀐다("6자리" → "아 죄송합니다, 8자리") |
| ④ 장문 약관 | `TermsStage` | 끝에 닿으면 조항이 25개 늘고 위로 튕긴다. 3회 반복 후 "동의 버튼이 존재하지 않습니다". 체크박스는 영구 `disabled` |

**구조**: `RejectGauntlet` 이 `ORDER` 배열의 인덱스만 들고 스테이지를 교체한다.
각 스테이지는 일정 횟수 실패 후 "다른 방법으로 거절"(다음 단계) 버튼을 노출하고,
모든 단계에 "그냥 할래"(관문 닫기) 탈출구가 있다 — 갇힌 느낌은 재미가 아니라 짜증이다.

**FR-008b 준수**: 어느 스테이지에도 거절을 성립시키는 코드 경로가 없다.
`onClose` 는 invite 화면 복귀뿐이며, 거절 상태를 만들지 않는다.

### 4. 공격수는 절대 확정되지 않는다

`PositionScreen` 에서 FW 클릭은 `submit()` 을 호출하지 않고 팝업 상태만 바꾼다.
팝업①의 "그래도 할래" → 팝업②, 팝업②의 "돌아가기" → 팝업 닫기.
**어떤 분기에도 `submit('FW')` 경로가 존재하지 않는다** (SC-005).
서버 스키마는 FW 를 유효값으로 받지만(데이터 모델 일관성), 클라이언트가 보내지 않는다.

### 5. 응답 upsert

`(invite_id, guest_name)` 에 unique 제약을 걸고
`INSERT ... ON CONFLICT (invite_id, guest_name) DO UPDATE SET position, updated_at`
로 처리한다 (FR-004). 애플리케이션 레벨 select-then-insert 는 경쟁 조건이 생기므로 쓰지 않는다.

### 6. 관리 토큰 노출 방지

`GET /api/invites/[slug]` 응답과 `app/i/[slug]/page.tsx` 의 props 에서
`manage_token` 을 select 하지 않는다 (컬럼 자체를 쿼리에서 제외 — FR-002).
Drizzle 의 명시적 컬럼 선택으로 실수를 구조적으로 막는다.

### 7. 에셋 부재 대응

`public/assets/*` 파일이 없어도 동작해야 한다(원칙 기술제약).
- 이미지: `<img onError>` 로 이모지 플레이스홀더로 교체
- 사운드: `Audio.play()` 의 rejected promise 를 `.catch(() => {})` 로 무음 진행

## Phase 0 → Phase 1 산출물

- [research.md](./research.md) — 무료 티어 스택 비교, Neon cold start 대응, html2canvas 선택 근거
- [data-model.md](./data-model.md) — 테이블 DDL, 인덱스, 제약
- [contracts/api.md](./contracts/api.md) — 4개 엔드포인트 요청/응답/에러
- [quickstart.md](./quickstart.md) — 로컬 실행, Neon 연결, Vercel 배포 절차

## Constitution Re-Check (Phase 1 이후)

설계 확정 후 재검토 결과: 위반 없음.
- 원칙 I 관련해 matchday 를 2모드로 나눈 것은 목업 디자인을 보존하는 방향이므로 준수로 판단
- 추가 의존성은 4개(drizzle, neon, zod, html2canvas, nanoid)로 모두 목적이 명확하며
  전역 스토어·캐시 레이어는 도입하지 않음 (원칙 III)

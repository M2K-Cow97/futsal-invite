# futsal-invite ⚽

풋살 초대장을 만들어 링크로 공유하는 웹앱.
초대받은 사람은 **"싫어." 버튼이 도망가는** 장난 흐름을 거쳐 참석자로 등록된다.

원본 기획([`docs/2026-08-08-design.md`](docs/2026-08-08-design.md),
[`docs/기획-목업-전체.png`](docs/기획-목업-전체.png))의 5화면 정적 페이지를
[spec-kit](https://github.com/github/spec-kit) 워크플로우로 서버·DB 기반 앱으로 확장했다.

## 어떻게 동작하나

```text
주최자                                    초대받은 사람
─────                                    ────────────
/ 에서 날짜·시간·구장·이름 입력
  ↓
공유 링크 + 관리 링크 발급
  ↓ 카톡으로 공유 ──────────────────▶  /i/{slug} 열기
                                           ↓
                                        ① 나랑 풋살할래? ⚽
                                           "싫어." 는 도망간다 (3회 후 "포기해.")
                                           ↓ "좋아! 🙌"
                                        ② 나도 좋siuuuuu 🔥
                                           ↓
                                        ③ Match Day — 정해진 일정 확인 + 이름 입력
                                           ↓
                                        ④ 포지션 선택
                                           공격수는 2단 팝업으로 막힘 🐐
                                           ↓
                                        ⑤ 확정 티켓 → PNG 저장
  ↓                                        ↓
/m/{token} 에서 참석자 명단 확인 ◀────── 응답 저장
```

## 스택

전부 무료 티어, 카드 등록 불필요.

| 역할 | 기술 |
|---|---|
| 프론트 + API | Next.js 15 (App Router) on **Vercel Hobby** |
| DB | **Neon Postgres** (Free) + Drizzle ORM |
| 검증 | Zod |
| 티켓 이미지 | html2canvas (티켓 화면 진입 시 동적 로드) |
| 테스트 | Vitest (계약, PGlite 인프로세스 Postgres) + Playwright (E2E) |

## 빠른 시작

```bash
npm install
cp .env.example .env.local     # DATABASE_URL 에 Neon 연결 문자열 입력
npm run db:push                # 테이블 생성
npm run dev                    # http://localhost:3000
```

Neon 발급부터 Vercel 배포까지 전체 절차는
[`specs/001-futsal-invite-link/quickstart.md`](specs/001-futsal-invite-link/quickstart.md) 참고.

## 테스트

```bash
npm test                       # API 계약 22건 (외부 DB 불필요 — PGlite 사용)
npm run test:e2e               # 5화면 완주 E2E (dev 서버 실행 중이어야 함)
```

E2E 는 `SC-004`(싫어 버튼이 눌리지 않는다)와 `SC-005`(공격수 확정 불가)를
명시적으로 검증한다 — 회귀하면 앱의 재미가 깨지는 핵심 불변식이다.

## spec-kit 산출물

이 프로젝트는 spec-kit 워크플로우를 실제로 밟아 만들었다.

| 단계 | 문서 |
|---|---|
| Constitution | [`.specify/memory/constitution.md`](.specify/memory/constitution.md) — 5개 원칙 |
| Specify | [`specs/001-futsal-invite-link/spec.md`](specs/001-futsal-invite-link/spec.md) — 유저 스토리 4개, FR 13개, SC 7개 |
| Plan | [`plan.md`](specs/001-futsal-invite-link/plan.md) — 기술 설계, 헌법 준수 검토 |
| Phase 0 | [`research.md`](specs/001-futsal-invite-link/research.md) — 스택 비교, cold start 대응 |
| Phase 1 | [`data-model.md`](specs/001-futsal-invite-link/data-model.md) · [`contracts/api.md`](specs/001-futsal-invite-link/contracts/api.md) · [`quickstart.md`](specs/001-futsal-invite-link/quickstart.md) |
| Tasks | [`tasks.md`](specs/001-futsal-invite-link/tasks.md) — T001~T037 |

## 구조

```text
app/
├── page.tsx              주최자: 초대장 생성
├── i/[slug]/             게스트: 5화면 흐름 (OG 메타태그 포함)
├── m/[token]/            주최자: 참석자 명단
└── api/                  invites · responses · manage
components/
├── InviteFlow.tsx        5화면 전환 컨트롤러 (useState 하나)
└── screens/              ①~⑤ 화면
lib/                      db · schema · validation · ids · sound
```

## 에셋

`public/assets/` 에 GIF·사운드·이미지를 넣으면 목업 그대로 보인다.
**없어도 동작한다** — 이모지 플레이스홀더와 무음으로 대체된다.
자세한 내용은 [`public/assets/README.md`](public/assets/README.md).

## 알려진 제약

- **Neon cold start**: 5분 유휴 후 첫 요청이 ~1초 느리다. 스켈레톤으로 흡수한다.
- **실시간 갱신 없음**: 주최자는 새로고침으로 명단을 확인한다.
- **초대장 수정·삭제 없음**, 정원 관리·알림·로그인 없음 (spec Out of Scope).
- 링크를 아는 사람은 누구나 응답할 수 있다 — 의도된 동작이다.

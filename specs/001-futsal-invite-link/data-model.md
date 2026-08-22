# Phase 1: Data Model

**Feature**: 001-futsal-invite-link | **Date**: 2026-08-22

테이블 2개. 원칙 III(서버는 최소한만)에 따라 정규화를 더 쪼개지 않는다.

## ERD

```text
┌─────────────────────────────┐
│ invites                     │
├─────────────────────────────┤
│ id            serial PK     │
│ slug          text UNIQUE   │◄── 공유 링크 /i/{slug}
│ manage_token  text UNIQUE   │◄── 관리 링크 /m/{token}  (외부 노출 금지)
│ host_name     varchar(20)   │
│ match_date    date          │
│ match_time    time          │
│ venue         varchar(50)   │
│ created_at    timestamptz   │
└──────────────┬──────────────┘
               │ 1
               │
               │ N
┌──────────────┴──────────────┐
│ responses                   │
├─────────────────────────────┤
│ id            serial PK     │
│ invite_id     int FK→invites│ ON DELETE CASCADE
│ guest_name    varchar(20)   │
│ position      position_enum │  'FW' | 'MF' | 'DF' | 'GK'
│ created_at    timestamptz   │
│ updated_at    timestamptz   │
├─────────────────────────────┤
│ UNIQUE (invite_id, guest_name)  ◄── upsert 충돌 대상
└─────────────────────────────┘
```

## invites

하나의 풋살 경기 초대장. 주최자가 생성하고 이후 변경되지 않는다(수정은 Out of Scope).

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | serial | PK | 내부 식별자. URL 에 노출하지 않는다 |
| `slug` | text | NOT NULL, UNIQUE | nanoid 10자. 공유 링크에 쓰인다 |
| `manage_token` | text | NOT NULL, UNIQUE | nanoid 21자(~126bit). **어떤 공개 응답에도 포함하지 않는다** |
| `host_name` | varchar(20) | NOT NULL | 주최자 이름. invite 화면에 표시 |
| `match_date` | date | NOT NULL | 경기 날짜 |
| `match_time` | time | NOT NULL | 경기 시각 |
| `venue` | varchar(50) | NOT NULL | 구장 이름 |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | 생성 시각 |

**인덱스**: `slug`, `manage_token` 의 UNIQUE 제약이 곧 조회 인덱스다.
두 컬럼이 유일한 조회 경로이므로 추가 인덱스는 두지 않는다.

**길이 제한 근거**: FR-012 (이름 ≤ 20자, 구장 ≤ 50자). DB 와 Zod 양쪽에 동일하게 건다.

## responses

한 사람의 참석 응답. 같은 이름으로 다시 응답하면 새 행이 아니라 갱신이다(FR-004).

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | serial | PK | 내부 식별자 |
| `invite_id` | integer | NOT NULL, FK → `invites.id` ON DELETE CASCADE | 소속 초대장 |
| `guest_name` | varchar(20) | NOT NULL | 응답자가 직접 입력한 이름. 신원 확인 없음 |
| `position` | `position` enum | NOT NULL | `FW`/`MF`/`DF`/`GK` |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | 최초 응답 시각 |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() | 마지막 갱신 시각 |

**제약**: `UNIQUE (invite_id, guest_name)`

이 제약이 FR-004 의 구현 수단이다. 애플리케이션에서 select 후 insert 하면
동시 요청 시 중복이 생기므로, DB 제약 + `ON CONFLICT DO UPDATE` 로 원자적으로 처리한다.

**`FW` 값에 대한 주석**: enum 에는 `FW` 가 포함되지만 클라이언트는 이 값을 전송하지 않는다.
공격수는 2단 팝업으로 차단되어 확정 경로가 없기 때문이다(SC-005).
enum 에 남겨두는 이유는 포지션 도메인의 완전성 때문이며, 이것이
"공격수도 저장 가능하다"는 뜻은 아니다.

## 상태 전이

`invites` 는 생성 후 불변이다. `responses` 는 다음 두 전이만 가진다.

```text
(없음) ──POST /api/responses──▶ 생성   (created_at = updated_at)
   생성 ──POST /api/responses──▶ 갱신   (position 교체, updated_at 갱신)
```

삭제 전이는 없다(응답 취소는 Out of Scope). `invites` 삭제 시 CASCADE 로 함께 사라진다.

## Drizzle 스키마 대응

`lib/schema.ts` 가 이 문서의 단일 구현이다.
`drizzle-kit push` 로 Neon 에 반영하며, 수동 DDL 을 실행하지 않는다.

```sql
-- push 가 생성하는 DDL (참고용)
CREATE TYPE "position" AS ENUM ('FW', 'MF', 'DF', 'GK');

CREATE TABLE "invites" (
  "id"           serial PRIMARY KEY,
  "slug"         text NOT NULL UNIQUE,
  "manage_token" text NOT NULL UNIQUE,
  "host_name"    varchar(20) NOT NULL,
  "match_date"   date NOT NULL,
  "match_time"   time NOT NULL,
  "venue"        varchar(50) NOT NULL,
  "created_at"   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "responses" (
  "id"         serial PRIMARY KEY,
  "invite_id"  integer NOT NULL REFERENCES "invites"("id") ON DELETE CASCADE,
  "guest_name" varchar(20) NOT NULL,
  "position"   "position" NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "responses_invite_guest_unique" UNIQUE ("invite_id", "guest_name")
);
```

## 용량 추정

지인 단위(Assumptions): 초대장 100건 × 응답 20건 = 2,000행.
행당 ~100바이트로 계산해도 1MB 미만. Neon Free 0.5GB 한도에 전혀 근접하지 않는다.

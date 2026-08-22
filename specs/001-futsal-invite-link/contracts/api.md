# Phase 1: API Contracts

**Feature**: 001-futsal-invite-link | **Date**: 2026-08-22

엔드포인트 4개. 원칙 III 에 따라 이 이상 늘리지 않는다.

공통 규칙:
- 모든 요청/응답은 `application/json`
- 검증 실패는 `400` + `{ "error": "<message>" }`
- 리소스 부재는 `404` + `{ "error": "not_found" }` (FR-006 — 어떤 데이터도 함께 노출하지 않는다)
- 서버 오류는 `500` + `{ "error": "internal_error" }`. 스택트레이스를 응답에 담지 않는다

---

## POST /api/invites

초대장을 생성한다. (FR-001, Story 2)

**Request**

```json
{
  "hostName": "경덕",
  "matchDate": "2026-08-15",
  "matchTime": "19:00",
  "venue": "OO풋살파크"
}
```

| 필드 | 규칙 |
|---|---|
| `hostName` | 필수, 1~20자, 공백만이면 거부 |
| `matchDate` | 필수, `YYYY-MM-DD`, **오늘 이전이면 거부** (FR-013) |
| `matchTime` | 필수, `HH:MM` (24시간) |
| `venue` | 필수, 1~50자, 공백만이면 거부 |

**Response `201`**

```json
{
  "slug": "a1B2c3D4e5",
  "manageToken": "V1StGXR8_Z5jdHi6B-myT",
  "inviteUrl": "https://futsal-invite.vercel.app/i/a1B2c3D4e5",
  "manageUrl": "https://futsal-invite.vercel.app/m/V1StGXR8_Z5jdHi6B-myT"
}
```

`manageToken` 은 **생성 응답에서만** 반환된다. 이후 어떤 조회로도 다시 얻을 수 없다.

**Errors**

| 코드 | 조건 |
|---|---|
| `400` `"invalid_input"` | 스키마 검증 실패 |
| `400` `"past_date"` | `matchDate` 가 오늘 이전 (AC Story2-4) |

---

## GET /api/invites/[slug]

초대장의 공개 정보를 조회한다. (FR-002)

**Response `200`**

```json
{
  "hostName": "경덕",
  "matchDate": "2026-08-15",
  "matchTime": "19:00",
  "venue": "OO풋살파크",
  "isPast": false
}
```

**`manage_token` 은 이 응답에 절대 포함되지 않는다.** Drizzle 쿼리에서
컬럼을 명시적으로 선택해 구조적으로 차단한다(설계 결정 6).

`isPast` 는 `match_date` 가 오늘보다 과거인지를 서버가 계산해 내려준다
(AC Story4-3 — matchday 화면의 "이미 지난 경기예요" 표시용).

**Errors**: `404` `"not_found"` — 없는 slug (AC Story4-1)

---

## POST /api/responses

참석 응답을 등록하거나 갱신한다. (FR-003, FR-004)

**Request**

```json
{
  "slug": "a1B2c3D4e5",
  "guestName": "민수",
  "position": "MF"
}
```

| 필드 | 규칙 |
|---|---|
| `slug` | 필수, 존재하는 초대장이어야 한다 |
| `guestName` | 필수, 1~20자, 공백만이면 거부 |
| `position` | 필수, `"FW" \| "MF" \| "DF" \| "GK"` 중 하나 |

**Response `200`**

```json
{
  "guestName": "민수",
  "position": "MF",
  "matchDate": "2026-08-15",
  "matchTime": "19:00",
  "venue": "OO풋살파크",
  "hostName": "경덕"
}
```

티켓 화면(⑤)이 렌더링에 필요한 값을 한 번에 받도록 경기 정보를 함께 반환한다.
클라이언트가 이미 들고 있는 값이지만, 응답만으로 티켓이 완성되면
화면 간 상태 의존이 줄어든다.

**Upsert 동작**: `(invite_id, guest_name)` 충돌 시 `position` 과 `updated_at` 을
갱신한다. 새 행은 생기지 않는다 (AC Story4-2).
생성/갱신 모두 `200` 이다 — 클라이언트가 두 경우를 구분할 필요가 없다.

**Errors**

| 코드 | 조건 |
|---|---|
| `400` `"invalid_input"` | 스키마 검증 실패 (알 수 없는 `position` 포함) |
| `404` `"not_found"` | 없는 slug |

---

## GET /api/manage/[token]

참석자 명단과 포지션별 집계를 조회한다. (FR-005, Story 3)

**Response `200`**

```json
{
  "hostName": "경덕",
  "matchDate": "2026-08-15",
  "matchTime": "19:00",
  "venue": "OO풋살파크",
  "responses": [
    { "guestName": "민수", "position": "MF", "respondedAt": "2026-08-10T04:12:00.000Z" },
    { "guestName": "지훈", "position": "GK", "respondedAt": "2026-08-10T05:30:00.000Z" }
  ],
  "counts": { "FW": 0, "MF": 1, "DF": 0, "GK": 1 },
  "total": 2
}
```

`responses` 는 `updated_at` 오름차순이다. `respondedAt` 은 `updated_at` 값이다
(갱신된 응답은 갱신 시점으로 보이는 것이 주최자에게 자연스럽다).

응답이 0건이면 `responses: []`, `counts` 는 전부 0, `total: 0` 이다.
"아직 아무도 응답하지 않았어요" 표시는 클라이언트가 `total === 0` 으로 판단한다 (AC Story3-2).

**Errors**: `404` `"not_found"` — 잘못된 토큰 (AC Story3-3).
토큰이 틀리면 초대장이 존재하는지조차 알려주지 않는다.

---

## 계약 테스트 매핑

| 테스트 파일 | 검증 대상 |
|---|---|
| `tests/contract/invites.test.ts` | POST 생성(201, 필드), 과거 날짜 400, GET 조회, **manageToken 미노출**, 404 |
| `tests/contract/responses.test.ts` | POST 응답 200, upsert 시 행 수 불변 + position 갱신, 잘못된 position 400, 없는 slug 404 |
| `tests/contract/manage.test.ts` | GET 명단·집계 정확성, 0건 응답 형태, 잘못된 토큰 404 |

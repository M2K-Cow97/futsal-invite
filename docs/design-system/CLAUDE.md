# HalfTime 디자인 시스템

세 프로젝트가 공유하는 디자인 시스템 규칙. **메인앱** · **futsal-invite**(사이드앱) · **sample_442**.

- **출처**: Figma [하프타임 — 와이어프레임](https://www.figma.com/design/bvvtkRiQ2SXLzU4sQ6WJLA/?node-id=158-2) · file `bvvtkRiQ2SXLzU4sQ6WJLA` · page `158:2`
- **토큰 파일**: `tokens.css` (이 폴더 옆 또는 각 프로젝트의 `app/tokens.css`)
- **추출 방법**: `get_variable_defs` → `ref` 레이어에 그대로 반영

> ⚠ **토큰 값을 손으로 고치지 말 것.** Figma 변수가 유일한 출처(single source of truth)다.
> 디자인이 바뀌면 `get_variable_defs` 를 다시 돌려 `tokens.css` 의 `ref` 레이어를 재생성한다.

---

## 1. 토큰 구조 — 2 레이어

```
① ref  →  Figma 원시값. HalfTime/color/green/500 = #00E061
           변수명 그대로. 컴포넌트가 직접 참조하지 않는다.
② sys  →  의미 토큰. --sys-action-primary-bg: var(--ht-green-500)
           컴포넌트는 이것만 쓴다.
```

**규칙**: 컴포넌트 CSS 에서 `--ht-*` 를 직접 쓰면 안 된다. 반드시 `--sys-*` 를 경유한다.
이유 — 다크/라이트 전환이나 브랜드 교체 시 `sys` 레이어 한 곳만 고치면 끝난다.

```css
/* ✅ */
.btn-primary { background: var(--sys-action-primary-bg); }

/* ❌ ref 직접 참조 — 테마 전환이 불가능해진다 */
.btn-primary { background: var(--ht-green-500); }

/* ❌ 하드코딩 */
.btn-primary { background: #00e061; }
```

---

## 2. 색

### 스케일 3종

| 스케일 | 코어 | 용도 |
|---|---|---|
| **green** | `500` = `#00E061` | primary. 액션·확정·성공 |
| **blue** | `500` = `#3157D5` | secondary. 정보·승리 배지 |
| **neutral** | `950` = `#11130F` ~ `0` = `#FFFFFF` | 표면·텍스트·보더 |

`neutral` 은 **순회색이 아니다** — 녹색이 살짝 섞여 있다(`#11130F`, `#22251F`). `#000`/`#888` 로 대체하면 톤이 어긋난다.

### 핵심 주의점

**green.500 위에는 검정 글씨.** `#00E061` 은 명도가 높아 흰 글씨를 올리면 대비가 무너진다.
Figma 컴포넌트 라이브러리의 Primary 버튼도 `neutral.950` 글씨를 쓴다.

```css
--sys-action-primary-bg: var(--ht-green-500);
--sys-action-primary-fg: var(--ht-neutral-950);  /* 흰색 아님 */
```

### 시스템에 없는 색 (확장 지점)

| 색 | 상태 | 처리 |
|---|---|---|
| **red** | 스케일 없음 | `--sys-status-danger` 한 곳에만 고정. Figma 의 '선수 삭제'·Red card 용 |
| **yellow** | 토큰 없음 | 쓰지 않는다. 강조는 green 계열로 흡수 (`--sys-accent-*`). Kakao 버튼의 노랑은 브랜드 색이지 시스템 토큰이 아니다 |

### 어두운 표면 위에서 (중요)

**`green.500` 을 `green.900` 위에 올리면 안 읽힌다.** 명도차가 부족하다.
라이트 앱 안에 어두운 조각(티켓·풋살장 트랙)을 놓을 때는 전용 토큰을 쓴다:

| 토큰 | 용도 |
|---|---|
| `--sys-accent-on-dark` | 어두운 초록 표면 위 강조 → `green.200` |
| `--sys-on-inverse-text` / `-muted` / `-faint` | 어두운 표면 위 텍스트 3단계 |
| `--sys-on-inverse-border` | 어두운 표면 위 구분선 |
| `--sys-on-inverse-raised` | 어두운 표면 안의 한 단계 위 표면 |
| `--sys-on-inverse-accent` | 어두운 표면 위 초록 강조 (`green.500` — neutral 표면에서는 OK) |
| `--sys-field-surface` / `-line` | 풋살장 톤 표면(`green.900`) + 라인(흰색) |

라이트용 `--sys-text-*` 를 어두운 표면에 그대로 쓰면 대비가 무너진다. 반드시 위 짝을 쓴다.

---

## 3. 타이포

**폰트: `Spoqa Han Sans Neo`** — weight 는 `400`(regular) / `700`(bold) 둘만 쓴다. 중간값(500/600) 없음.

### 스타일 표 (Figma 텍스트 스타일 1:1)

| Figma 스타일 | 크기/행간 | 자간 | weight | 유틸 클래스 |
|---|---|---|---|---|
| `Heading/h0` | 48 / 48 | -1.5 | 700 | `.ht-h0` |
| `Heading/h1` | 40 / 48 | -1.5 | 700 | `.ht-h1` |
| `Heading/h2` | 24 / 28 | -0.64 | 700 | `.ht-h2` |
| `Heading/h3` | 20 / 24 | -0.64 | 700 | `.ht-h3` |
| `Heading/h4` | 18 / 24 | -0.64 | 700 | `.ht-h4` |
| `Body/primary` | 16 / 24 | 0 | 400 | `.ht-body` |
| `Body/secondary` | 14 / 20 | 0 | 400 | `.ht-body-sm` |
| `Body/tertiary` | 12 / 18 | 0 | 400 | `.ht-body-xs` |
| `Label/primary` | 16 / 24 | 0 | 700 | `.ht-label` |
| `Label/secondary` | 14 / 20 | 0 | 700 | `.ht-label-sm` |
| `Label/tertiary` | 12 / 18 | 0 | 700 | `.ht-label-xs` |
| `Button/primary` | 16 / 24 | 0 | 700 | — (버튼 CSS 내장) |
| `Button/secondary` | 14 / 24 | 0 | 700 | — |
| `Button/tertiary` | 12 / 18 | 0 | 700 | — |
| `Input/primary` | 14 / 20 | 0 | 400 | — (입력 CSS 내장) |
| `Input/secondary` | 12 / 16 | 0 | 400 | — |

**자간 규칙**: 큰 글자일수록 좁힌다. `h0`~`h1` → `-1.5`, `h2`~`h4` → `-0.64`, 본문/라벨/버튼 → `0`.

> **모바일 입력 예외**: `Input/primary` 는 14px 이지만, 웹에서 `<input>` 의 `font-size` 가
> 16px 미만이면 **iOS 사파리가 포커스 시 화면을 확대**한다. 웹 구현에서는 입력 필드만
> `--ht-size-100`(16px) 을 쓴다. 디자인 스펙과의 의도적 불일치다.

---

## 4. 간격

`ref/spacing/flexbox/*` — 8 기반.

| 토큰 | 값 |
|---|---|
| `--ht-space-xxs` | 8px |
| `--ht-space-xs` | 16px |
| `--ht-space-s` | 24px |
| `--ht-space-l` | 40px |
| `--ht-space-xl` | 48px |

스케일에 없는 값(4, 12, 20, 32)이 필요하면 **먼저 스케일로 해결되는지 확인**한다. 정말 필요하면 컴포넌트 로컬 값으로 두고 토큰화하지 않는다.

---

## 5. 반경 · 그림자 · 모션

```
radius   sm 8 · md 12(버튼/입력) · lg 16(카드) · xl 20 · pill 999 · circle 50%
shadow   sm/md/lg/overlay — 모두 neutral.950 기반 알파. 검정(#000) 아님
motion   fast 120ms · base 180ms · slow 320ms
         ease-standard cubic-bezier(.2,0,.2,1) · ease-spring cubic-bezier(.34,1.3,.64,1)
```

---

## 6. 컴포넌트 규칙

Figma `HALFTIME — COMPONENT LIBRARY` (6 섹션) 기준.

### Button — `Hierarchy` × `Size`

| Hierarchy | 배경 | 글자 |
|---|---|---|
| **Primary** | `green.500` | `neutral.950` |
| **Secondary** | `neutral.950` | `neutral.0` |
| **Tertiary** | 투명 + `neutral.300` 보더 | `green.800` |
| **Destructive** | `danger-bg` | `danger-fg` |

| Size | 높이 | 글자 |
|---|---|---|
| **Large** | 56px, 좌우 24 | `Button/primary` 16 |
| **Compact** | 40px, 좌우 16 | `Button/secondary` 14 |

Large 는 기본적으로 **full-width**, Compact 는 내용 폭.

### Input — 높이 56, radius 12

`neutral.900` 표면(다크) / `neutral.0`(라이트), 보더 `neutral.200`, placeholder `neutral.600`.
포커스 시 보더를 `--sys-border-focus`(green.600) + 링 3px.

### Badge — pill (radius 999)

| Type | 색 |
|---|---|
| `Dday` | `green.500` bg / `neutral.950` fg |
| `Live` | `green.500` bg / `neutral.950` fg |
| `Win` | `blue.500` bg / `neutral.0` fg |
| `Draw` | 투명 / `neutral.0`(다크)·`neutral.950`(라이트) fg |
| `Loss` | 투명 / `neutral.500` fg |

### Card — radius 16

표면 `--sys-surface-raised`, 보더 `--sys-border-subtle`, 그림자 `--sys-shadow-md`.
내부 패딩 `--ht-space-s`(24).

### 나머지 섹션

`01 Actions & Controls` — FAB, Position Chip, Referee Tool, Social(Kakao/Apple), Icon Button, Match Result
`02 Forms & Progress` — Field(Text/Select), Textarea, Logo Picker, Step
`03 Navigation` — App Bar, Bottom Nav, Logo Mark, Team Identity
`04 Lists & Cards` — Member Row, Selectable Player, Quarter Card, Info Row, Tactics Preview, Team Summary, Match History, Avatar, Settings Row
`05 Feedback` — Toast(Success/Error/Permission), Alert Destructive
`06 Overlays` — Sheet Handle, Action Row(Default/Destructive/Cancel)

---

## 7. 프로젝트별 적용

| 프로젝트 | 테마 | 비고 |
|---|---|---|
| **메인앱** | 다크 (Figma 원본) | `neutral.950` 배경, 흰 텍스트 |
| **futsal-invite** | **라이트** | 같은 토큰의 라이트 대응값. `sys` 레이어에서만 갈림 |
| **sample_442** | 미정 | |

`ref` 레이어는 세 프로젝트가 동일하다. 갈리는 건 `sys` 레이어의 surface/text 매핑뿐이다.

### futsal-invite 결정 사항

1. **라이트 유지** — 크림(`#eef3e6`) → `neutral.0/50/100`
2. **노랑 제거** — `#f5c542` → `--sys-accent-*`(green 계열). 시스템 외 색 0
3. **Spoqa 채용** — Pretendard 대체

---

## 8. 체크리스트

새 컴포넌트를 만들거나 기존 것을 고칠 때:

- [ ] 색을 하드코딩하지 않았다 (`#`, `rgb()` 없음 — 알파 합성은 예외)
- [ ] `--ht-*` 를 직접 참조하지 않았다 (`--sys-*` 경유)
- [ ] `green.500` 배경에 검정 글씨를 썼다
- [ ] 폰트 weight 가 400 또는 700 이다
- [ ] 자간이 글자 크기에 맞다 (큰 글자 → 좁게)
- [ ] `<input>` 의 `font-size` 가 16px 이상이다 (iOS 확대 방지)
- [ ] radius 가 스케일 값이다
- [ ] `prefers-reduced-motion` 을 존중한다

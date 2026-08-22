# Phase 1: Quickstart

**Feature**: 001-futsal-invite-link | **Date**: 2026-08-22

전부 무료 티어. 카드 등록 없음.

## 1. Neon Postgres 만들기 (2분)

1. <https://neon.tech> → **Sign up with GitHub**
2. 프로젝트 생성: 이름 `futsal-invite`, 리전 **AWS ap-southeast-1 (Singapore)**
   — 서울 리전은 유료 플랜만 제공하므로 국내에서 가장 가까운 무료 리전을 고른다
3. 생성 직후 나오는 **Connection string** 복사
   (`postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`)

무료 한도: 0.5GB 스토리지, 유휴 5분 후 compute 자동 대기(첫 요청 시 자동 복귀).

## 2. 로컬 실행

```bash
# 저장소 루트에서
cp .env.example .env.local
# .env.local 을 열어 DATABASE_URL 에 1번에서 복사한 값을 붙인다

npm install
npm run db:push      # Neon 에 테이블 2개 생성
npm run dev          # http://localhost:3000
```

`.env.local`:

```bash
DATABASE_URL="postgresql://...?sslmode=require"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

`NEXT_PUBLIC_BASE_URL` 은 생성된 공유/관리 링크의 절대 URL 을 만드는 데 쓴다.

## 3. 동작 확인

```bash
# 초대장 생성
curl -s -X POST http://localhost:3000/api/invites \
  -H 'Content-Type: application/json' \
  -d '{"hostName":"경덕","matchDate":"2026-12-25","matchTime":"19:00","venue":"OO풋살파크"}'
# → {"slug":"...","manageToken":"...","inviteUrl":"...","manageUrl":"..."}
```

브라우저에서:

1. <http://localhost:3000> → 날짜·시간·구장·이름 입력 → 링크 2개 생성 확인
2. 공유 링크(`/i/{slug}`) 열기 → **"싫어."** 버튼에 마우스를 올려 도망가는지 확인
   → 3회 후 "포기해." 로 바뀌는지 확인
3. "좋아! 🙌" → SIUUU → 일정 확인 + 이름 입력 → 포지션
4. **공격수** 클릭 → 팝업① → "그래도 할래" → 팝업② → "돌아가기" → 포지션 미확정 확인
5. 미드필더 클릭 → 티켓 → "이미지 저장" 으로 PNG 다운로드 확인
6. 관리 링크(`/m/{token}`) 열기 → 방금 응답이 명단에 보이는지 확인

## 4. 테스트

```bash
npm test             # API 계약 테스트 (Vitest)
npm run test:e2e     # 5화면 완주 스모크 (Playwright)
```

계약 테스트는 `DATABASE_URL` 이 필요하다. 프로덕션 DB 를 쓰지 않으려면
Neon 대시보드에서 브랜치를 하나 더 만들어(`test`) 그 연결 문자열을 쓴다 — 무료 티어에 포함된다.

## 5. Vercel 배포 (3분)

```bash
# GitHub 에 푸시한 뒤
```

1. <https://vercel.com> → **Continue with GitHub** → **Add New Project**
2. 이 저장소 선택 → Framework 는 **Next.js** 자동 감지
3. **Environment Variables** 에 추가:
   - `DATABASE_URL` = Neon 연결 문자열
   - `NEXT_PUBLIC_BASE_URL` = `https://<프로젝트명>.vercel.app`
     (첫 배포 후 도메인이 확정되면 이 값을 채우고 재배포)
4. **Deploy**

이후 `main` 에 푸시하면 자동 재배포된다.

무료 한도: Hobby 플랜 — 상업적 사용 불가, 대역폭 100GB/월. 지인용에는 충분하다.

## 6. 에셋 넣기 (선택)

없어도 동작한다. 넣으면 목업 그대로 보인다.

```text
public/assets/
├── siu.gif             # ② SIUUU 화면 GIF
├── siu-sound.mp3       # ② 효과음
├── ronaldo-warn.png    # ④ 팝업① 이미지
├── ronaldo-stern.png   # ④ 팝업② 이미지
└── ronaldo-kick.png    # ① "싫어." 버튼을 차는 호날두
```

파일이 없으면 이모지 플레이스홀더(⚽ 🐐 등)로 자동 대체되고 사운드는 무음으로 진행된다.

## 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| 첫 링크 열기가 1초 정도 느리다 | Neon cold start. 정상 동작이다. 이후 요청은 빠르다 |
| `db:push` 가 연결 실패 | `DATABASE_URL` 끝에 `?sslmode=require` 가 있는지 확인 |
| 사운드가 안 나온다 | 브라우저 자동재생 정책. "좋아!" 클릭으로 재생돼야 정상이며, 차단 시 무음 진행이 의도된 동작 |
| 카톡 링크 미리보기가 안 뜬다 | `NEXT_PUBLIC_BASE_URL` 이 실제 도메인인지 확인. 카톡은 미리보기를 캐시하므로 반영에 시간이 걸린다 |
| 이미지 저장이 실패한다 | html2canvas 가 외부 이미지에서 CORS 로 막힐 수 있다. `public/assets` 의 로컬 파일만 쓰면 발생하지 않는다 |

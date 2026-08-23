import { ImageResponse } from 'next/og';

/*
 * 링크 공유 썸네일 (카톡·슬랙·트위터 등).
 *
 * 모든 초대장이 같은 이미지를 쓴다 — 주최자 이름이나 구장을 넣으면 링크를
 * 받은 사람이 열기 전에 보이고 카톡 서버에도 남는다. 그 정보는 페이지를
 * 실제로 연 사람만 보게 둔다.
 *
 * 파일을 두지 않고 코드로 그리는 이유: 디자인 토큰을 그대로 쓸 수 있고,
 * 내용이 고정이라 CDN 캐시가 잘 먹는다.
 *
 * app/ 루트에 두면 하위 모든 라우트(/i/[slug] 포함)가 이 이미지를 상속한다.
 */

export const alt = '나랑 풋살할래? ⚽';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// HalfTime 토큰 (docs/design-system/CLAUDE.md). og 이미지는 CSS 변수를 쓸 수
// 없어 값을 직접 적는다 — 토큰이 바뀌면 여기도 함께 고친다.
const GREEN_500 = '#00E061';
const NEUTRAL_950 = '#11130F';
const NEUTRAL_400 = '#AEB5AC';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: NEUTRAL_950,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 120, marginBottom: 8 }}>⚽</div>

        <div
          style={{
            display: 'flex',
            fontSize: 84,
            fontWeight: 700,
            color: GREEN_500,
            letterSpacing: -2,
          }}
        >
          나랑 풋살할래?
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 20,
            fontSize: 36,
            color: NEUTRAL_400,
          }}
        >
          거절은 물리적으로 불가능합니다
        </div>
      </div>
    ),
    size,
  );
}

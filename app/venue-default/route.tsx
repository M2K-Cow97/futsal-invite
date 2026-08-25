import { ImageResponse } from 'next/og';

/*
 * GET /venue-default — 구장 기본 이미지.
 *
 * 스크래핑이 실패했거나 주최자가 링크를 넣지 않았을 때 쓴다. 파일 대신 코드로
 * 그린다 — HalfTime 토큰을 그대로 쓸 수 있고 내용이 고정이라 캐시가 잘 먹는다.
 */

const FIELD = '#005C29'; // green.900
const LINE = '#FFFFFF';
const ACCENT = '#99FFC2'; // green.200

export function GET() {
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
          background: FIELD,
          position: 'relative',
        }}
      >
        {/* 하프 라인 + 센터 서클 — 풋살장임을 알아보게 하는 최소한의 표시 */}
        <div
          style={{
            position: 'absolute',
            left: 399,
            top: 0,
            width: 2,
            height: 450,
            background: LINE,
            opacity: 0.3,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 320,
            top: 145,
            width: 160,
            height: 160,
            borderRadius: 80,
            border: `2px solid ${LINE}`,
            opacity: 0.3,
            display: 'flex',
          }}
        />
        <div style={{ display: 'flex', fontSize: 96 }}>⚽</div>
        <div
          style={{
            display: 'flex',
            marginTop: 12,
            fontSize: 34,
            fontWeight: 700,
            color: ACCENT,
          }}
        >
          풋살장
        </div>
      </div>
    ),
    { width: 800, height: 450 },
  );
}

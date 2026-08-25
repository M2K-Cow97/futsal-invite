'use client';

import { useState } from 'react';

/**
 * 에셋이 없어도 흐름이 끊기지 않게 한다 (spec Edge Cases).
 * 이미지 로드가 실패하면 이모지 플레이스홀더로 교체된다.
 */
export function MediaBox({
  src,
  alt,
  fallback,
}: {
  src: string;
  alt: string;
  fallback: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="media-box">
      {failed ? (
        <span className="media-fallback" role="img" aria-label={alt}>
          {fallback}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- onError 폴백이 필요해 next/image 를 쓰지 않는다
        <img
          src={src}
          alt={alt}
          /*
           * 에셋이 큰 경우(훈시 사진은 2674x2216) 디코딩이 메인 스레드를 막아
           * 화면 전환이 뚝 끊긴다. async 로 넘겨 렌더를 막지 않게 한다.
           */
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

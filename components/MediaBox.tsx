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
    /*
     * 점선 테두리·배경은 **폴백일 때만** 그린다(.is-fallback). 그 장식은 에셋이
     * 없을 때 "여기 뭐가 들어올 자리" 를 알리는 플레이스홀더라서, 사진이 있으면
     * 오히려 사진을 액자에 가둬 보이게 한다.
     *
     * onLoad 로 판단하지 않는다 — 큰 이미지는 로드가 늦어 테두리가 잠깐 보이고,
     * 캐시된 이미지는 onLoad 가 오지 않는 경우도 있다. failed 만 보면 확실하다.
     */
    <div className={`media-box${failed ? ' is-fallback' : ''}`}>
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

'use client';

import { createContext } from 'react';

/**
 * 이 스테이지가 오락기(`/games`)에서 실행 중인지 알려준다.
 *
 * 게임 컴포넌트는 거절 관문과 오락기 양쪽에서 재사용된다. 로직은 같지만
 * 하단 버튼 문구가 달라야 해서(관문: "그냥 할래"/"다른 방법으로 거절",
 * 오락기: "게임 닫기") 맥락을 컨텍스트로 내려보낸다.
 *
 * props 로 내리면 7개 스테이지 전부의 시그니처를 바꿔야 하는데, 그건
 * 게임 로직과 무관한 변경이라 컨텍스트가 맞다. 기본값 false = 거절 관문.
 */
export const ArcadeContext = createContext(false);

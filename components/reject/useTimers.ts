'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * 언마운트 시 자동으로 정리되는 setTimeout 모음.
 *
 * 미니게임들은 연출(배신·심사·비행)을 setTimeout 으로 지연시킨다. 그 사이에
 * 사용자가 "그냥 할래"(onClose)나 "다른 방법으로 거절"(onGiveUp)을 누르면
 * 컴포넌트가 사라지는데, 타이머는 살아남아 죽은 인스턴스의 setState 를 부른다.
 * onGiveUp 은 형제 스테이지로 교체하는 것이라 더 나쁘다 — 이전 스테이지의
 * 죽은 타이머가 다음 스테이지에서 진동을 울리는 식으로 화면이 오염된다.
 *
 * set() 으로 예약하고, clear() 로 진행 중인 것을 모두 취소한다.
 * 언마운트 시에는 훅이 알아서 정리한다.
 */
export function useTimers() {
  const ids = useRef<number[]>([]);

  const clear = useCallback(() => {
    for (const id of ids.current) window.clearTimeout(id);
    ids.current = [];
  }, []);

  const set = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    ids.current.push(id);
    return id;
  }, []);

  useEffect(() => clear, [clear]);

  return { set, clear };
}

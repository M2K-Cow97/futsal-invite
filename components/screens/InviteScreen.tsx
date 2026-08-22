'use client';

import { useCallback, useRef, useState } from 'react';

const FLEE_LIMIT = 3;
const GIVE_UP_LABEL = '포기해.';
const INITIAL_LABEL = '싫어.';

/**
 * ① invite — "나랑 풋살할래? ⚽"
 *
 * "싫어." 버튼은 마우스를 올리거나(데스크톱) 터치하면(모바일) 호날두 킥에 맞아
 * 컨테이너 안 랜덤 좌표로 도망간다. 정상적인 클릭으로는 절대 눌리지 않는다 (spec SC-004).
 */
export function InviteScreen({ hostName, onAccept }: { hostName: string; onAccept: () => void }) {
  const arenaRef = useRef<HTMLDivElement>(null);
  const noBtnRef = useRef<HTMLButtonElement>(null);
  const fleeingRef = useRef(false);

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [fleeCount, setFleeCount] = useState(0);
  const [kick, setKick] = useState<{ x: number; y: number; id: number } | null>(null);

  const flee = useCallback(() => {
    // 모바일에서 touchstart → click 이 연달아 오는 경우를 막는다.
    if (fleeingRef.current) return;
    fleeingRef.current = true;

    const arena = arenaRef.current;
    const btn = noBtnRef.current;
    if (!arena || !btn) {
      fleeingRef.current = false;
      return;
    }

    // 킥 이모지를 현재 버튼 위치 왼쪽에 띄운다.
    const arenaBox = arena.getBoundingClientRect();
    const btnBox = btn.getBoundingClientRect();
    setKick({
      x: btnBox.left - arenaBox.left - 34,
      y: btnBox.top - arenaBox.top,
      id: Date.now(),
    });

    // 버튼 크기를 뺀 범위에서 좌표를 뽑아 컨테이너를 벗어나지 않게 한다.
    const maxX = Math.max(0, arena.clientWidth - btn.offsetWidth);
    const maxY = Math.max(0, arena.clientHeight - btn.offsetHeight);
    setPos({ x: Math.random() * maxX, y: Math.random() * maxY });
    setFleeCount((n) => n + 1);

    // 이동 트랜지션(260ms)이 끝난 뒤 다시 잡을 수 있게 한다.
    window.setTimeout(() => {
      fleeingRef.current = false;
      setKick(null);
    }, 300);
  }, []);

  const label = fleeCount >= FLEE_LIMIT ? GIVE_UP_LABEL : INITIAL_LABEL;

  return (
    <div className="screen">
      <h1 className="title">
        {hostName}이(가) 물어봐요
        <br />
        나랑 풋살할래? ⚽
      </h1>
      <p className="subtitle">거절은 물리적으로 불가능합니다</p>

      <div className="invite-arena" ref={arenaRef}>
        <button type="button" className="btn btn-primary invite-yes" onClick={onAccept}>
          좋아! 🙌
        </button>

        {kick && (
          <span className="kick" style={{ left: kick.x, top: kick.y }} key={kick.id}>
            🦵
          </span>
        )}

        <button
          type="button"
          ref={noBtnRef}
          className={`btn invite-no${fleeingRef.current ? ' fleeing' : ''}`}
          style={
            pos
              ? { transform: `translate(${pos.x}px, ${pos.y}px)`, left: 0, top: 0 }
              : { left: '50%', top: 78, transform: 'translateX(-50%)' }
          }
          onMouseEnter={flee}
          onTouchStart={flee}
          onFocus={flee}
          onClick={(e) => {
            // 어떤 경로로도 거절이 성립하지 않게 한다.
            e.preventDefault();
            flee();
          }}
        >
          {label}
        </button>

        {fleeCount > 0 && (
          <p className="flee-count">
            {fleeCount}번 시도… {fleeCount >= FLEE_LIMIT ? '이제 포기하세요 🐐' : '계속 해보세요'}
          </p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { formatMatchDate } from '@/lib/format';
import { RejectGauntlet } from '../reject/RejectGauntlet';

const FLEE_LIMIT = 3;
const GIVE_UP_LABEL = '포기해.';
const INITIAL_LABEL = '싫어.';

/** "좋아!" 버튼 주변으로는 도망가지 않게 둘 여유 간격(px). */
const SAFE_GAP = 10;
/** 터치 환경에서 손가락이 이 거리 안으로 들어오면 닿기 전에 피한다. */
const TOUCH_SENSE_RADIUS = 46;

type Box = { x: number; y: number; w: number; h: number };

function overlaps(a: Box, b: Box, gap: number): boolean {
  return !(
    a.x + a.w + gap < b.x ||
    b.x + b.w + gap < a.x ||
    a.y + a.h + gap < b.y ||
    b.y + b.h + gap < a.y
  );
}

/**
 * ① invite — "나랑 풋살할래? ⚽"
 *
 * "싫어." 버튼은 호날두 킥에 맞아 도망간다. 정상적인 클릭으로는 절대 눌리지 않는다 (spec SC-004).
 *
 * 데스크톱은 hover 로 피하지만 모바일에는 hover 가 없다. 그래서 터치 환경에서는
 * 아레나 전체의 touchmove 를 보고 손가락이 가까워지면 닿기 전에 피한다 —
 * 목업의 "누르려 하면 도망간다" 느낌을 모바일에서도 살리기 위함이다.
 */
export function InviteScreen({
  hostName,
  match,
  isPast,
  onAccept,
}: {
  hostName: string;
  /**
   * 경기 정보. 초대장인데 언제·어디인지 3번째 화면에서야 보이던 것을
   * 첫 화면으로 끌어올렸다 — 받는 사람이 가장 먼저 알고 싶은 정보다.
   */
  match: { matchDate: string; matchTime: string; venue: string };
  /** 경기 날짜가 지났으면 마감. 링크는 열리지만 참석 등록은 안 된다. */
  isPast?: boolean;
  onAccept: () => void;
}) {
  const arenaRef = useRef<HTMLDivElement>(null);
  const noBtnRef = useRef<HTMLButtonElement>(null);
  const yesBtnRef = useRef<HTMLButtonElement>(null);
  const fleeingRef = useRef(false);
  const fleeCountRef = useRef(0);

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [fleeCount, setFleeCount] = useState(0);
  const [kick, setKick] = useState<{ x: number; y: number; id: number } | null>(null);
  const [gauntlet, setGauntlet] = useState(false);

  const flee = useCallback(() => {
    // 도망 단계를 지나면 더는 피하지 않고 거절 관문이 막아선다.
    if (fleeCountRef.current >= FLEE_LIMIT) return;
    // 모바일에서 touchstart → click 이 연달아 오는 경우를 막는다.
    if (fleeingRef.current) return;
    fleeingRef.current = true;

    const arena = arenaRef.current;
    const btn = noBtnRef.current;
    const yes = yesBtnRef.current;
    if (!arena || !btn) {
      fleeingRef.current = false;
      return;
    }

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

    // "좋아!" 를 덮으면 수락 자체가 막힌다. 겹치지 않는 자리를 찾는다.
    const yesRect = yes?.getBoundingClientRect();
    const forbidden: Box | null = yesRect
      ? {
          x: yesRect.left - arenaBox.left,
          y: yesRect.top - arenaBox.top,
          w: yesRect.width,
          h: yesRect.height,
        }
      : null;

    let next = { x: Math.random() * maxX, y: Math.random() * maxY };
    if (forbidden) {
      for (let i = 0; i < 24; i++) {
        const candidate: Box = { x: next.x, y: next.y, w: btn.offsetWidth, h: btn.offsetHeight };
        if (!overlaps(candidate, forbidden, SAFE_GAP)) break;
        next = { x: Math.random() * maxX, y: Math.random() * maxY };
      }
      // 24번 안에 못 찾으면(아레나가 매우 좁은 경우) 아레나 최하단으로 밀어낸다.
      const last: Box = { x: next.x, y: next.y, w: btn.offsetWidth, h: btn.offsetHeight };
      if (overlaps(last, forbidden, SAFE_GAP)) {
        next = { x: Math.random() * maxX, y: maxY };
      }
    }

    setPos(next);
    fleeCountRef.current += 1;
    setFleeCount(fleeCountRef.current);

    // 이동 트랜지션(260ms)이 끝난 뒤 다시 잡을 수 있게 한다.
    window.setTimeout(() => {
      fleeingRef.current = false;
      setKick(null);
    }, 300);
  }, []);

  /**
   * 터치 환경 전용: 손가락이 버튼 근처로 오면 닿기 전에 피한다.
   * hover 가 있는 기기에서는 등록하지 않는다 (마우스는 onMouseEnter 로 충분).
   */
  useEffect(() => {
    const arena = arenaRef.current;
    if (!arena) return;
    if (window.matchMedia('(hover: hover)').matches) return;

    function onTouchMove(e: TouchEvent) {
      const btn = noBtnRef.current;
      const touch = e.touches[0];
      if (!btn || !touch) return;

      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(touch.clientX - cx, touch.clientY - cy);
      if (dist < TOUCH_SENSE_RADIUS) flee();
    }

    arena.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => arena.removeEventListener('touchmove', onTouchMove);
  }, [flee]);

  const label = fleeCount >= FLEE_LIMIT ? GIVE_UP_LABEL : INITIAL_LABEL;

  return (
    <div className="screen">
      {/* 앞줄은 작고 흐리게, 뒷줄이 주인공. 같은 크기면 위계가 안 보인다. */}
      <p className="invite-from">{hostName}이(가) 물어봐요</p>
      <h1 className="title invite-title">나랑 풋살할래?</h1>

      <dl className="invite-meta">
        <div>
          <dt>언제</dt>
          <dd>
            {formatMatchDate(match.matchDate)} {match.matchTime}
          </dd>
        </div>
        <div>
          <dt>어디서</dt>
          <dd>{match.venue}</dd>
        </div>
      </dl>

      <p className="subtitle">거절은 물리적으로 불가능합니다</p>

      {/* 마감된 경기는 시작 전에 알린다. 관문을 다 통과한 뒤
          서버에서 거부당하면 헛수고가 된다. */}
      {isPast && (
        <p className="warn" role="status">
          이미 지난 경기라 참석 등록이 마감됐어요
          <br />
          주최자에게 새 초대장을 요청해 주세요.
        </p>
      )}

      <div className="invite-arena" ref={arenaRef}>
        <button
          type="button"
          ref={yesBtnRef}
          className="btn btn-primary invite-yes"
          onClick={onAccept}
          disabled={isPast}
        >
          좋아! 🙌
        </button>

        {kick && (
          <span className="kick" style={{ left: kick.x, top: kick.y }} key={kick.id}>
            {/*
              에셋이 있으면 이미지, 없으면 이모지로 폴백한다. MediaBox 를 쓰지
              않는 이유는 이 연출이 박스가 아니라 튀어나오는 스프라이트라서다.
              onError 에서 상태를 바꾸면 420ms 애니메이션이 끊기므로, 실패한
              이미지를 숨기고 뒤의 이모지가 드러나게 한다(CSS).
            */}
            <img
              className="kick-img"
              src="/assets/kick.gif"
              alt=""
              aria-hidden="true"
              onError={(e) => {
                e.currentTarget.classList.add('failed');
              }}
            />
            <span className="kick-emoji" aria-hidden="true">
              🦵
            </span>
          </span>
        )}

        <button
          type="button"
          ref={noBtnRef}
          className={`btn invite-no${fleeingRef.current ? ' fleeing' : ''}`}
          style={
            pos
              ? { transform: `translate(${pos.x}px, ${pos.y}px)`, left: 0, top: 0 }
              : // "좋아!"(높이 56, top 0) 아래로 24px 띄운다. 예전 78 은 간격이
                // 14px 밖에 안 돼 두 버튼이 붙어 보이고 오탭 위험도 있었다.
                { left: '50%', top: 80, transform: 'translateX(-50%)' }
          }
          onMouseEnter={flee}
          onTouchStart={flee}
          onFocus={flee}
          onClick={(e) => {
            // 어떤 경로로도 거절이 성립하지 않게 한다.
            e.preventDefault();
            if (fleeCountRef.current >= FLEE_LIMIT) {
              setGauntlet(true);
              return;
            }
            flee();
          }}
        >
          {label}
        </button>

        {fleeCount > 0 && (
          <p className="flee-count">
            {fleeCount}번 시도…{' '}
            {fleeCount >= FLEE_LIMIT ? '눌러보세요, 심사해 드립니다 🐐' : '계속 해보세요'}
          </p>
        )}
      </div>

      {gauntlet && <RejectGauntlet onClose={() => setGauntlet(false)} />}
    </div>
  );
}

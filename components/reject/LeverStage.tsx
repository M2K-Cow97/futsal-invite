'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { buzz } from '@/lib/tilt';
import { RejectShell } from './RejectShell';
import type { StageProps } from './types';
import { useTimers } from './useTimers';

/** 이만큼 실패하면 다음 관문으로 넘어갈 수 있게 해준다. */
const GIVE_UP_AFTER = 3;
/** 수비수 수. */
const DEFENDERS = 5;
/** 충돌 판정 반경(%). 공 반폭 + 수비 반폭. */
const HIT_RADIUS = 8.5;
/** 골라인 도달선(%). 오른쪽 끝. */
const GOAL_X = 92;

type Foe = { id: number; x: number; y: number; vx: number; vy: number };
type Phase = 'ready' | 'running' | 'stolen' | 'almost' | 'betrayed';

/** 공을 빼앗겼을 때 사유. */
const STEALS = [
  '호날두가 공을 뺏었습니다',
  '태클에 걸렸습니다',
  '호날두와 부딪혔습니다',
  '공을 빼앗겼습니다',
];

/**
 * ① 호날두를 뚫어라 — 공을 끌고 반대쪽 골대까지 간다.
 *
 * 필드에 호날두 여럿이 빠르게 돌아다닌다. 손가락으로 공을 끌어 오른쪽
 * 골라인까지 도달해야 거절이 접수된다. 부딪히면 처음부터.
 *
 * 물론 접수되지 않는다 — 골라인에 닿으면 "오프사이드" 로 무효가 된다.
 */
export function LeverStage({ onGiveUp, onClose }: StageProps) {
  const timers = useTimers();
  const fieldRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>('ready');
  const [ball, setBall] = useState({ x: 6, y: 50 });
  const [foes, setFoes] = useState<Foe[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [best, setBest] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const ballRef = useRef({ x: 6, y: 50 });
  const foesRef = useRef<Foe[]>([]);
  const bestRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('ready');

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /** 골라인 도달 → 오프사이드로 무효. 이 게임의 배신이다. */
  const betray = useCallback(() => {
    setPhase('almost');
    setMessage('골라인 도달! 거절 접수 중…');
    buzz(30);

    timers.set(() => {
      setPhase('betrayed');
      setMessage('오프사이드입니다. 호날두보다 앞서 있었습니다');
      buzz([40, 60, 40]);
      setAttempts((n) => n + 1);
      timers.set(() => {
        setMessage(null);
        setPhase('ready');
      }, 1600);
    }, 900);
  }, [timers]);

  /** 공을 빼앗겼다. */
  const steal = useCallback(() => {
    setPhase('stolen');
    setAttempts((n) => n + 1);
    setMessage(STEALS[Math.floor(Math.random() * STEALS.length)]);
    buzz([50, 40, 50]);
  }, []);

  function start() {
    ballRef.current = { x: 6, y: 50 };
    setBall({ x: 6, y: 50 });

    // 수비수를 필드 오른쪽에 흩어 놓고 무작위 방향으로 달리게 한다.
    const init: Foe[] = Array.from({ length: DEFENDERS }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 34 + Math.random() * 26;
      return {
        id: i,
        x: 22 + Math.random() * 68,
        y: 10 + Math.random() * 80,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      };
    });
    foesRef.current = init;
    setFoes(init);
    setMessage(null);
    setPhase('running');
  }

  /** 게임 루프: 수비수 이동 + 충돌·골 판정. */
  useEffect(() => {
    if (phase !== 'running') return;
    let last = performance.now();

    function tick(now: number) {
      const dt = Math.min(48, now - last);
      last = now;
      const s = dt / 1000;

      const b0 = ballRef.current;
      const moved = foesRef.current.map((f) => {
        let { x, y, vx, vy } = f;
        // id 0 은 추격자. 공 쪽으로 방향을 꾸준히 튼다 — 버티기만 하는 전략을 막는다.
        if (f.id === 0) {
          const ang = Math.atan2(b0.y - y, b0.x - x);
          const sp = 44;
          vx = vx * 0.9 + Math.cos(ang) * sp * 0.1;
          vy = vy * 0.9 + Math.sin(ang) * sp * 0.1;
        }
        x += vx * s;
        y += vy * s;
        // 벽에서 튕긴다.
        if (x < 10) { x = 10; vx = Math.abs(vx); }
        else if (x > 96) { x = 96; vx = -Math.abs(vx); }
        if (y < 8) { y = 8; vy = Math.abs(vy); }
        else if (y > 92) { y = 92; vy = -Math.abs(vy); }
        return { ...f, x, y, vx, vy };
      });
      foesRef.current = moved;
      setFoes(moved);

      // 충돌 판정
      const b = ballRef.current;
      for (const f of moved) {
        if (Math.hypot(f.x - b.x, f.y - b.y) <= HIT_RADIUS) {
          steal();
          return;
        }
      }

      // 최고 전진 기록
      if (b.x > bestRef.current) {
        bestRef.current = b.x;
        setBest(b.x);
      }

      // 골라인 도달
      if (b.x >= GOAL_X) {
        betray();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, steal, betray]);

  /** 손가락으로 공을 끈다. */
  const drag = useCallback((clientX: number, clientY: number) => {
    if (phaseRef.current !== 'running') return;
    const el = fieldRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(3, Math.min(97, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(6, Math.min(94, ((clientY - rect.top) / rect.height) * 100));
    ballRef.current = { x, y };
    setBall({ x, y });
  }, []);

  return (
    <RejectShell
      title="호날두를 뚫어라"
      subtitle="공을 끌고 오른쪽 골라인까지 가면 거절이 접수됩니다."
    >
      <div
        className="dribble-field"
        ref={fieldRef}
        onPointerMove={(e) => drag(e.clientX, e.clientY)}
        onPointerDown={(e) => drag(e.clientX, e.clientY)}
      >
        <span className="dribble-goalline" aria-hidden="true" />
        {foes.map((f) => (
          <span
            key={f.id}
            className="dribble-foe"
            style={{ left: `${f.x}%`, top: `${f.y}%` }}
            aria-hidden="true"
          >
            🧍‍♂️
          </span>
        ))}
        <span
          className="dribble-ball"
          style={{ left: `${ball.x}%`, top: `${ball.y}%` }}
          aria-hidden="true"
        >
          ⚽
        </span>
      </div>

      <p className="aim-readout">
        최고 전진 {Math.round((best / GOAL_X) * 100)}% · 빼앗김 {attempts}회
      </p>

      {message ? (
        <p className={`lever-msg${phase === 'betrayed' || phase === 'stolen' ? ' bad' : ''}`}>
          {message}
        </p>
      ) : (
        <p className="lever-hint">공을 문질러 끌고 가세요. 부딪히면 빼앗깁니다</p>
      )}

      {(phase === 'ready' || phase === 'stolen') && (
        <button type="button" className="btn btn-primary btn-block" onClick={start}>
          {phase === 'stolen' ? '다시 드리블' : '드리블 시작'}
        </button>
      )}

      <div className="reject-footer modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          그냥 할래
        </button>
        {attempts >= GIVE_UP_AFTER && (
          <button type="button" className="btn btn-accent" onClick={onGiveUp}>
            다른 방법으로 거절
          </button>
        )}
      </div>
    </RejectShell>
  );
}

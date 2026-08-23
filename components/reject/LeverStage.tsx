'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { buzz } from '@/lib/tilt';
import { RejectShell } from './RejectShell';
import type { StageProps } from './types';
import { useTimers } from './useTimers';

/**
 * 거절 버튼의 반폭(트랙 대비 %). 좁다 —
 * 어차피 맞춰도 배신당하는 단계라 쉽게 통과하면 시시하다.
 */
const ZONE_HALF = 3.2;
/** 이만큼 시도하면 다음 관문으로 넘어갈 수 있게 해준다. */
const GIVE_UP_AFTER = 3;
/** 커서가 왕복하는 속도(%/초). */
const SPEED = 58;

type Phase = 'ready' | 'running' | 'almost' | 'betrayed' | 'missed';

/**
 * ① 거절 버튼 조준 — 움직이는 커서를 "거절" 버튼에 맞춘다.
 *
 * 예전에는 슬라이더를 87.00 에 맞추는 숫자 게임이었다. 정밀하긴 했지만 무엇을
 * 왜 맞추는지 감각이 없어 와닿지 않았다. 이제 실제로 **거절 버튼**을 조준한다:
 * 커서가 좌우로 왕복하고, 버튼 위에서 멈추면 거절이 접수된다.
 *
 * 물론 접수되지 않는다. 맞추면 "버튼 위치 오차" 라며 버튼을 옮긴다.
 */
export function LeverStage({ onGiveUp, onClose }: StageProps) {
  const timers = useTimers();

  const [phase, setPhase] = useState<Phase>('ready');
  const [cursor, setCursor] = useState(4);
  /** 거절 버튼의 중심 위치(%). 배신할 때마다 옮긴다. */
  const [target, setTarget] = useState(50);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const posRef = useRef(4);
  const dirRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef(50);
  const phaseRef = useRef<Phase>('ready');

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  /** 커서 왕복 루프. */
  useEffect(() => {
    if (phase !== 'running') return;
    let last = performance.now();

    function tick(now: number) {
      const dt = Math.min(48, now - last);
      last = now;

      posRef.current += dirRef.current * SPEED * (dt / 1000);
      if (posRef.current >= 96) {
        posRef.current = 96;
        dirRef.current = -1;
      } else if (posRef.current <= 4) {
        posRef.current = 4;
        dirRef.current = 1;
      }
      setCursor(posRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  /** 맞췄다 → 곧바로 배신. 버튼이 "미세하게 이동" 한다. */
  const betray = useCallback(() => {
    setPhase('almost');
    setMessage('✨ 거절 버튼 조준 성공! …접수 중');
    buzz(30);

    timers.set(() => {
      setPhase('betrayed');
      setMessage('⚠ 버튼 위치 오차가 감지되었습니다. 재배치합니다');
      buzz([40, 60, 40]);
      setAttempts((n) => n + 1);

      timers.set(() => {
        // 방금 맞춘 자리가 아니게, 커서 반대편으로 옮긴다.
        const next = posRef.current > 50 ? 18 + Math.random() * 16 : 66 + Math.random() * 16;
        setTarget(next);
        setMessage(null);
        setPhase('running');
      }, 1200);
    }, 900);
  }, [timers]);

  /** 조준 시도. */
  const fire = useCallback(() => {
    if (phaseRef.current !== 'running') return;

    if (Math.abs(posRef.current - targetRef.current) <= ZONE_HALF) {
      betray();
      return;
    }

    setAttempts((n) => n + 1);
    setPhase('missed');
    setMessage('빗나갔습니다. 거절 버튼을 정확히 누르세요');
    buzz(20);
    timers.set(() => {
      setMessage(null);
      setPhase('running');
    }, 700);
  }, [betray, timers]);

  const running = phase === 'running';

  return (
    <RejectShell
      title="거절 버튼 조준 🎯"
      subtitle="커서가 '거절' 버튼에 겹칠 때 멈추세요. 정확히 맞춰야 접수됩니다."
    >
      <div className="aim-track">
        <div
          className="aim-target"
          style={{ left: `${target - ZONE_HALF}%`, width: `${ZONE_HALF * 2}%` }}
        >
          <span className="aim-target-label">거절</span>
        </div>
        <div className="aim-cursor" style={{ left: `${cursor}%` }} aria-hidden="true" />
      </div>

      <p className="aim-readout">시도 {attempts}회</p>

      {message ? (
        <p className={`lever-msg${phase === 'betrayed' || phase === 'missed' ? ' bad' : ''}`}>
          {message}
        </p>
      ) : (
        <p className="lever-hint">⚠ 버튼이 작습니다. 커서가 정확히 겹칠 때 누르세요</p>
      )}

      {phase === 'ready' ? (
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => setPhase('running')}
        >
          조준 시작
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!running}
          onClick={fire}
        >
          지금! 멈춰
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

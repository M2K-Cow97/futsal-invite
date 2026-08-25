'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { buzz } from '@/lib/tilt';
import { RejectShell } from './RejectShell';
import type { StageProps } from './types';
import { useTimers } from './useTimers';

/**
 * 거절 버튼의 반폭(트랙 대비 %). 아주 얇다.
 *
 * 난이도는 "판정 구간이 열려 있는 시간" 으로 계산해야 한다:
 *   구간(ms) = (ZONE_HALF * 2 / SPEED) * 1000
 * 1.4 * 2 / 190 → 약 15ms. 사람 반응속도(200~250ms)로는 보고 누를 수 없고,
 * 커서의 왕복 리듬을 외워 미리 눌러야 맞는다. 그래서 여러 번 시도하게 된다.
 */
const ZONE_HALF = 1.4;
/** 이만큼 실패하면 다음 관문으로 넘어갈 수 있게 해준다. */
const GIVE_UP_AFTER = 4;
/** 요구되는 연속 성공. 한 번은 운으로 맞을 수 있다. */
const REQUIRED_STREAK = 3;
/** 커서가 왕복하는 속도(%/초). 빠르다. */
const SPEED = 190;

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
  /**
   * 연속 성공 횟수. 한 번은 운으로 맞을 수 있어 3연속을 요구한다.
   * 빗나가면 0 으로 돌아간다.
   */
  const [streak, setStreak] = useState(0);
  /* fire() 는 useCallback 이라 렌더 시점의 streak 를 클로저로 잡는다. 최신값이
     필요하므로 ref 로 미러링한다(의존성에 streak 를 넣으면 매 성공마다 콜백이
     재생성돼 불필요하다). */
  const streakRef = useRef(0);

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
    setMessage('거절 버튼 조준 성공. 접수 중…');
    buzz(30);

    timers.set(() => {
      setPhase('betrayed');
      setMessage('버튼 위치 오차가 감지되었습니다. 재배치합니다');
      buzz([40, 60, 40]);
      setAttempts((n) => n + 1);

      timers.set(() => {
        // 방금 맞춘 자리가 아니게, 커서 반대편으로 옮긴다.
        const next = posRef.current > 50 ? 18 + Math.random() * 16 : 66 + Math.random() * 16;
        setTarget(next);
        streakRef.current = 0;
        setStreak(0);
        setMessage(null);
        setPhase('running');
      }, 1200);
    }, 900);
  }, [timers]);

  /** 조준 시도. */
  const fire = useCallback(() => {
    if (phaseRef.current !== 'running') return;

    if (Math.abs(posRef.current - targetRef.current) <= ZONE_HALF) {
      const next = streakRef.current + 1;
      streakRef.current = next;
      setStreak(next);
      if (next >= REQUIRED_STREAK) {
        betray();
        return;
      }
      // 아직 부족하다. 맞을수록 버튼이 더 얇아지는 것처럼 느껴지게 위치를 옮긴다.
      setPhase('missed');
      setMessage(`좋아요! ${next}/${REQUIRED_STREAK} 연속 — 계속하세요`);
      buzz(15);
      timers.set(() => {
        setTarget(posRef.current > 50 ? 16 + Math.random() * 20 : 64 + Math.random() * 20);
        setMessage(null);
        setPhase('running');
      }, 600);
      return;
    }

    setAttempts((n) => n + 1);
    streakRef.current = 0;
    setStreak(0);
    setPhase('missed');
    setMessage('빗나갔습니다. 연속 기록이 초기화됩니다');
    buzz(20);
    timers.set(() => {
      setMessage(null);
      setPhase('running');
    }, 700);
  }, [betray, timers]);

  const running = phase === 'running';

  return (
    <RejectShell
      title="거절 버튼 조준"
      subtitle={`커서가 '거절' 버튼에 겹칠 때 멈추세요. ${REQUIRED_STREAK}연속 성공해야 접수됩니다.`}
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

      <p className="aim-readout">
        연속 {streak}/{REQUIRED_STREAK} · 실패 {attempts}회
      </p>

      {message ? (
        <p className={`lever-msg${phase === 'betrayed' || phase === 'missed' ? ' bad' : ''}`}>
          {message}
        </p>
      ) : (
        <p className="lever-hint">버튼이 작습니다. 커서가 정확히 겹칠 때 누르세요</p>
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

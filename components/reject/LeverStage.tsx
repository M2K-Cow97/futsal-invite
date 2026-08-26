'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { buzz } from '@/lib/tilt';
import { RejectShell } from './RejectShell';
import type { StageProps } from './types';
import { useTimers } from './useTimers';

/**
 * 호날두의 수비 반경(트랙 대비 %). 이 안에서 밀면 차단당한다.
 * 좌우로 왕복하므로 "틈"은 호날두가 반대편으로 갔을 때 생긴다.
 */
const GUARD_HALF = 10;
/** 이만큼 실패하면 다음 관문으로 넘어갈 수 있게 해준다. */
const GIVE_UP_AFTER = 4;
/** 요구되는 돌파 횟수. 한 번은 운으로 뚫을 수 있다. */
const REQUIRED_BEATS = 3;
/** 호날두가 좌우로 움직이는 속도(%/초). */
const SPEED = 96;

type Phase = 'ready' | 'running' | 'pushing' | 'almost' | 'betrayed' | 'blocked';

/** 차단 사유. 뚫려도 결국 다른 핑계가 붙는다. */
const BLOCKS = [
  '막혔습니다. 호날두가 먼저 읽었습니다',
  '몸싸움에서 밀렸습니다',
  '호날두가 발을 뻗었습니다. 공 빼앗김',
  '공이 발에서 떨어졌습니다',
];

/**
 * ① 호날두를 뚫어라 — 거절하려면 호날두를 드리블로 넘어서야 한다.
 *
 * 호날두가 좌우로 움직이며 길을 막는다. 틈이 났을 때 밀어야 통과하고,
 * 수비 반경 안에서 밀면 차단당한다. 타이밍 게임이지만 축구 상황이라
 * 무엇을 왜 하는지 바로 이해된다.
 *
 * 물론 끝내 통과하지 못한다. 3번 뚫으면 "파울" 로 무효가 된다.
 */
export function LeverStage({ onGiveUp, onClose }: StageProps) {
  const timers = useTimers();

  const [phase, setPhase] = useState<Phase>('ready');
  /** 호날두 위치(%). 좌우로 왕복한다. */
  const [guard, setGuard] = useState(50);
  /** 공 위치(%). 밀 때마다 전진한다. */
  const [ball, setBall] = useState(8);
  const [beats, setBeats] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const guardRef = useRef(50);
  const dirRef = useRef(1);
  const ballRef = useRef(8);
  const beatsRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('ready');

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /** 호날두 왕복 루프. */
  useEffect(() => {
    if (phase !== 'running') return;
    let last = performance.now();

    function tick(now: number) {
      const dt = Math.min(48, now - last);
      last = now;

      guardRef.current += dirRef.current * SPEED * (dt / 1000);
      if (guardRef.current >= 82) {
        guardRef.current = 82;
        dirRef.current = -1;
      } else if (guardRef.current <= 18) {
        guardRef.current = 18;
        dirRef.current = 1;
      }
      setGuard(guardRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  /** 3번 뚫었다 → 파울로 무효. 이 게임의 배신이다. */
  const betray = useCallback(() => {
    setPhase('almost');
    setMessage('돌파 성공! 거절 접수 중…');
    buzz(30);

    timers.set(() => {
      setPhase('betrayed');
      setMessage('파울입니다. 호날두가 넘어졌습니다');
      buzz([40, 60, 40]);
      setAttempts((n) => n + 1);

      timers.set(() => {
        ballRef.current = 8;
        beatsRef.current = 0;
        setBall(8);
        setBeats(0);
        setMessage(null);
        setPhase('running');
      }, 1300);
    }, 900);
  }, [timers]);

  /** 공을 민다. 호날두 수비 반경 안이면 차단. */
  const push = useCallback(() => {
    if (phaseRef.current !== 'running') return;

    const blocked = Math.abs(guardRef.current - ballRef.current) <= GUARD_HALF;

    if (blocked) {
      setAttempts((n) => n + 1);
      beatsRef.current = 0;
      ballRef.current = 8;
      setBeats(0);
      setBall(8);
      setPhase('blocked');
      setMessage(BLOCKS[Math.floor(Math.random() * BLOCKS.length)]);
      buzz(20);
      timers.set(() => {
        setMessage(null);
        setPhase('running');
      }, 900);
      return;
    }

    // 틈을 노렸다. 공이 전진한다.
    const next = beatsRef.current + 1;
    beatsRef.current = next;
    setBeats(next);
    ballRef.current = Math.min(92, ballRef.current + 28);
    setBall(ballRef.current);
    buzz(15);

    if (next >= REQUIRED_BEATS) {
      betray();
      return;
    }

    setPhase('pushing');
    setMessage(`뚫었습니다! ${next}/${REQUIRED_BEATS} — 계속 밀어붙이세요`);
    timers.set(() => {
      setMessage(null);
      setPhase('running');
    }, 650);
  }, [betray, timers]);

  const running = phase === 'running';

  return (
    <RejectShell
      title="호날두를 뚫어라"
      subtitle={`거절하려면 호날두를 넘어서야 합니다. ${REQUIRED_BEATS}번 돌파하면 접수됩니다.`}
    >
      <div className="dribble-pitch">
        {/* 호날두 수비 반경 — 이 안에서 밀면 막힌다 */}
        <div
          className="dribble-guard-zone"
          style={{ left: `${guard - GUARD_HALF}%`, width: `${GUARD_HALF * 2}%` }}
          aria-hidden="true"
        />
        <div className="dribble-guard" style={{ left: `${guard}%` }} aria-hidden="true">
          🧍
        </div>
        <div className="dribble-ball" style={{ left: `${ball}%` }} aria-hidden="true">
          ⚽
        </div>
        <span className="dribble-goal" aria-hidden="true" />
      </div>

      <p className="aim-readout">
        돌파 {beats}/{REQUIRED_BEATS} · 차단 {attempts}회
      </p>

      {message ? (
        <p className={`lever-msg${phase === 'betrayed' || phase === 'blocked' ? ' bad' : ''}`}>
          {message}
        </p>
      ) : (
        <p className="lever-hint">호날두가 멀어진 순간에 밀어야 합니다</p>
      )}

      {phase === 'ready' ? (
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => setPhase('running')}
        >
          드리블 시작
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!running}
          onClick={push}
        >
          지금! 밀기
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

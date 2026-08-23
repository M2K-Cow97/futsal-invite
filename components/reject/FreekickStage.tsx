'use client';

import { useEffect, useRef, useState } from 'react';
import { RejectShell } from './RejectShell';
import type { StageProps } from './types';
import { useTimers } from './useTimers';

const GIVE_UP_AFTER = 3;

/** 실패 사유. 매번 다른 핑계가 나와야 킹받는다. */
const EXCUSES = [
  '골키퍼가 막았습니다. 반응속도 0.01초.',
  '골대를 맞고 나왔습니다. 굴산대 판정.',
  'VAR 확인 중… 오프사이드입니다. 공에 발이 닿기 전에.',
  '바람이 불었습니다. 재시도해 주세요.',
  '골키퍼가 손을 안 썼는데도 막혔습니다.',
  '득점했지만 심판이 못 봤습니다.',
];

type Phase = 'aiming' | 'flying' | 'result';

export function FreekickStage({ onGiveUp, onClose }: StageProps) {
  /** 연출 타이머. 언마운트 시 자동 정리된다. */
  const timers = useTimers();
  const [power, setPower] = useState(0);
  const [phase, setPhase] = useState<Phase>('aiming');
  const [attempts, setAttempts] = useState(0);
  const [excuse, setExcuse] = useState<string | null>(null);
  const [ballX, setBallX] = useState(8);
  const risingRef = useRef(true);
  const rafRef = useRef<number | null>(null);

  // 파워 게이지가 계속 왕복한다. 멈추려면 탭해야 한다.
  useEffect(() => {
    if (phase !== 'aiming') return;

    let last = performance.now();
    function tick(now: number) {
      const dt = now - last;
      last = now;
      setPower((p) => {
        const speed = dt * 0.14;
        let next = risingRef.current ? p + speed : p - speed;
        if (next >= 100) {
          next = 100;
          risingRef.current = false;
        } else if (next <= 0) {
          next = 0;
          risingRef.current = true;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  function shoot() {
    if (phase !== 'aiming') return;
    setPhase('flying');

    // 공은 항상 골키퍼까지 날아간다. 파워가 완벽해도 결과는 같다.
    setBallX(72);

    timers.set(() => {
      setAttempts((n) => n + 1);
      setExcuse(EXCUSES[Math.floor(Math.random() * EXCUSES.length)]);
      setPhase('result');
    }, 900);
  }

  function retry() {
    setBallX(8);
    setExcuse(null);
    setPower(0);
    risingRef.current = true;
    setPhase('aiming');
  }

  const zone = power > 74 && power < 82;

  return (
    <RejectShell
      title="거절 프리킥"
      subtitle="골을 넣으면 거절이 인정됩니다. 파워를 완벽하게 맞추세요."
    >
      <div className="pitch">
        <div className="pitch-keeper" aria-hidden="true">
          🧍‍♂️
        </div>
        <div className="pitch-goal" aria-hidden="true" />
        <div
          className={`pitch-ball${phase === 'flying' ? ' flying' : ''}`}
          style={{ left: `${ballX}%` }}
          aria-hidden="true"
        >
          ⚽
        </div>
        <span className="pitch-keeper-label">키퍼: 호날두 · 키 187cm</span>
      </div>

      <div className="power-wrap">
        <div className="power-track">
          <div className="power-sweet" />
          <div className="power-fill" style={{ width: `${power}%` }} />
        </div>
        <span className={`power-num${zone ? ' zone' : ''}`}>{Math.round(power)}%</span>
      </div>

      {phase === 'result' && excuse ? (
        <p className="lever-msg bad">{excuse}</p>
      ) : (
        <p className="lever-hint">
          {phase === 'flying' ? '…' : '초록 구간에서 탭하세요 (75~81%)'}
        </p>
      )}

      <div className="modal-actions">
        {phase === 'aiming' && (
          <button type="button" className="btn btn-accent" onClick={shoot}>
            슛! ⚽
          </button>
        )}
        {phase === 'result' && (
          <button type="button" className="btn btn-accent" onClick={retry}>
            다시 차기
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          그냥 할래
        </button>
      </div>

      {attempts >= GIVE_UP_AFTER && (
        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginTop: 10 }}
          onClick={onGiveUp}
        >
          다른 방법으로 거절
        </button>
      )}
    </RejectShell>
  );
}

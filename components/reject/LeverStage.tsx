'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RejectShell } from './RejectShell';
import type { StageProps } from './types';

const TARGET = 87.0;
/** 이 오차 안에 들어오면 "달성" 처럼 보이게 하고, 곧바로 배신한다. */
const NEAR = 0.05;
/** 이만큼 실패하면 다음 관문으로 넘어갈 수 있게 해준다. */
const GIVE_UP_AFTER = 4;

type Phase = 'adjusting' | 'almost' | 'betrayed';

export function LeverStage({ onGiveUp, onClose }: StageProps) {
  const [value, setValue] = useState(55.2);
  const [phase, setPhase] = useState<Phase>('adjusting');
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const draggingRef = useRef(false);

  const diff = Math.abs(value - TARGET);

  /**
   * 손을 뗄 때마다 바늘이 흔들린다.
   * 목표에 거의 닿았으면 "달성" 을 잠깐 보여주고 리셋한다 — 이게 이 스테이지의 핵심이다.
   */
  const release = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    setAttempts((n) => n + 1);

    if (diff <= NEAR) {
      setPhase('almost');
      setMessage('✨ 달성! …잠시만요');
      window.setTimeout(() => {
        setPhase('betrayed');
        setMessage('⚠ 장치 재교정이 필요합니다');
        // 처음보다 더 먼 곳으로 보낸다.
        window.setTimeout(() => {
          setValue(12.4 + Math.random() * 70);
          setPhase('adjusting');
          setMessage(null);
        }, 1100);
      }, 800);
      return;
    }

    // 아직 멀면 살짝 틀어지기만 한다. 가까울수록 더 많이 떨린다.
    const jitter = diff < 1 ? 0.9 : diff < 5 ? 0.4 : 0.15;
    setValue((v) => {
      const next = v + (Math.random() - 0.5) * 2 * jitter * 6;
      return Math.min(100, Math.max(0, next));
    });
    setMessage(diff < 0.3 ? '아주 조금만 더…' : null);
  }, [diff]);

  // 슬라이더 밖에서 손을 떼도 잡히게 전역으로 듣는다.
  useEffect(() => {
    window.addEventListener('pointerup', release);
    window.addEventListener('touchend', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('touchend', release);
    };
  }, [release]);

  const locked = phase !== 'adjusting';

  return (
    <RejectShell
      title="정밀 거절 장치"
      subtitle={`거절을 확정하려면 레버를 정확히 ${TARGET.toFixed(2)} 에 맞추세요.`}
    >
      <div className="lever-readout">
        <span className={`lever-value${diff <= NEAR ? ' near' : ''}`}>{value.toFixed(2)}</span>
        <span className="lever-target">목표 {TARGET.toFixed(2)}</span>
      </div>

      <input
        className="lever-slider"
        type="range"
        min={0}
        max={100}
        step={0.01}
        value={value}
        disabled={locked}
        aria-label="거절 정밀도 레버"
        onPointerDown={() => {
          draggingRef.current = true;
        }}
        onTouchStart={() => {
          draggingRef.current = true;
        }}
        onChange={(e) => setValue(Number(e.target.value))}
      />

      <dl className="lever-stats">
        <div>
          <dt>오차</dt>
          <dd className={diff <= NEAR ? 'near' : ''}>{diff.toFixed(2)}</dd>
        </div>
        <div>
          <dt>시도</dt>
          <dd>{attempts}회</dd>
        </div>
      </dl>

      {message ? (
        <p className={`lever-msg${phase === 'betrayed' ? ' bad' : ''}`}>{message}</p>
      ) : (
        <p className="lever-hint">⚠ 레버에서 손을 떼면 장치가 미세하게 헐거워집니다</p>
      )}

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          그냥 할래
        </button>
        {attempts >= GIVE_UP_AFTER && (
          <button type="button" className="btn btn-primary" onClick={onGiveUp}>
            다른 방법으로 거절
          </button>
        )}
      </div>
    </RejectShell>
  );
}

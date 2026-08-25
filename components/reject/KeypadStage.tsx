'use client';

import { useState } from 'react';
import { RejectShell } from './RejectShell';
import type { StageProps } from './types';
import { useTimers } from './useTimers';

const GIVE_UP_AFTER = 4;

/** 매번 자리수가 바뀌는 "힌트". 맞출 수 없다는 걸 늦게 깨닫게 한다. */
const HINTS = [
  '6자리입니다',
  '아 죄송합니다, 8자리입니다',
  '10자리입니다. 방금 바꿨습니다',
  '숫자가 아니라 별자리입니다',
  '4자리인데 순서가 중요합니다',
  '호날두 등번호로 시작합니다 (7이 아닙니다)',
  '비밀번호에 소수(素數)만 들어갑니다',
  '지금 호날두는 윗몸일으키기 중입니다',
];

export function KeypadStage({ onGiveUp, onClose }: StageProps) {
  /** 연출 타이머. 언마운트 시 자동 정리된다. */
  const timers = useTimers();
  const [entry, setEntry] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [hint, setHint] = useState(HINTS[0]);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  function press(d: string) {
    if (checking || entry.length >= 12) return;
    setEntry((e) => e + d);
    setError(null);
  }

  function submit() {
    if (entry.length === 0 || checking) return;
    setChecking(true);
    setError(null);

    // 잠깐 "확인하는 척" 해야 진짜 같다.
    timers.set(() => {
      const n = attempts + 1;
      setAttempts(n);
      setError('틀렸습니다');
      setHint(HINTS[n % HINTS.length]);
      setEntry('');
      setChecking(false);
    }, 850);
  }

  return (
    <RejectShell
      title="라커룸 인증"
      subtitle="거절은 호날두 본인의 동의가 필요합니다. 라커룸 비밀번호를 입력하세요."
    >
      <div className="keypad-display">
        {checking ? (
          <span className="keypad-checking">확인 중…</span>
        ) : entry.length ? (
          <span className="keypad-dots">{'●'.repeat(entry.length)}</span>
        ) : (
          <span className="keypad-empty">비밀번호 입력</span>
        )}
      </div>

      <div className="keypad-grid">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className="keypad-key" onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <button
          type="button"
          className="keypad-key sub"
          onClick={() => setEntry((e) => e.slice(0, -1))}
        >
          ←
        </button>
        <button type="button" className="keypad-key" onClick={() => press('0')}>
          0
        </button>
        <button type="button" className="keypad-key ok" onClick={submit}>
          ✓
        </button>
      </div>

      {error && <p className="lever-msg bad">{error} (시도 {attempts}회)</p>}
      <p className="lever-hint">힌트: {hint}</p>

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

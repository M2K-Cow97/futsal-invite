'use client';

import { useState } from 'react';
import { buzz } from '@/lib/tilt';
import { RejectShell } from './RejectShell';
import type { StageProps } from './types';
import { useTimers } from './useTimers';

/** 한 번만 실패해도 다음 관문으로 넘어갈 수 있다. */
const GIVE_UP_AFTER = 1;

type Spot = { id: string; label: string; col: number; row: number };

/** 막을 수 있는 6곳. 어디를 골라도 들어간다. */
const SPOTS: Spot[] = [
  { id: 'tl', label: '좌측 상단', col: 0, row: 0 },
  { id: 'tc', label: '중앙 상단', col: 1, row: 0 },
  { id: 'tr', label: '우측 상단', col: 2, row: 0 },
  { id: 'bl', label: '좌측 하단', col: 0, row: 1 },
  { id: 'bc', label: '중앙 하단', col: 1, row: 1 },
  { id: 'br', label: '우측 하단', col: 2, row: 1 },
];

/**
 * 결과 문구. **맞춰도 들어간다** — 무회전킥이 너무 강해서 손을 맞고 들어간다.
 * 못 맞추면 그냥 반대편으로 들어간다.
 */
const SAVED_BUT_IN = [
  '손에 맞았습니다. 그대로 골망으로 들어갑니다',
  '방향은 맞췄습니다. 무회전킥이 손을 튕겨냈습니다',
  '닿았는데 밀렸습니다. 킥이 너무 강합니다',
  '펀칭했지만 공이 그대로 들어갔습니다',
];
const MISSED = [
  '반대편으로 들어갔습니다',
  '무회전이라 공이 늦게 꺾였습니다',
  '읽지 못했습니다',
  '공이 흔들리다 반대로 갔습니다',
];

type Phase = 'pick' | 'kicking' | 'result';

/**
 * 무회전 프리킥 막기 — 나는 호날두의 동생이고, 형이 프리킥을 막아보라고 한다.
 *
 * 6곳 중 하나를 고르면 호날두가 찬다. **어디를 골라도 골이 된다**:
 * 맞추면 무회전킥이 너무 강해 손을 맞고 들어가고, 못 맞추면 반대편으로 들어간다.
 * 방향을 맞췄다는 사실을 알려주기 때문에 "다음엔 될 것 같은" 착각이 남는다.
 */
export function FreekickStage({ onGiveUp, onClose }: StageProps) {
  const timers = useTimers();
  const [phase, setPhase] = useState<Phase>('pick');
  const [picked, setPicked] = useState<Spot | null>(null);
  const [shot, setShot] = useState<Spot | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [wasRight, setWasRight] = useState(false);
  const [assetOk, setAssetOk] = useState(true);

  function pick(spot: Spot) {
    if (phase !== 'pick') return;
    setPicked(spot);
    setPhase('kicking');
    setMessage('호날두가 달려옵니다…');
    buzz(15);

    timers.set(() => {
      // 절반 정도는 방향을 맞춘 것으로 처리해 "거의 됐다" 는 감각을 준다.
      // 절반은 방향 적중(막았는데 들어감), 절반은 오판(반대편으로 들어감).
      const right = Math.random() < 0.5;
      const target = right
        ? spot
        : (SPOTS.filter((s) => s.id !== spot.id)[
            Math.floor(Math.random() * (SPOTS.length - 1))
          ] as Spot);

      setShot(target);
      setWasRight(right);
      setMessage(
        right
          ? SAVED_BUT_IN[Math.floor(Math.random() * SAVED_BUT_IN.length)]
          : MISSED[Math.floor(Math.random() * MISSED.length)],
      );
      setAttempts((n) => n + 1);
      setPhase('result');
      buzz([50, 40, 50]);
    }, 1400);
  }

  function again() {
    setPicked(null);
    setShot(null);
    setMessage(null);
    setPhase('pick');
  }

  return (
    <RejectShell
      title="무회전 프리킥 막기"
      subtitle="형이 프리킥을 막아보라고 합니다. 한 번이라도 막으면 거절이 접수됩니다."
    >
      <div className="gk-goal">
        {SPOTS.map((s) => {
          const isPick = picked?.id === s.id;
          const isShot = phase === 'result' && shot?.id === s.id;
          return (
            <button
              key={s.id}
              type="button"
              className={[
                'gk-cell',
                isPick ? 'picked' : '',
                isShot ? (wasRight ? 'scored deflected' : 'scored') : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={phase !== 'pick'}
              onClick={() => pick(s)}
            >
              <span className="gk-cell-label">{s.label}</span>
              {isShot && (
                <span className={`gk-ball${wasRight ? ' deflected' : ''}`}>⚽</span>
              )}
              {isPick && phase !== 'pick' && (
                <span className={`gk-glove${wasRight ? ' touched' : ' missed'}`}>🧤</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="gk-kicker">
        {assetOk ? (
          // eslint-disable-next-line @next/next/no-img-element -- onError 폴백이 필요하다
          <img
            src="/assets/kick.gif"
            alt="프리킥을 차는 호날두"
            onError={() => setAssetOk(false)}
          />
        ) : (
          <span className="gk-kicker-fallback">🦵</span>
        )}
      </div>

      <p className="aim-readout">
        {phase === 'result'
          ? wasRight
            ? '손에 맞고 실점 · '
            : '방향 오판 · '
          : ''}
        실점 {attempts}회
      </p>

      {message ? (
        <p className={`lever-msg${phase === 'result' ? ' bad' : ''}`}>{message}</p>
      ) : (
        <p className="lever-hint">어디로 올지 골라 손을 뻗으세요</p>
      )}

      {phase === 'result' && (
        <button type="button" className="btn btn-primary btn-block" onClick={again}>
          다시 막기
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

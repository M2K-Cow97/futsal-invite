'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { buzz, detectTilt, isInAppBrowser, onTilt, requestTilt, type TiltSupport } from '@/lib/tilt';
import { RejectShell } from './RejectShell';
import type { StageProps } from './types';
import { useTimers } from './useTimers';

/**
 * 목표 구역(트랙 중앙 기준 %). 매우 얇다 — 트랙 폭의 3% 남짓.
 *
 * 난이도의 핵심은 구역 폭이 아니라 **관성**이다. 가속을 크게(0.05) 주고
 * 감쇠를 거의 없애(0.975) 공이 잘 멈추지 않게 했다. 기울인 방향으로 계속
 * 구르므로, 세우려면 목표 도달 전에 미리 반대로 기울여 감속해야 한다.
 * 3초를 버텨야 하는데 미세한 바닥 편향(drift)이 계속 밀어낸다.
 */
const ZONE_CENTER = 50;
const ZONE_HALF = 1.6;
/** 이만큼 버티면 "달성" 처럼 보이게 한 뒤 배신한다. */
const HOLD_MS = 3000;
const GIVE_UP_AFTER = 1;
/** 안내 문구용. HOLD_MS 를 바꿨는데 문구가 그대로면 거짓 정보가 된다. */
const HOLD_SEC = HOLD_MS / 1000;

type Phase = 'intro' | 'playing' | 'almost' | 'betrayed' | 'fallback';

/** 센서를 못 쓰는 이유별 안내. 사용자를 헤매게 두지 않는다. */
const FALLBACK_REASON: Partial<Record<TiltSupport, string>> = {
  insecure: '보안 연결(https)이 아니라 센서를 쓸 수 없어요. 손가락 모드로 진행합니다',
  'inapp-browser':
    '카톡 브라우저는 센서를 막아요. 손가락 모드로 진행합니다 (⋯ → 다른 브라우저로 열기)',
  unsupported: '이 브라우저는 기울기 센서를 지원하지 않아요. 손가락 모드로 진행합니다',
  denied: '센서 권한이 없어 손가락 모드로 진행합니다',
};

export function TiltStage({ onGiveUp, onClose }: StageProps) {
  const [support, setSupport] = useState<TiltSupport>('unsupported');
  const [phase, setPhase] = useState<Phase>('intro');
  const [ball, setBall] = useState(12);
  const [held, setHeld] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  /** 물리 상태는 ref 로. 매 프레임 리렌더를 유발하지 않는다. */
  const posRef = useRef(12);
  const velRef = useRef(0);
  const tiltRef = useRef(0);
  const heldRef = useRef(0);
  const driftRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('intro');
  /** 'playing'(센서) 또는 'fallback'(드래그). 배신 후 이 모드로 돌아간다. */
  const modeRef = useRef<'playing' | 'fallback'>('playing');

  useEffect(() => {
    setSupport(detectTilt());
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /** 연출 타이머. 언마운트/스테이지 전환 시 자동 정리된다. */
  const timers = useTimers();

  /** 달성 직전 배신. 이 게임의 핵심이다. */
  const betray = useCallback(() => {
    setPhase('almost');
    phaseRef.current = 'almost';
    setMessage('✨ 안정화 완료! …검증 중');
    buzz(30);

    timers.set(() => {
      setPhase('betrayed');
      phaseRef.current = 'betrayed';
      setMessage('⚠ 센서 오차가 감지되었습니다. 재보정합니다');
      buzz([40, 60, 40]);
      setAttempts((n) => n + 1);

      timers.set(() => {
        // 반대편 끝으로 보내고 바닥을 기울여 놓는다.
        posRef.current = posRef.current > 50 ? 8 : 92;
        velRef.current = 0;
        heldRef.current = 0;
        driftRef.current = (Math.random() - 0.5) * 0.02;
        setBall(posRef.current);
        setHeld(0);
        setMessage(null);
        // 드래그 모드였다면 드래그 모드로 되돌린다.
        const resume = modeRef.current;
        setPhase(resume);
        phaseRef.current = resume;
      }, 1300);
    }, 900);
  }, [timers]);

  /** 물리 루프: 기울기 → 가속 → 위치. 미끄러운 바닥 느낌. */
  useEffect(() => {
    // 드래그 폴백도 같은 물리를 쓴다 — 두 모드 모두 루프가 필요하다.
    if (phase !== 'playing' && phase !== 'fallback') return;

    let last = performance.now();
    function tick(now: number) {
      const dt = Math.min(48, now - last);
      last = now;

      if (phaseRef.current === 'playing' || phaseRef.current === 'fallback') {
        // 기울기 가속 + 미세한 편향(재보정 후 바닥이 기울어져 있다)
        // 가속을 키우고 감쇠를 줄였다 — 예민하고 미끄럽다. 살짝만 기울여도
        // 확 구르고, 멈추려면 반대로 기울여 잡아야 한다(오버슈트가 잘 난다).
        velRef.current += (tiltRef.current * 0.05 + driftRef.current) * dt;
        velRef.current *= 0.975;
        posRef.current += velRef.current * dt * 0.05;

        // 벽에 튕긴다
        if (posRef.current < 2) {
          posRef.current = 2;
          velRef.current = Math.abs(velRef.current) * 0.55;
        } else if (posRef.current > 98) {
          posRef.current = 98;
          velRef.current = -Math.abs(velRef.current) * 0.55;
        }

        setBall(posRef.current);

        // 목표 구역 안에서 버티기
        const inZone = Math.abs(posRef.current - ZONE_CENTER) <= ZONE_HALF;
        heldRef.current = inZone ? heldRef.current + dt : 0;
        setHeld(heldRef.current);

        if (heldRef.current >= HOLD_MS) {
          betray();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, betray]);

  /** 센서 구독 */
  useEffect(() => {
    if (phase === 'intro' || support === 'unsupported' || support === 'denied') return;
    return onTilt((normalized) => {
      tiltRef.current = normalized;
    });
  }, [phase, support]);

  /**
   * 시작. iOS 는 **사용자 제스처 안에서** 권한을 요청해야 하고,
   * 거부되면 프로그램으로 다시 물어볼 수 없다(단 한 번). 그래서 인앱 브라우저나
   * http 환경은 요청 자체를 하지 않고 바로 손가락 모드로 보낸다.
   */
  async function start() {
    if (support === 'needs-permission') {
      const result = await requestTilt();
      setSupport(result);
      if (result === 'denied') {
        modeRef.current = 'fallback';
        setPhase('fallback');
        setMessage('센서 권한이 없어 손가락 모드로 진행합니다');
        return;
      }
      modeRef.current = 'playing';
      setPhase('playing');
      return;
    }

    if (support !== 'ready') {
      modeRef.current = 'fallback';
      setPhase('fallback');
      setMessage(FALLBACK_REASON[support] ?? '손가락 모드로 진행합니다');
      return;
    }

    modeRef.current = 'playing';
    setPhase('playing');
  }

  /**
   * 폴백: 트랙을 문질러 바닥을 기울인다.
   *
   * 손가락 위치를 목표 지점으로 삼으면(예전 방식) 공을 직접 끌고 가는 것과 같아
   * 구역에 손을 대고만 있어도 2초가 채워진다 — 센서 모드와 난이도가 딴판이었다.
   * 그래서 손가락의 **중앙 기준 좌우 편차**를 기울기로 환산한다. 센서에서
   * gamma/45 를 쓰는 것과 같은 의미다: 위치가 아니라 가속을 준다.
   */
  function onDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (phase !== 'playing' && phase !== 'fallback') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    // 중앙(50)에서 벗어난 만큼이 기울기. 끝을 잡으면 최대 기울기(±1).
    tiltRef.current = Math.max(-1, Math.min(1, (pct - 50) / 50));
  }

  /** 트랙에서 손을 떼면 바닥이 수평으로 돌아온다. */
  function onDragEnd() {
    tiltRef.current = 0;
  }

  const usingTilt = support === 'ready' && phase !== 'fallback';
  const progress = Math.min(100, (held / HOLD_MS) * 100);
  const active = phase === 'playing' || phase === 'fallback';

  return (
    <RejectShell
      title="거절 각 재기 📐"
      subtitle={
        usingTilt
          ? `폰을 좌우로 기울여 공을 목표 구역에 ${HOLD_SEC}초간 세우세요.`
          : `트랙 좌우를 눌러 바닥을 기울이세요. 공을 목표 구역에 ${HOLD_SEC}초간 세우면 됩니다.`
      }
    >
      <div
        className="tilt-track"
        onPointerMove={onDrag}
        onPointerDown={onDrag}
        onPointerUp={onDragEnd}
        onPointerLeave={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <div
          className="tilt-zone"
          style={{ left: `${ZONE_CENTER - ZONE_HALF}%`, width: `${ZONE_HALF * 2}%` }}
        />
        <div className="tilt-ball" style={{ left: `${ball}%` }} aria-hidden="true">
          ⚽
        </div>
      </div>

      <div className="tilt-hold">
        <div className="tilt-hold-fill" style={{ width: `${progress}%` }} />
      </div>
      <span className="tilt-hold-label">
        유지 {(held / 1000).toFixed(1)}초 / {HOLD_SEC.toFixed(1)}초 · 시도 {attempts}회
      </span>

      {message ? (
        <p className={`lever-msg${phase === 'betrayed' ? ' bad' : ''}`}>{message}</p>
      ) : phase === 'intro' && support !== 'ready' && support !== 'needs-permission' ? (
        <p className="lever-hint">{FALLBACK_REASON[support]}</p>
      ) : (
        <p className="lever-hint">
          {usingTilt ? '📱 폰을 살짝 기울이세요' : '👆 트랙 좌우를 눌러 기울이세요'}
        </p>
      )}

      <div className="modal-actions">
        {phase === 'intro' ? (
          <button type="button" className="btn btn-accent" onClick={start}>
            {support === 'needs-permission'
              ? '센서 켜고 시작'
              : support === 'ready'
                ? '시작'
                : '손가락으로 시작'}
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          그냥 할래
        </button>
      </div>

      {active && attempts >= GIVE_UP_AFTER && (
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

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buzz,
  detectTilt,
  onTilt2D,
  requestTilt,
  type TiltSupport,
} from '@/lib/tilt';
import { RejectShell } from './RejectShell';
import type { StageProps } from './types';
import { useTimers } from './useTimers';

/** 한 번만 실패해도 다음 관문으로 넘어갈 수 있다. */
const GIVE_UP_AFTER = 1;
/** 수비수 수. */
const DEFENDERS = 5;
/** 충돌 판정 반경(%). */
const HIT_RADIUS = 8.5;
/** 골라인 도달선(%). */
const GOAL_X = 92;
/** 기울기 → 가속 계수. 공이 미끄러지는 느낌을 준다. */
const TILT_ACCEL = 200;
/** 속도 감쇠. 1에 가까울수록 잘 미끄러진다. */
const FRICTION = 0.97;

type Foe = { id: number; x: number; y: number; vx: number; vy: number };
type Phase = 'intro' | 'running' | 'stolen' | 'almost' | 'betrayed';

const STEALS = [
  '호날두가 공을 뺏었습니다',
  '태클에 걸렸습니다',
  '호날두와 부딪혔습니다',
  '공을 빼앗겼습니다',
];

/** 센서를 못 쓰는 이유별 안내. */
const FALLBACK_REASON: Partial<Record<TiltSupport, string>> = {
  insecure: '보안 연결(https)이 아니라 센서를 쓸 수 없어요. 손가락 모드로 진행합니다',
  'inapp-browser':
    '카톡 브라우저는 센서를 막아요. 손가락 모드로 진행합니다 (⋯ → 다른 브라우저로 열기)',
  unsupported: '이 브라우저는 기울기 센서를 지원하지 않아요. 손가락 모드로 진행합니다',
  denied: '센서 권한이 없어 손가락 모드로 진행합니다',
};

/**
 * ① 호날두를 뚫어라 — 폰을 기울여 공을 굴려 골라인까지 간다.
 *
 * 손가락으로 끌면 골대를 바로 찍어 이길 수 있었다. 이제 **폰 기울기로
 * 공을 굴린다** — 관성이 있어 정밀 제어가 어렵고, 수비수를 피하려면
 * 미리 기울여 감속해야 한다. 센서를 못 쓰는 환경에서는 손가락 드래그로
 * 대체하되, 그때도 같은 물리를 적용해 순간이동을 막는다.
 *
 * 물론 도달해도 접수되지 않는다 — "오프사이드" 로 무효가 된다.
 */
export function LeverStage({ onGiveUp, onClose }: StageProps) {
  const timers = useTimers();
  const fieldRef = useRef<HTMLDivElement>(null);

  const [support, setSupport] = useState<TiltSupport>('unsupported');
  const [phase, setPhase] = useState<Phase>('intro');
  const [ball, setBall] = useState({ x: 6, y: 50 });
  const [foes, setFoes] = useState<Foe[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [best, setBest] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [assetOk, setAssetOk] = useState(true);

  const ballRef = useRef({ x: 6, y: 50 });
  const velRef = useRef({ x: 0, y: 0 });
  const tiltRef = useRef({ x: 0, y: 0 });
  const foesRef = useRef<Foe[]>([]);
  const bestRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('intro');
  /** 'tilt' 또는 'touch'. 배신 후에도 같은 모드로 돌아간다. */
  const modeRef = useRef<'tilt' | 'touch'>('tilt');

  useEffect(() => {
    setSupport(detectTilt());
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /** 골라인 도달 → 오프사이드로 무효. */
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
        setPhase('stolen');
      }, 1600);
    }, 900);
  }, [timers]);

  const steal = useCallback(() => {
    setPhase('stolen');
    setAttempts((n) => n + 1);
    setMessage(STEALS[Math.floor(Math.random() * STEALS.length)]);
    buzz([50, 40, 50]);
  }, []);

  const reset = useCallback(() => {
    ballRef.current = { x: 6, y: 50 };
    velRef.current = { x: 0, y: 0 };
    setBall({ x: 6, y: 50 });

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
  }, []);

  /** 시작. iOS 는 이 탭 안에서 권한을 요청해야 한다. */
  async function start() {
    if (support === 'needs-permission') {
      const result = await requestTilt();
      setSupport(result);
      modeRef.current = result === 'ready' ? 'tilt' : 'touch';
      if (result === 'denied') setMessage('센서 권한이 없어 손가락 모드로 진행합니다');
    } else {
      modeRef.current = support === 'ready' ? 'tilt' : 'touch';
      if (support !== 'ready') setMessage(FALLBACK_REASON[support] ?? null);
    }
    reset();
  }

  /** 센서 구독. */
  useEffect(() => {
    if (phase === 'intro' || modeRef.current !== 'tilt') return;
    return onTilt2D((x, y) => {
      tiltRef.current = { x, y };
    });
  }, [phase]);

  /** 게임 루프: 공 물리 + 수비수 이동 + 판정. */
  useEffect(() => {
    if (phase !== 'running') return;
    let last = performance.now();

    function tick(now: number) {
      const dt = Math.min(48, now - last);
      last = now;
      const s = dt / 1000;

      // 공: 기울기로 가속하고 마찰로 감쇠한다.
      const v = velRef.current;
      v.x = (v.x + tiltRef.current.x * TILT_ACCEL * s) * FRICTION;
      v.y = (v.y + tiltRef.current.y * TILT_ACCEL * s) * FRICTION;

      const b = ballRef.current;
      b.x += v.x * s;
      b.y += v.y * s;

      // 벽에서 튕긴다.
      if (b.x < 3) { b.x = 3; v.x = Math.abs(v.x) * 0.25; }
      else if (b.x > 97) { b.x = 97; v.x = -Math.abs(v.x) * 0.25; }
      if (b.y < 6) { b.y = 6; v.y = Math.abs(v.y) * 0.25; }
      else if (b.y > 94) { b.y = 94; v.y = -Math.abs(v.y) * 0.25; }

      setBall({ x: b.x, y: b.y });

      const moved = foesRef.current.map((f) => {
        let { x, y, vx, vy } = f;
        // id 0 은 추격자. 버티기 전략을 막는다.
        if (f.id === 0) {
          const ang = Math.atan2(b.y - y, b.x - x);
          vx = vx * 0.9 + Math.cos(ang) * 44 * 0.1;
          vy = vy * 0.9 + Math.sin(ang) * 44 * 0.1;
        }
        x += vx * s;
        y += vy * s;
        if (x < 10) { x = 10; vx = Math.abs(vx); }
        else if (x > 96) { x = 96; vx = -Math.abs(vx); }
        if (y < 8) { y = 8; vy = Math.abs(vy); }
        else if (y > 92) { y = 92; vy = -Math.abs(vy); }
        return { ...f, x, y, vx, vy };
      });
      foesRef.current = moved;
      setFoes(moved);

      for (const f of moved) {
        if (Math.hypot(f.x - b.x, f.y - b.y) <= HIT_RADIUS) {
          steal();
          return;
        }
      }

      if (b.x > bestRef.current) {
        bestRef.current = b.x;
        setBest(b.x);
      }

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

  /** 손가락 폴백: 문지른 방향을 기울기처럼 쓴다(순간이동 방지). */
  const drag = useCallback((clientX: number, clientY: number) => {
    if (phaseRef.current !== 'running' || modeRef.current !== 'touch') return;
    const el = fieldRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * 100;
    const py = ((clientY - rect.top) / rect.height) * 100;
    const b = ballRef.current;
    tiltRef.current = {
      x: Math.max(-1, Math.min(1, (px - b.x) / 22)),
      y: Math.max(-1, Math.min(1, (py - b.y) / 22)),
    };
  }, []);

  /* intro 단계에서는 아직 모드가 확정되지 않았으므로 support 로 판단한다.
     그렇지 않으면 센서를 쓸 기기에도 "문지르세요" 가 떠서 잘못 안내된다. */
  const usingTilt =
    phase === 'intro'
      ? support === 'ready' || support === 'needs-permission'
      : modeRef.current === 'tilt';

  return (
    <RejectShell
      title="호날두를 뚫어라"
      subtitle="공을 굴려 오른쪽 골라인까지 가면 거절이 접수됩니다."
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
            {assetOk ? (
              // eslint-disable-next-line @next/next/no-img-element -- onError 폴백이 필요하다
              <img src="/assets/ronaldo-warn.gif" alt="" onError={() => setAssetOk(false)} />
            ) : (
              '🧍‍♂️'
            )}
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
        <p className="lever-hint">
          {usingTilt
            ? '📱 폰을 기울여 공을 굴리세요. 관성이 있어 미리 꺾어야 합니다'
            : '👆 가고 싶은 방향을 문지르세요'}
        </p>
      )}

      {(phase === 'intro' || phase === 'stolen') && (
        <button type="button" className="btn btn-primary btn-block" onClick={start}>
          {phase === 'stolen'
            ? '다시 드리블'
            : support === 'needs-permission'
              ? '센서 켜고 시작'
              : '드리블 시작'}
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

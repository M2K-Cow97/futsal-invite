'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { buzz } from '@/lib/tilt';
import { RejectShell } from './RejectShell';
import { StageFooter } from './StageFooter';
import type { StageProps } from './types';
import { useTimers } from './useTimers';

/** 버텨야 하는 시간(ms). 10초. */
const SURVIVE_MS = 10_000;
/** 한 번만 실패해도 다음 관문으로 넘어갈 수 있다. */
const GIVE_UP_AFTER = 1;
/** 플레이어 반폭(%). 판정에 쓴다. */
const PLAYER_HALF = 7;
/** 낙하물 반폭(%). */
const DROP_HALF = 8;
/** 초당 생성 수. 시간이 지나면 늘어난다. */
const SPAWN_BASE = 7;
const SPAWN_RAMP = 9;

type Drop = { id: number; x: number; y: number; vy: number; spin: number };
type Phase = 'ready' | 'running' | 'hit' | 'almost' | 'betrayed';

/**
 * ① 호우(SIUUU) 피하기 — 하늘에서 호날두가 쏟아진다. 10초를 버텨야 거절이 접수된다.
 *
 * 난이도를 일부러 높게 잡았다: 낙하 속도와 생성 빈도가 시간에 비례해 올라가고,
 * 후반에는 화면이 거의 메워진다. 보통 3~6초에서 맞는다.
 *
 * 물론 버텨도 접수되지 않는다 — 10초를 채우면 "계측 오류" 로 다시 시작한다.
 * 플레이어는 손가락(터치)이나 마우스로 좌우 이동한다.
 */
export function DodgeStage({ onGiveUp, onClose }: StageProps) {
  const timers = useTimers();
  const fieldRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>('ready');
  const [playerX, setPlayerX] = useState(50);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [assetOk, setAssetOk] = useState(true);

  const playerRef = useRef(50);
  const dropsRef = useRef<Drop[]>([]);
  const elapsedRef = useRef(0);
  const spawnAccRef = useRef(0);
  const idRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('ready');

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /** 10초를 채웠다 → 계측 오류로 무효. 이 게임의 배신이다. */
  const betray = useCallback(() => {
    setPhase('almost');
    setMessage('10초 생존! 거절 접수 중…');
    buzz(30);

    timers.set(() => {
      setPhase('betrayed');
      setMessage('계측 오류입니다. 타이머가 9.98초에서 멈췄습니다');
      buzz([40, 60, 40]);
      setAttempts((n) => n + 1);

      timers.set(() => {
        setPhase('ready');
      }, 1500);
    }, 900);
  }, [timers]);

  /** 맞았다. 처음부터 다시. */
  const hit = useCallback(() => {
    setPhase('hit');
    setAttempts((n) => n + 1);
    setMessage(`${(elapsedRef.current / 1000).toFixed(1)}초에서 맞았습니다`);
    buzz([50, 40, 50]);
    dropsRef.current = [];
    setDrops([]);
    // 자동 재시작하지 않는다. 화면이 멈춘 것처럼 보이면 사용자가 당황한다.
  }, []);

  function start() {
    dropsRef.current = [];
    elapsedRef.current = 0;
    spawnAccRef.current = 0;
    setDrops([]);
    setElapsed(0);
    setPhase('running');
  }

  /** 게임 루프. */
  useEffect(() => {
    if (phase !== 'running') return;
    let last = performance.now();

    function tick(now: number) {
      const dt = Math.min(48, now - last);
      last = now;

      elapsedRef.current += dt;
      setElapsed(elapsedRef.current);

      const progress = Math.min(1, elapsedRef.current / SURVIVE_MS);

      // 시간이 갈수록 더 많이, 더 빨리 떨어진다.
      const rate = SPAWN_BASE + SPAWN_RAMP * progress;
      spawnAccRef.current += (dt / 1000) * rate;
      while (spawnAccRef.current >= 1) {
        spawnAccRef.current -= 1;
        idRef.current += 1;
        dropsRef.current.push({
          id: idRef.current,
          x: 6 + Math.random() * 88,
          y: -12,
          vy: 105 + Math.random() * 55 + progress * 130,
          spin: Math.random() * 360,
        });
      }

      // 낙하 + 충돌 판정
      const survivors: Drop[] = [];
      for (const d of dropsRef.current) {
        const y = d.y + d.vy * (dt / 1000);
        // 플레이어는 바닥에 있다 (y 82~100 구간).
        if (y >= 78 && y <= 104) {
          if (Math.abs(d.x - playerRef.current) <= PLAYER_HALF + DROP_HALF) {
            dropsRef.current = survivors;
            setDrops(survivors);
            hit();
            return;
          }
        }
        if (y < 118) survivors.push({ ...d, y });
      }
      dropsRef.current = survivors;
      setDrops(survivors);

      if (elapsedRef.current >= SURVIVE_MS) {
        betray();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, hit, betray]);

  /** 손가락·마우스로 좌우 이동. */
  const move = useCallback((clientX: number) => {
    const el = fieldRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    playerRef.current = Math.max(PLAYER_HALF, Math.min(100 - PLAYER_HALF, pct));
    setPlayerX(playerRef.current);
  }, []);

  const remain = Math.max(0, (SURVIVE_MS - elapsed) / 1000);
  /** 피격 직후에는 그때까지 버틴 시간을 남겨둔다. */
  const showRemain = phase !== 'hit';

  return (
    <RejectShell
      title="호우 피하기"
      subtitle="하늘에서 호날두가 쏟아집니다. 10초만 버티면 거절이 접수됩니다."
      arcadeSubtitle="하늘에서 호날두가 쏟아집니다. 10초만 버텨보세요."
    >
      <div
        className="dodge-field"
        ref={fieldRef}
        onPointerMove={(e) => move(e.clientX)}
        onPointerDown={(e) => move(e.clientX)}
      >
        {drops.map((d) => (
          <span
            key={d.id}
            className="dodge-drop"
            style={{
              left: `${d.x}%`,
              top: `${d.y}%`,
              transform: `translate(-50%, -50%) rotate(${d.spin}deg)`,
            }}
            aria-hidden="true"
          >
            {assetOk ? (
              // eslint-disable-next-line @next/next/no-img-element -- onError 폴백이 필요하다
              <img
                src="/assets/ronaldo-stern.gif"
                alt=""
                onError={() => setAssetOk(false)}
              />
            ) : (
              '🐐'
            )}
          </span>
        ))}

        <span className="dodge-player" style={{ left: `${playerX}%` }} aria-hidden="true">
          🧍
        </span>
      </div>

      <div className="dodge-bar">
        <div
          className="dodge-bar-fill"
          style={{ width: `${Math.min(100, (elapsed / SURVIVE_MS) * 100)}%` }}
        />
      </div>
      <p className="aim-readout">
        {showRemain ? `남은 시간 ${remain.toFixed(1)}초` : '피하기 실패'} · 피격 {attempts}회
      </p>

      {message ? (
        <p className={`lever-msg${phase === 'betrayed' || phase === 'hit' ? ' bad' : ''}`}>
          {message}
        </p>
      ) : (
        <p className="lever-hint">화면을 문질러 좌우로 피하세요</p>
      )}

      {(phase === 'ready' || phase === 'hit') && (
        <button type="button" className="btn btn-primary btn-block" onClick={start}>
          {phase === 'hit' ? '다시 피하기' : '시작'}
        </button>
      )}

      <StageFooter onClose={onClose} onGiveUp={onGiveUp} canGiveUp={attempts >= GIVE_UP_AFTER} />
    </RejectShell>
  );
}

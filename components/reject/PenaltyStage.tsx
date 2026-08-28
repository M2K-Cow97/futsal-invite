'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { buzz } from '@/lib/tilt';
import { RejectShell } from './RejectShell';
import { StageFooter } from './StageFooter';
import type { StageProps } from './types';
import { useTimers } from './useTimers';

/** 한 번만 실패해도 다음 관문으로 넘어갈 수 있다. */
const GIVE_UP_AFTER = 1;
/** 한 번 당길 때 오르는 양(%). */
const PULL_GAIN = 7.5;
/** 호날두가 되감는 속도(%/초). 손을 놓으면 순식간에 빼앗긴다. */
const DRAG_BASE = 26;
/**
 * 게이지가 높아질수록 호날두가 더 세게 버틴다.
 * 90% 부근에서 초당 되감기가 당기는 속도를 앞질러 **절대 100% 에 닿지 않는다**.
 * 그래도 98% 까지는 올라가므로 "조금만 더" 가 계속 남는다.
 */
const DRAG_RAMP = 78;
/** 이 값을 넘기면 호날두가 개입한다(=사실상 상한). */
const CEILING = 98;

type Phase = 'ready' | 'fighting' | 'taunt' | 'lost';

/** 게이지 구간별 호날두 대사. 올라갈수록 도발이 세진다. */
const TAUNTS: { at: number; text: string }[] = [
  { at: 30, text: '호날두: 이건 내 거야' },
  { at: 55, text: '호날두: 진심이야?' },
  { at: 75, text: '호날두: 놓지 그래' },
  { at: 88, text: '호날두: 재밌네' },
  { at: 95, text: '호날두: …이제 그만' },
];

/** 뺏기 실패 사유. */
const LOSSES = [
  '호날두가 공을 끌어안았습니다',
  '손이 미끄러졌습니다',
  '호날두가 몸으로 막았습니다',
  '주장 완장을 보여줬습니다',
];

/**
 * 페널티킥 공 뺏기 — 호날두가 이기적으로 키커를 독차지한다.
 *
 * 연타로 게이지를 올려 공을 뺏어야 하는데, **100% 에 닿을 수 없다.**
 * 게이지가 오를수록 호날두가 되감는 속도가 기하급수로 커져서,
 * 90% 부근에서 인간의 연타 속도를 넘어선다. 배신 연출조차 필요 없다 —
 * 그냥 안 된다. 다만 98% 까지는 보이므로 계속 매달린다.
 */
export function PenaltyStage({ onGiveUp, onClose }: StageProps) {
  const timers = useTimers();

  const [phase, setPhase] = useState<Phase>('ready');
  const [gauge, setGauge] = useState(0);
  const [peak, setPeak] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [taunt, setTaunt] = useState<string | null>(null);
  const [assetOk, setAssetOk] = useState(true);

  const gaugeRef = useRef(0);
  const peakRef = useRef(0);
  const tauntIdxRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('ready');

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /** 손을 놓으면(= 연타를 멈추면) 호날두가 되감는다. */
  useEffect(() => {
    if (phase !== 'fighting') return;
    let last = performance.now();

    function tick(now: number) {
      const dt = Math.min(48, now - last);
      last = now;

      // 게이지가 높을수록 저항이 급격히 커진다.
      const t = gaugeRef.current / 100;
      const drag = DRAG_BASE + DRAG_RAMP * t * t;
      gaugeRef.current = Math.max(0, gaugeRef.current - drag * (dt / 1000));
      setGauge(gaugeRef.current);

      // 완전히 빼앗기면 실패.
      if (gaugeRef.current <= 0 && peakRef.current > 12) {
        setPhase('lost');
        setAttempts((n) => n + 1);
        setMessage(LOSSES[Math.floor(Math.random() * LOSSES.length)]);
        buzz([50, 40, 50]);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  /** 당기기(연타). */
  const pull = useCallback(() => {
    if (phaseRef.current !== 'fighting') return;

    // 상한을 넘기려 하면 호날두가 개입한다. 100% 는 존재하지 않는다.
    const next = Math.min(CEILING, gaugeRef.current + PULL_GAIN);
    gaugeRef.current = next;
    setGauge(next);

    if (next > peakRef.current) {
      peakRef.current = next;
      setPeak(next);
    }

    // 구간을 넘길 때마다 도발 한 마디.
    const nextTaunt = TAUNTS[tauntIdxRef.current];
    if (nextTaunt && next >= nextTaunt.at) {
      tauntIdxRef.current += 1;
      setTaunt(nextTaunt.text);
      timers.set(() => setTaunt(null), 1100);
    }

    buzz(8);
  }, [timers]);

  function start() {
    gaugeRef.current = 0;
    peakRef.current = 0;
    tauntIdxRef.current = 0;
    setGauge(0);
    setPeak(0);
    setMessage(null);
    setTaunt(null);
    setPhase('fighting');
  }

  const fighting = phase === 'fighting';
  /** 호날두가 공을 얼마나 쥐고 있는지 — 게이지의 반대편. */
  const hisGrip = 100 - gauge;

  return (
    <RejectShell
      title="페널티킥 공 뺏기"
      subtitle="호날두가 또 키커를 하겠다고 합니다. 공을 뺏어오면 거절이 접수됩니다."
    >
      <div className="tug-scene">
        <span className="tug-me" aria-hidden="true">
          🧍
        </span>
        <span
          className="tug-ball"
          /* 내 힘(gauge)이 커질수록 공이 내 쪽(왼쪽)으로 온다. */
          style={{ left: `${80 - gauge * 0.72}%` }}
          aria-hidden="true"
        >
          ⚽
        </span>
        <span className="tug-him" aria-hidden="true">
          {assetOk ? (
            // eslint-disable-next-line @next/next/no-img-element -- onError 폴백이 필요하다
            <img src="/assets/ronaldo-stern.gif" alt="" onError={() => setAssetOk(false)} />
          ) : (
            '🧍‍♂️'
          )}
        </span>
        {taunt && <span className="tug-taunt">{taunt}</span>}
      </div>

      <div className="tug-bar">
        <div className="tug-bar-mine" style={{ width: `${gauge}%` }} />
        <div className="tug-bar-peak" style={{ left: `${peak}%` }} />
      </div>
      <p className="aim-readout">
        내 힘 {gauge.toFixed(0)}% · 호날두 {hisGrip.toFixed(0)}% · 최고 {peak.toFixed(0)}%
      </p>

      {message ? (
        <p className="lever-msg bad">{message}</p>
      ) : (
        <p className="lever-hint">
          {fighting ? '연타하세요! 놓으면 바로 빼앗깁니다' : '100%를 채우면 내가 찹니다'}
        </p>
      )}

      {fighting ? (
        <button type="button" className="btn btn-primary btn-block" onClick={pull}>
          당기기
        </button>
      ) : (
        <button type="button" className="btn btn-primary btn-block" onClick={start}>
          {phase === 'lost' ? '다시 뺏기' : '공 잡기'}
        </button>
      )}

      <StageFooter onClose={onClose} onGiveUp={onGiveUp} canGiveUp={attempts >= GIVE_UP_AFTER} />
    </RejectShell>
  );
}

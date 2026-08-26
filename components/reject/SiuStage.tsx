'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { detectMic, startMic, type MicMeter, type MicSupport } from '@/lib/mic';
import { buzz } from '@/lib/tilt';
import { RejectShell } from './RejectShell';
import type { StageProps } from './types';
import { useTimers } from './useTimers';

/** 호날두 기준선(%). 절대 닿을 수 없는 높이. */
const RONALDO_LINE = 92;
/** 이 시간 안에 기준선을 넘겨야 한다. */
const WINDOW_MS = 6000;
/** 연타 폴백에서 한 번에 오르는 양(%). */
const TAP_GAIN = 5.5;
/**
 * 게이지 상한(%). 기준선(92%)보다 낮게 잡아 **어떤 입력으로도 닿지 않게** 한다.
 * 마이크든 연타든 여기서 막히지만, 91% 까지 보이므로 "조금만 더" 가 남는다.
 */
const CEILING = 91;

type Phase = 'intro' | 'listening' | 'judging' | 'failed';

/** 판정 문구. 최고치에 따라 다르게 비웃는다. */
function verdictFor(peak: number): string {
  if (peak < 25) return '들리지 않습니다. 목소리를 내셨습니까?';
  if (peak < 50) return '그건 SIU 가 아닙니다. 그냥 말입니다';
  if (peak < 70) return '음량 미달입니다. 호날두의 38% 수준입니다';
  return '거의 닿았습니다. 하지만 호날두는 더 큽니다';
}

/**
 * 거절 승인 심사: SIUUU 지르기.
 *
 * 실제 마이크로 음량을 잰다. 호날두 기준선이 92% 에 그어져 있고,
 * 사람 목소리로는 사실상 닿지 않는다. 닿아도 "발음이 SIUUU 가 아니다" 로 막힌다.
 *
 * 마이크를 못 쓰는 환경(http·인앱 브라우저·권한 거부)에서는 연타 폴백으로
 * 바꾸되, 그때도 기준선에 닿지 않는다.
 *
 * 오디오는 측정만 하고 어디에도 보내지 않는다.
 */
export function SiuStage({ onGiveUp, onClose }: StageProps) {
  const timers = useTimers();

  const [support, setSupport] = useState<MicSupport>('unsupported');
  const [phase, setPhase] = useState<Phase>('intro');
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [remain, setRemain] = useState(WINDOW_MS);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [assetOk, setAssetOk] = useState(true);

  const meterRef = useRef<MicMeter | null>(null);
  const levelRef = useRef(0);
  const peakRef = useRef(0);
  const startedRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  /** 'mic' 또는 'tap'. 폴백이면 연타로 게이지를 올린다. */
  const modeRef = useRef<'mic' | 'tap'>('mic');
  /* tap() 은 렌더 시점의 phase 를 클로저로 잡는다. 최신값이 필요해 ref 로 미러링한다. */
  const phaseRef = useRef<Phase>('intro');

  useEffect(() => {
    setSupport(detectMic());
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /** 마이크 정리. 화면을 떠날 때 반드시 끊는다. */
  useEffect(() => {
    return () => {
      meterRef.current?.stop();
      meterRef.current = null;
    };
  }, []);

  const finish = useCallback(() => {
    meterRef.current?.stop();
    meterRef.current = null;

    setPhase('judging');
    setMessage('음량 분석 중…');
    buzz(20);

    timers.set(() => {
      setPhase('failed');
      setAttempts((n) => n + 1);
      setMessage(verdictFor(peakRef.current));
      buzz([40, 60, 40]);
    }, 1100);
  }, [timers]);

  /** 측정 루프. */
  useEffect(() => {
    if (phase !== 'listening') return;
    startedRef.current = performance.now();

    function tick(now: number) {
      const elapsed = now - startedRef.current;
      setRemain(Math.max(0, WINDOW_MS - elapsed));

      if (modeRef.current === 'mic' && meterRef.current) {
        levelRef.current = meterRef.current.level() * 100;
      } else {
        // 연타 폴백: 누르지 않으면 빠르게 떨어진다.
        levelRef.current = Math.max(0, levelRef.current - 62 * (1 / 60));
      }

      const lv = Math.min(CEILING, levelRef.current);
      setLevel(lv);
      if (lv > peakRef.current) {
        peakRef.current = lv;
        setPeak(lv);
      }

      if (elapsed >= WINDOW_MS) {
        finish();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, finish]);

  async function start() {
    levelRef.current = 0;
    peakRef.current = 0;
    setLevel(0);
    setPeak(0);
    setRemain(WINDOW_MS);
    setMessage(null);

    if (support === 'ready') {
      const meter = await startMic();
      if (meter) {
        meterRef.current = meter;
        modeRef.current = 'mic';
        setPhase('listening');
        return;
      }
      // 권한 거부 등 — 폴백으로 넘어간다.
      setSupport('denied');
      setMessage('마이크를 쓸 수 없어 연타 모드로 진행합니다');
    } else {
      setMessage(
        support === 'inapp-browser'
          ? '카톡 브라우저는 마이크를 막아요. 연타 모드로 진행합니다'
          : support === 'insecure'
            ? '보안 연결(https)이 아니라 마이크를 쓸 수 없어요. 연타 모드로 진행합니다'
            : '이 브라우저는 마이크를 지원하지 않아요. 연타 모드로 진행합니다',
      );
    }

    modeRef.current = 'tap';
    setPhase('listening');
  }

  /** 연타 폴백 입력. */
  function tap() {
    if (phaseRef.current !== 'listening' || modeRef.current !== 'tap') return;
    levelRef.current = Math.min(CEILING, levelRef.current + TAP_GAIN);
  }

  const listening = phase === 'listening';
  const usingMic = modeRef.current === 'mic';

  return (
    <RejectShell
      title="SIUUU 심사"
      subtitle="호날두만큼 크게 SIUUU 를 외치면 거절이 승인됩니다."
    >
      <div className="siu-meter" onPointerDown={tap}>
        {/* 호날두 기준선 — 닿을 수 없다 */}
        <div className="siu-line" style={{ bottom: `${RONALDO_LINE}%` }}>
          <span className="siu-line-label">호날두</span>
        </div>
        {/* 최고 기록 — "여기까지 갔었는데" */}
        {peak > 0 && <div className="siu-peak" style={{ bottom: `${peak}%` }} />}
        <div className="siu-fill" style={{ height: `${level}%` }} />
        <div className="siu-face">
          {assetOk ? (
            // eslint-disable-next-line @next/next/no-img-element -- onError 폴백이 필요하다
            <img src="/assets/siu.gif" alt="" onError={() => setAssetOk(false)} />
          ) : (
            '🗣️'
          )}
        </div>
      </div>

      <p className="aim-readout">
        {listening ? `${(remain / 1000).toFixed(1)}초 남음 · ` : ''}
        최고 {peak.toFixed(0)}% / {RONALDO_LINE}% · 실패 {attempts}회
      </p>

      {message ? (
        <p className={`lever-msg${phase === 'failed' ? ' bad' : ''}`}>{message}</p>
      ) : (
        <p className="lever-hint">
          {listening
            ? usingMic
              ? '🗣️ 지금! 크게 외치세요'
              : '👆 게이지를 연타로 올리세요'
            : '🎤 마이크로 음량만 측정합니다. 녹음하거나 저장하지 않습니다'}
        </p>
      )}

      {(phase === 'intro' || phase === 'failed') && (
        <button type="button" className="btn btn-primary btn-block" onClick={start}>
          {phase === 'failed' ? '다시 외치기' : support === 'ready' ? '마이크 켜고 시작' : '시작'}
        </button>
      )}

      <div className="reject-footer modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          그냥 할래
        </button>
        {/*
          이 단계는 마이크라는 외부 조건에 의존한다 — 권한이 없거나 인앱 브라우저면
          측정 자체가 무의미하다. 그래서 다른 단계와 달리 실패 횟수를 요구하지 않고
          **항상** 넘어갈 수 있게 둔다. 갇히는 건 재미가 아니라 짜증이다.
        */}
        <button type="button" className="btn btn-accent" onClick={onGiveUp}>
          다른 방법으로 거절
        </button>
      </div>
    </RejectShell>
  );
}

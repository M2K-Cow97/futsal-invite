'use client';

import { useEffect, useRef, useState } from 'react';
import { buzz } from '@/lib/tilt';
import { playSound } from '@/lib/sound';
import { MediaBox } from '../MediaBox';
import { RejectShell } from './RejectShell';
import type { StageProps } from './types';

/**
 * 훈시 대사. 한 줄이 곧 한 호흡이다.
 *
 * `big` 은 크게 박히는 단어 — "FUTSAL" 처럼 그 자체가 화면을 채워야 하는 줄이다.
 * 나머지는 낮은 목소리로 흐른다.
 */
const LINES: { text: string; big?: boolean; voice?: string }[] = [
  { text: '단어 알지?', voice: '/assets/vocab.mp3' },
  // 'FUTSAL' 은 화면 상단에 미리 박혀 있다(.lecture-word). 줄로 또 내보내면 중복이다.
  { text: '오늘 풋살장 나가서 풋살해.' },
  { text: '나는 오늘 그거, 볼 거야.', voice: '/assets/iwilllsee.mp3' },
];

/** 줄이 바뀌기 전 최소 여백. 너무 빨리 넘기면 아련함이 죽는다. */
const BEAT_MS = 900;

/*
 * 음성은 줄에 붙어 있다(위 LINES 의 `voice`). 해당 줄이 나타날 때 재생된다.
 * **없어도 동작한다** — `playSound` 가 실패를 조용히 무시한다.
 *
 * 자동재생 정책상 사용자 제스처로 진입한 이 화면에서만 소리가 난다.
 * 새로고침으로 바로 열면 첫 줄이 무음일 수 있다.
 */

/**
 * 마지막 관문: 훈시.
 *
 * 여기까지 온 사람은 미니게임 6종을 다 통과(=실패)한 사람이다. 더 게임으로
 * 막지 않고 그냥 앉혀놓고 말한다.
 *
 * 연출 의도 — **아련하게.** 한 문장씩 천천히 올라오고, 지나간 줄은 흐려지며
 * 위로 밀려난다. 다음 버튼은 한 박자(BEAT_MS) 뒤에야 눌린다. 마지막에는
 * "…네" 하나만 남는다.
 *
 * 다른 스테이지와 달리 onGiveUp 이 없다. 이 다음은 없다.
 */
export function LectureStage({ onClose, onAccept }: StageProps) {
  const [step, setStep] = useState(0);
  /** 한 박자 지나기 전에는 넘기지 못한다 — 뜸이 이 연출의 전부다. */
  const [ready, setReady] = useState(false);
  const timerRef = useRef<number | null>(null);
  /* StrictMode 는 effect 를 두 번 실행한다. 타이머가 리셋되어도 결과는 같지만,
     정리(clearTimeout)를 확실히 해 중복 타이머가 남지 않게 한다. */

  const last = step >= LINES.length - 1;

  /* 줄이 바뀔 때 그 줄의 음성을 재생한다. StrictMode 의 이중 실행이나
     같은 줄 재렌더로 소리가 겹치지 않게 재생한 줄을 기록해 둔다. */
  const voicedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    const voice = LINES[step]?.voice;
    if (!voice || voicedRef.current.has(step)) return;
    voicedRef.current.add(step);
    playSound(voice);
  }, [step]);

  useEffect(() => {
    setReady(false);
    timerRef.current = window.setTimeout(() => setReady(true), BEAT_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [step]);

  function next() {
    if (!ready) return;
    if (last) {
      // "…네" 는 초대 화면으로 되돌리지 않고 곧바로 수락으로 넘긴다.
      (onAccept ?? onClose)();
      return;
    }
    buzz(14);
    setStep((n) => n + 1);
  }

  return (
    <RejectShell title="훈시" subtitle="거절 심사가 종료되었습니다. 잠시 앉으세요.">
      <MediaBox src="/assets/lecture.png" alt="훈시" fallback="🧑‍🏫" />

      {/*
        단어를 미리 박아둔다 — 무엇에 관한 훈시인지 한눈에 보이게(릴스용).
        스크린에 투사된 것처럼 어두운 판 위에 얹고 주사선·깜빡임을 준다.
      */}
      <div className="lecture-screen" aria-hidden="true">
        <p className="lecture-word">FUTSAL</p>
      </div>

      <div className="lecture-board">
        {LINES.slice(0, step + 1).map((line, i) => {
          // 현재 줄에서 멀어질수록 더 흐려진다 — 기억처럼.
          const back = step - i;
          return (
            <p
              key={line.text}
              className={[
                'lecture-line',
                line.big ? 'big' : '',
                i === step ? 'current' : `past-${Math.min(back, 3)}`,
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={i === step ? 'step' : undefined}
            >
              {line.text}
            </p>
          );
        })}
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={!ready}
        onClick={next}
      >
        {last ? '…네' : ready ? '다음' : '…'}
      </button>

      {!last && (
        <p className="lecture-count">
          {step + 1} / {LINES.length}
        </p>
      )}
    </RejectShell>
  );
}

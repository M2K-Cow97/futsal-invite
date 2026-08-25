'use client';

import { useState } from 'react';
import { buzz } from '@/lib/tilt';
import { MediaBox } from '../MediaBox';
import { RejectShell } from './RejectShell';
import type { StageProps } from './types';

/**
 * 한 문장씩 넘어가는 훈시. 밈의 호흡을 살리려면 한 번에 다 보여주면 안 된다 —
 * 뜸을 들이는 게 핵심이다.
 */
const LINES = ['단어 알지?', '풋살.', '오늘 풋살장 나가서 풋살해.', '나는 오늘 그거, 볼 거야.'];

/**
 * 마지막 관문: 훈시.
 *
 * 여기까지 온 사람은 미니게임 5종을 다 통과(=실패)한 사람이다. 더 이상
 * 게임으로 막지 않고, 그냥 앉혀놓고 말한다. 자막이 한 문장씩 넘어가고
 * 마지막에는 "…네" 하나만 남는다 — 거절하려던 사람이 수긍하며 끝난다.
 *
 * 다른 스테이지와 달리 onGiveUp 이 없다. 이 다음은 없다.
 */
export function LectureStage({ onClose }: StageProps) {
  const [step, setStep] = useState(0);

  const last = step >= LINES.length - 1;

  function next() {
    if (last) {
      onClose();
      return;
    }
    buzz(18);
    setStep((n) => n + 1);
  }

  return (
    <RejectShell title="FUTSAL" subtitle="거절 심사가 종료되었습니다. 잠시 앉으세요.">
      {/* 이 밈의 핵심은 표정이다. 파일이 없으면 이모지로 폴백된다. */}
      <MediaBox src="/assets/lecture.png" alt="훈시" fallback="🧑‍🏫" />

      <div className="lecture-board">
        {LINES.slice(0, step + 1).map((line, i) => (
          <p
            key={line}
            className={`lecture-line${i === step ? ' current' : ''}`}
            // 이미 지나간 줄은 흐리게 남겨 "쌓이는" 느낌을 준다.
            aria-current={i === step ? 'step' : undefined}
          >
            {line}
          </p>
        ))}
      </div>

      <button type="button" className="btn btn-primary btn-block" onClick={next}>
        {last ? '…네' : '다음'}
      </button>

      {!last && (
        <p className="lecture-count">
          {step + 1} / {LINES.length}
        </p>
      )}
    </RejectShell>
  );
}

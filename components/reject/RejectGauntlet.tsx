'use client';

import { useState } from 'react';
import { FreekickStage } from './FreekickStage';
import { KeypadStage } from './KeypadStage';
import { LectureStage } from './LectureStage';
import { DodgeStage } from './DodgeStage';
import { LeverStage } from './LeverStage';
import { PenaltyStage } from './PenaltyStage';
import { ReasonStage } from './ReasonStage';
import { SiuStage } from './SiuStage';
import type { StageId } from './types';

/** 거절 시도가 통과해야 하는 관문 순서. 마지막(lecture)은 탈출구가 없다. */
const ORDER: StageId[] = [
  'reason',
  // 호우 피하기 — 하늘에서 호날두가 쏟아진다. 아주 어렵다.
  'dodge',
  'lever',
  // SIUUU 지르기 — 실제 마이크로 음량을 잰다. 기준선에 닿을 수 없다.
  'siu',
  // 페널티킥 공 뺏기 — 100% 에 닿을 수 없다.
  'penalty',
  'freekick',
  'keypad',
  // 마지막. 게임을 다 통과(=실패)한 사람에게 남는 건 훈시뿐이다.
  'lecture',
];

/**
 * 거절 관문 컨트롤러.
 * 각 스테이지에서 "다른 방법으로 거절" 을 누르면 다음 관문으로 승급하고,
 * 마지막 약관 단계에서는 동의 버튼이 아예 없어 결국 거절이 성립하지 않는다 (spec SC-004).
 */
export function RejectGauntlet({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);

  const next = () => setIndex((i) => Math.min(i + 1, ORDER.length - 1));
  const props = { onGiveUp: next, onClose };

  switch (ORDER[index]) {
    case 'reason':
      return <ReasonStage {...props} />;
    case 'dodge':
      return <DodgeStage {...props} />;
    case 'lever':
      return <LeverStage {...props} />;
    case 'siu':
      return <SiuStage {...props} />;
    case 'penalty':
      return <PenaltyStage {...props} />;
    case 'freekick':
      return <FreekickStage {...props} />;
    case 'keypad':
      return <KeypadStage {...props} />;
    case 'lecture':
      return <LectureStage {...props} />;
  }
}

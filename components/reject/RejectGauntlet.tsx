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
/*
 * 릴스용으로 여정을 줄였다. "싫어." 3회 → 곧바로 훈시.
 *
 * 호날두 게임 7종(사유 심사·호우 피하기·드리블·SIUUU·페널티·프리킥·라커룸)은
 * 별도 프로젝트로 분리 예정이라 여기서는 순서에서 빼두었다.
 * 컴포넌트는 남아 있으므로 배열에 다시 넣으면 그대로 살아난다.
 */
const ORDER: StageId[] = ['lecture'];

/**
 * 거절 관문 컨트롤러.
 * 각 스테이지에서 "다른 방법으로 거절" 을 누르면 다음 관문으로 승급하고,
 * 마지막 약관 단계에서는 동의 버튼이 아예 없어 결국 거절이 성립하지 않는다 (spec SC-004).
 */
export function RejectGauntlet({
  onClose,
  onAccept,
}: {
  onClose: () => void;
  onAccept?: () => void;
}) {
  const [index, setIndex] = useState(0);

  const next = () => setIndex((i) => Math.min(i + 1, ORDER.length - 1));
  const props = { onGiveUp: next, onClose, onAccept };

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

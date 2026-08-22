'use client';

import { useState } from 'react';
import { FreekickStage } from './FreekickStage';
import { KeypadStage } from './KeypadStage';
import { LeverStage } from './LeverStage';
import { TermsStage } from './TermsStage';
import type { StageId } from './types';

/** 거절 시도가 통과해야 하는 관문 순서. 마지막(terms)은 탈출구가 없다. */
const ORDER: StageId[] = ['lever', 'freekick', 'keypad', 'terms'];

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
    case 'lever':
      return <LeverStage {...props} />;
    case 'freekick':
      return <FreekickStage {...props} />;
    case 'keypad':
      return <KeypadStage {...props} />;
    case 'terms':
      return <TermsStage {...props} />;
  }
}

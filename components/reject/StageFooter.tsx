'use client';

import { useContext } from 'react';
import { ArcadeContext } from './ArcadeContext';

/**
 * 스테이지 하단 버튼.
 *
 * 같은 게임이 두 맥락에서 쓰이므로 문구가 달라야 한다:
 * - **거절 관문**(`/i/{slug}`) — "그냥 할래"(포기하고 초대 화면으로) ·
 *   "다른 방법으로 거절"(다음 관문으로)
 * - **오락기**(`/games`) — 관문도 거절도 없다. "게임 닫기" 하나뿐이다.
 */
export function StageFooter({
  onClose,
  onGiveUp,
  /** 다음 관문 버튼을 보여줄 조건(보통 실패 횟수). 오락기에서는 무시된다. */
  canGiveUp = false,
}: {
  onClose: () => void;
  onGiveUp: () => void;
  canGiveUp?: boolean;
}) {
  const arcade = useContext(ArcadeContext);

  if (arcade) {
    return (
      <div className="reject-footer modal-actions">
        <button type="button" className="btn btn-ghost btn-block" onClick={onClose}>
          게임 닫기
        </button>
      </div>
    );
  }

  return (
    <div className="reject-footer modal-actions">
      <button type="button" className="btn btn-ghost" onClick={onClose}>
        그냥 할래
      </button>
      {canGiveUp && (
        <button type="button" className="btn btn-accent" onClick={onGiveUp}>
          다른 방법으로 거절
        </button>
      )}
    </div>
  );
}

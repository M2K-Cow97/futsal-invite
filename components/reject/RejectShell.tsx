'use client';

import { useContext } from 'react';
import { ArcadeContext } from './ArcadeContext';

/** 모든 미니게임이 공유하는 껍데기. 목업의 팝업 톤을 그대로 쓴다. */
export function RejectShell({
  title,
  subtitle,
  arcadeSubtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  /**
   * 오락기(`/games`)에서 대신 쓸 부제목.
   * 거절 관문 문구("거절이 접수됩니다")는 오락기에서 맥락이 없다.
   * 주지 않으면 `subtitle` 을 그대로 쓴다.
   */
  arcadeSubtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  /* 오락기에서는 '거절 심사' 라는 맥락이 없다 — 그냥 게임이다. */
  const arcade = useContext(ArcadeContext);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal reject-modal">
        <div className="reject-head">
          {!arcade && <span className="reject-badge">거절 심사</span>}
          <h3 className="reject-title">{title}</h3>
          {(() => {
            const text = arcade ? (arcadeSubtitle ?? subtitle) : subtitle;
            return text ? <p className="reject-sub">{text}</p> : null;
          })()}
        </div>
        {children}
        {footer && <div className="reject-footer">{footer}</div>}
      </div>
    </div>
  );
}

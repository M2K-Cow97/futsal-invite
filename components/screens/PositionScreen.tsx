'use client';

import { useState } from 'react';
import type { Position } from '@/lib/schema';
import { MediaBox } from '../MediaBox';

/** 확정 가능한 포지션. FW 는 의도적으로 빠져 있다 (spec SC-005). */
type SelectablePosition = Exclude<Position, 'FW'>;

const OPTIONS: { key: Position; name: string; abbr: string }[] = [
  { key: 'FW', name: '공격수', abbr: 'FW' },
  { key: 'MF', name: '미드필더', abbr: 'MF' },
  { key: 'DF', name: '수비수', abbr: 'DF' },
  { key: 'GK', name: '골키퍼', abbr: 'GK' },
];

type Popup = null | 'first' | 'second';

/**
 * ④ position — 포지션 선택.
 *
 * 공격수는 2단 팝업으로 막힌다. 이 컴포넌트에는 onSelect('FW') 를 호출하는
 * 코드 경로가 존재하지 않는다 — 타입(SelectablePosition)으로도 막아 둔다.
 */
export function PositionScreen({
  submitting,
  error,
  onSelect,
}: {
  submitting: boolean;
  error: string | null;
  onSelect: (position: SelectablePosition) => void;
}) {
  const [popup, setPopup] = useState<Popup>(null);

  return (
    <div className="screen">
      <h2 className="title">어떤 포지션 할꺼야?</h2>
      <p className="subtitle">공격수는 이미 있음</p>

      {error && <p className="warn">{error}</p>}

      <div className="position-grid">
        {OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`position-btn${opt.key === 'FW' ? ' fw' : ''}`}
            disabled={submitting}
            onClick={() => {
              if (opt.key === 'FW') {
                // 확정하지 않는다. 팝업만 연다.
                setPopup('first');
                return;
              }
              onSelect(opt.key as SelectablePosition);
            }}
          >
            <span className="pos-name">{opt.name}</span>
            <span className="pos-abbr">{opt.abbr}</span>
          </button>
        ))}
      </div>

      {submitting && <p className="hint">티켓 만드는 중…</p>}

      {popup === 'first' && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <MediaBox src="/assets/ronaldo-warn.png" alt="경고하는 호날두" fallback="🤨" />
            <p className="modal-text">나랑 겹치는데… 정말 할거야? 🤨</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setPopup('second')}
              >
                그래도 할래
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setPopup(null)}>
                안할께..
              </button>
            </div>
          </div>
        </div>
      )}

      {popup === 'second' && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <MediaBox src="/assets/ronaldo-stern.png" alt="단호한 호날두" fallback="🐐" />
            <p className="modal-text">영장류 GOAT 공격수는 나뿐이야 🐐</p>
            <div className="modal-actions">
              {/* "돌아가기" 뿐이다. 여기서 공격수가 확정되는 경로는 없다. */}
              <button type="button" className="btn btn-accent" onClick={() => setPopup(null)}>
                돌아가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

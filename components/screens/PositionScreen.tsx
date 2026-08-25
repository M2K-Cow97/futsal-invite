'use client';

import { useState } from 'react';
import type { Position } from '@/lib/schema';
import { MediaBox } from '../MediaBox';

const OPTIONS: { key: Position; name: string; abbr: string }[] = [
  { key: 'FW', name: '공격수', abbr: 'FW' },
  { key: 'MF', name: '미드필더', abbr: 'MF' },
  { key: 'DF', name: '수비수', abbr: 'DF' },
  { key: 'GK', name: '골키퍼', abbr: 'GK' },
];

/** 공격수를 고르면 나오는 3단 경고. 마지막은 물러날 수밖에 없다. */
type FwStep = null | 1 | 2 | 3;

/**
 * ④ position — 포지션 선택.
 *
 * 포지션별 현재 인원을 실제 데이터로 보여준다("비어 있음" 강조). 자리 사정을
 * 알고 고르게 하는 것이 목적이라 인원으로 막지는 않는다.
 *
 * 단 **공격수는 3단 경고 뒤 물러나게** 한다 (spec SC-005). 주최자가 유일한
 * 공격수라는 설정이고, 이 컴포넌트에는 onSelect('FW') 를 호출하는 경로가
 * 존재하지 않는다.
 */
export function PositionScreen({
  submitting,
  error,
  counts,
  guestName,
  onSelect,
}: {
  submitting: boolean;
  error: string | null;
  /** 포지션별 현재 인원. null 이면 조회에 실패한 것이므로 숫자를 감춘다. */
  counts: Record<string, number> | null;
  /** 2단 경고에서 이름을 불러 세우기 위해 쓴다. */
  guestName: string;
  onSelect: (position: Exclude<Position, 'FW'>) => void;
}) {
  const [fw, setFw] = useState<FwStep>(null);
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="screen">
      <h2 className="title">어떤 포지션 할꺼야?</h2>
      <p className="subtitle">
        {counts
          ? total === 0
            ? '아직 아무도 없어. 첫 번째야! 🎉'
            : `지금 ${total}명 참석 · 비어 있는 자리를 골라도 좋아`
          : '원하는 자리를 골라줘'}
      </p>

      {error && <p className="warn">{error}</p>}

      <div className="position-grid">
        {OPTIONS.map((opt) => {
          const n = counts?.[opt.key] ?? 0;
          return (
            <button
              key={opt.key}
              type="button"
              className={`position-btn${opt.key === 'FW' ? ' fw' : ''}`}
              disabled={submitting}
              onClick={() => {
                if (opt.key === 'FW') {
                  // 확정하지 않는다. 경고만 시작한다.
                  setFw(1);
                  return;
                }
                onSelect(opt.key as Exclude<Position, 'FW'>);
              }}
            >
              <span className="pos-name">{opt.name}</span>
              <span className="pos-abbr">{opt.abbr}</span>
              {counts && (
                <span className={`pos-count${n === 0 ? ' empty' : ''}`}>
                  {n === 0 ? '비어 있음' : `${n}명`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {submitting && <p className="hint">티켓 만드는 중…</p>}

      {fw !== null && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <MediaBox
              src={fw === 3 ? '/assets/ronaldo-stern.png' : '/assets/ronaldo-warn.png'}
              alt="호날두"
              fallback={fw === 3 ? '🐐' : fw === 2 ? '😠' : '🤨'}
            />

            <p className="modal-text">
              {fw === 1 && '미안하지만 공격수는 오직 나뿐이야'}
              {fw === 2 && `${guestName.trim() || '너'}, 넌 공격수를 할 수 없어`}
              {fw === 3 && '날 화나게 하지마 🐐'}
            </p>

            <div className="modal-actions">
              {fw < 3 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setFw((s) => ((s ?? 1) + 1) as FwStep)}
                >
                  그래도 할래
                </button>
              ) : (
                // 3단까지 오면 물러나는 선택지만 남는다.
                <button type="button" className="btn btn-accent" onClick={() => setFw(null)}>
                  약속 취소 (미안해 다른 포지션 할께)
                </button>
              )}
              {fw < 3 && (
                <button type="button" className="btn btn-ghost" onClick={() => setFw(null)}>
                  안할께..
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

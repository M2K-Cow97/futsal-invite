'use client';

import type { Position } from '@/lib/schema';

const OPTIONS: { key: Position; name: string; abbr: string }[] = [
  { key: 'FW', name: '공격수', abbr: 'FW' },
  { key: 'MF', name: '미드필더', abbr: 'MF' },
  { key: 'DF', name: '수비수', abbr: 'DF' },
  { key: 'GK', name: '골키퍼', abbr: 'GK' },
];

/**
 * ④ position — 포지션 선택.
 *
 * 예전에는 공격수를 2단 팝업("영장류 GOAT 공격수는 나뿐이야")으로 막았다.
 * 참석을 수락한 사람에게까지 선택지를 빼앗는 건 과했다 — 이제 막지 않고,
 * 대신 **실제 데이터로 포지션별 현재 인원**을 보여줘 비어 있는 자리를 알려준다.
 * 공격수가 몰려 있으면 숫자가 그걸 말해주므로 농담이 강요가 되지 않는다.
 */
export function PositionScreen({
  submitting,
  error,
  counts,
  onSelect,
}: {
  submitting: boolean;
  error: string | null;
  /** 포지션별 현재 인원. null 이면 조회에 실패한 것이므로 숫자를 감춘다. */
  counts: Record<string, number> | null;
  onSelect: (position: Position) => void;
}) {
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
              className="position-btn"
              disabled={submitting}
              onClick={() => onSelect(opt.key)}
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
    </div>
  );
}

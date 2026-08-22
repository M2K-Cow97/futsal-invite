'use client';

/**
 * ③ matchday — 일정.
 *
 * 두 모드로 쓰인다 (plan.md 설계 결정 2):
 * - editable: 주최자 홈(/). 목업 그대로 날짜·시간·구장을 입력한다.
 * - readonly: 초대 흐름. 주최자가 정한 일정을 보여주고 게스트 이름만 받는다.
 */

export type MatchInfo = { matchDate: string; matchTime: string; venue: string };

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dow = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
  return `${y}. ${String(m).padStart(2, '0')}. ${String(d).padStart(2, '0')} (${dow})`;
}

export function MatchdayEditor({
  value,
  onChange,
}: {
  value: MatchInfo;
  onChange: (next: MatchInfo) => void;
}) {
  return (
    <>
      <div className="field">
        <label className="label" htmlFor="matchDate">
          날짜
        </label>
        <input
          id="matchDate"
          className="input"
          type="date"
          value={value.matchDate}
          onChange={(e) => onChange({ ...value, matchDate: e.target.value })}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="matchTime">
          시간
        </label>
        <input
          id="matchTime"
          className="input"
          type="time"
          value={value.matchTime}
          onChange={(e) => onChange({ ...value, matchTime: e.target.value })}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="venue">
          구장
        </label>
        <input
          id="venue"
          className="input"
          type="text"
          maxLength={50}
          placeholder="구장 이름 직접 입력…"
          value={value.venue}
          onChange={(e) => onChange({ ...value, venue: e.target.value })}
        />
      </div>
    </>
  );
}

export function MatchdayScreen({
  match,
  isPast,
  guestName,
  onGuestNameChange,
  onNext,
}: {
  match: MatchInfo;
  isPast: boolean;
  guestName: string;
  onGuestNameChange: (name: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="screen">
      <h2 className="title">Match Day 📅</h2>
      <p className="subtitle">날짜, 시간, 구장은 이미 정해졌어!</p>

      {isPast && <p className="warn">이미 지난 경기예요 🥲</p>}

      <dl style={{ margin: '0 0 20px' }}>
        <div className="readonly-row">
          <dt>날짜</dt>
          <dd>{formatDate(match.matchDate)}</dd>
        </div>
        <div className="readonly-row">
          <dt>시간</dt>
          <dd>{match.matchTime}</dd>
        </div>
        <div className="readonly-row">
          <dt>구장</dt>
          <dd>{match.venue}</dd>
        </div>
      </dl>

      <div className="field">
        <label className="label" htmlFor="guestName">
          이름 (티켓에 새겨질 이름이야)
        </label>
        <input
          id="guestName"
          className="input"
          type="text"
          maxLength={20}
          placeholder="이름 입력…"
          value={guestName}
          onChange={(e) => onGuestNameChange(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={guestName.trim().length === 0}
        onClick={onNext}
      >
        다음 ➜
      </button>
      {guestName.trim().length === 0 && <p className="hint">이름을 입력해야 다음으로 갈 수 있어</p>}
    </div>
  );
}

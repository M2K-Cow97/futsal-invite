'use client';

/**
 * ③ matchday — 일정.
 *
 * 두 모드로 쓰인다 (plan.md 설계 결정 2):
 * - editable: 주최자 홈(/). 목업 그대로 날짜·시간·구장을 입력한다.
 * - readonly: 초대 흐름. 주최자가 정한 일정을 보여주고 게스트 이름만 받는다.
 */

export type MatchInfo = {
  matchDate: string;
  matchTime: string;
  venue: string;
  /** 플랩·매치 등 경기 예약 페이지 링크. 주최자가 넣지 않았으면 null. */
  matchUrl?: string | null;
  /** 예약 페이지에서 가져온 구장 사진. 없으면 기본 이미지를 쓴다. */
  venueImage?: string | null;
};

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

      <div className="field">
        <label className="label" htmlFor="matchUrl">
          경기 링크 <span className="label-optional">선택</span>
        </label>
        <input
          id="matchUrl"
          className="input"
          type="url"
          inputMode="url"
          maxLength={500}
          placeholder="플랩 등 예약 페이지 주소…"
          value={value.matchUrl ?? ''}
          onChange={(e) => onChange({ ...value, matchUrl: e.target.value })}
        />
        <p className="hint" style={{ textAlign: 'left' }}>
          붙여넣으면 초대장에서 구장 위치·회비를 바로 확인할 수 있어요
        </p>
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
      <h2 className="title">참석 확인 📋</h2>
      <p className="subtitle">날짜·시간·구장은 이미 정해졌어. 이름만 알려줘!</p>

      {isPast && <p className="warn">이미 지난 경기예요 🥲</p>}

      {/* 구장 사진. 스크래핑 실패·미입력 시 기본 이미지로 폴백한다. */}
      {match.matchUrl && (
        <img
          className="venue-photo"
          src={match.venueImage ?? '/venue-default'}
          alt={`${match.venue} 사진`}
          loading="lazy"
        />
      )}

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
        {match.matchUrl && (
          <div className="readonly-row">
            <dt>경기 정보</dt>
            <dd>
              {/* 스킴은 서버(zod)에서 http/https 로 제한했다. */}
              <a
                className="match-link"
                href={match.matchUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                예약 페이지 열기 ↗
              </a>
            </dd>
          </div>
        )}
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
        참석할래! ➜
      </button>
      {guestName.trim().length === 0 && <p className="hint">이름을 입력해야 참석 확정할 수 있어</p>}
    </div>
  );
}

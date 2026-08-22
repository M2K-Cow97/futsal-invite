'use client';

import { useState } from 'react';
import { CopyLinkBox } from '@/components/CopyLinkBox';
import { MatchdayEditor, type MatchInfo } from '@/components/screens/MatchdayScreen';

type Created = { inviteUrl: string; manageUrl: string };

/** 주최자 화면 — 경기 정보를 입력해 초대 링크를 만든다 (spec Story 2). */
export default function HomePage() {
  const [hostName, setHostName] = useState('');
  const [match, setMatch] = useState<MatchInfo>({ matchDate: '', matchTime: '', venue: '' });
  const [created, setCreated] = useState<Created | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready =
    hostName.trim().length > 0 &&
    match.matchDate.length > 0 &&
    match.matchTime.length > 0 &&
    match.venue.trim().length > 0;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: hostName.trim(),
          matchDate: match.matchDate,
          matchTime: match.matchTime,
          venue: match.venue.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          data?.error === 'past_date'
            ? '지난 날짜예요. 다시 골라 주세요.'
            : '초대장을 만들지 못했어요. 입력을 확인해 주세요.',
        );
        return;
      }

      setCreated({ inviteUrl: data.inviteUrl, manageUrl: data.manageUrl });
    } catch {
      setError('네트워크 오류예요. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <main className="stage">
        <div className="card">
          <div className="screen">
            <h1 className="title">초대장 완성! 🎉</h1>
            <p className="subtitle">공유 링크를 단톡방에 던지세요</p>

            <CopyLinkBox
              label="🔗 공유 링크"
              desc="친구에게 보낼 링크예요. 이 링크를 연 사람이 포지션을 골라 참석자로 등록됩니다."
              url={created.inviteUrl}
            />
            <CopyLinkBox
              label="🔒 관리 링크"
              desc="참석자 명단을 보는 링크예요. 나만 알고 있어야 합니다."
              url={created.manageUrl}
            />

            <a
              className="btn btn-ghost btn-block"
              href={created.manageUrl}
              style={{ marginTop: 4, textDecoration: 'none' }}
            >
              명단 보러 가기
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="stage">
      <div className="card">
        <div className="screen">
          <h1 className="title">나랑 풋살할래? ⚽</h1>
          <p className="subtitle">경기를 정하고 초대 링크를 만들어요</p>

          {error && <p className="warn">{error}</p>}

          <div className="field">
            <label className="label" htmlFor="hostName">
              내 이름 (주최자)
            </label>
            <input
              id="hostName"
              className="input"
              type="text"
              maxLength={20}
              placeholder="이름 입력…"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
            />
          </div>

          <MatchdayEditor value={match} onChange={setMatch} />

          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!ready || submitting}
            onClick={submit}
          >
            {submitting ? '만드는 중…' : '초대장 만들기 ➜'}
          </button>
          {!ready && <p className="hint">네 칸을 모두 채워야 초대장을 만들 수 있어요</p>}
        </div>
      </div>
    </main>
  );
}

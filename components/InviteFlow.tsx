'use client';

import { useState } from 'react';
import { playSfx, playSound } from '@/lib/sound';
import type { Position } from '@/lib/schema';
import { InviteScreen } from './screens/InviteScreen';
import { MatchdayScreen, type MatchInfo } from './screens/MatchdayScreen';
import { PositionScreen } from './screens/PositionScreen';
import { SiuuuScreen } from './screens/SiuuuScreen';
import { TicketScreen, type Ticket } from './screens/TicketScreen';

type Screen = 'invite' | 'siuuu' | 'matchday' | 'position' | 'ticket';

/**
 * 5화면 전환 컨트롤러.
 * 원본 기획의 `state = { currentScreen }` 구조를 그대로 유지한다 — 라우팅을 끼우면
 * 애니메이션 연속성과 사운드 재생 컨텍스트가 깨진다 (plan 설계 결정 1).
 */
export function InviteFlow({
  slug,
  hostName,
  match,
  isPast,
  counts,
}: {
  slug: string;
  hostName: string;
  match: MatchInfo;
  isPast: boolean;
  /** 포지션별 현재 인원. 조회 실패 시 null — 그때는 인원을 감춘다. */
  counts: Record<string, number> | null;
}) {
  const [screen, setScreen] = useState<Screen>('invite');
  const [guestName, setGuestName] = useState('');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function accept() {
    // 사운드는 반드시 이 클릭 핸들러 안에서 시작해야 한다 (spec AC-4).
    playSound('/assets/siu-sound.mp3');
    setScreen('siuuu');
  }

  /*
   * FW 는 인자로 올 수 없다 — PositionScreen 이 3단 경고로 막고, 타입으로도
   * 배제한다 (spec SC-005). 인원 표시는 유지하되 공격수만 확정 경로가 없다.
   */
  async function submitPosition(position: Exclude<Position, 'FW'>) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, guestName: guestName.trim(), position }),
      });

      if (!res.ok) {
        // 마감된 경기는 재시도해도 안 된다. "다시 시도" 라고 하면 헛되게 만든다.
        const reason = await res
          .json()
          .then((b: { error?: string }) => b.error)
          .catch(() => null);
        setError(
          reason === 'past_match'
            ? '이미 지난 경기라 참석 등록이 마감됐어요 주최자에게 새 초대장을 요청해 주세요.'
            : '응답을 저장하지 못했어요. 다시 시도해 주세요.',
        );
        return;
      }

      setTicket((await res.json()) as Ticket);
      setScreen('ticket');

      /*
       * 경기 확정 축하음. 포지션 클릭(사용자 제스처)에서 시작된 흐름이라
       * 대부분의 브라우저가 await 뒤에도 재생을 허용한다. 막히면 무음이다.
       */
      playSfx('/assets/siu_full.mp3', 0.85);
    } catch {
      setError('네트워크 오류예요. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="stage">
      <div className="card">
        {screen === 'invite' && (
          <InviteScreen hostName={hostName} match={match} isPast={isPast} onAccept={accept} />
        )}

        {screen === 'siuuu' && <SiuuuScreen onNext={() => setScreen('matchday')} />}

        {screen === 'matchday' && (
          <MatchdayScreen
            match={match}
            isPast={isPast}
            guestName={guestName}
            onGuestNameChange={setGuestName}
            onNext={() => setScreen('position')}
          />
        )}

        {screen === 'position' && (
          <PositionScreen
            submitting={submitting}
            error={error}
            counts={counts}
            guestName={guestName}
            onSelect={submitPosition}
          />
        )}

        {screen === 'ticket' && ticket && <TicketScreen ticket={ticket} />}
      </div>
    </main>
  );
}

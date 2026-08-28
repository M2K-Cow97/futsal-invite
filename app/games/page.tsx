'use client';

import { useState } from 'react';
import { DodgeStage } from '@/components/reject/DodgeStage';
import { FreekickStage } from '@/components/reject/FreekickStage';
import { KeypadStage } from '@/components/reject/KeypadStage';
import { LeverStage } from '@/components/reject/LeverStage';
import { PenaltyStage } from '@/components/reject/PenaltyStage';
import { SiuStage } from '@/components/reject/SiuStage';

/**
 * 호날두 게임 — 오락기 진입 화면.
 *
 * 초대 흐름(`/i/{slug}`)에서 분리한 독립 URL이다. 릴스를 따로 찍기 때문에
 * 초대장 없이 바로 게임에 진입할 수 있어야 하고, 초대 흐름에서는 이 경로로
 * 가는 링크를 두지 않는다(초대장 여정이 길어지면 안 된다).
 *
 * 게임 자체는 거절 관문의 스테이지 컴포넌트를 그대로 재사용한다 —
 * 로직이 두 벌이 되면 한쪽만 고치는 실수가 난다.
 *
 * 빠진 게임: 거절 사유 심사(`ReasonStage`). 핑계를 대는 맥락이 있어야
 * 살아나는 단계라 게임 목록에서는 숨겼다. GAMES 에 넣으면 그대로 살아난다.
 */

type Game = {
  id: string;
  /** 오락기 슬롯에 박히는 큰 글자 */
  mark: string;
  title: string;
  blurb: string;
  Stage: React.ComponentType<{ onGiveUp: () => void; onClose: () => void }>;
};

const GAMES: Game[] = [
  {
    id: 'dodge',
    mark: '🌧',
    title: '호우 피하기',
    blurb: '하늘에서 호날두가 쏟아진다',
    Stage: DodgeStage,
  },
  {
    id: 'lever',
    mark: '⚽',
    title: '호날두를 뚫어라',
    blurb: '기울여서 골라인까지',
    Stage: LeverStage,
  },
  {
    id: 'siu',
    mark: '🗣',
    title: 'SIUUU 심사',
    blurb: '마이크로 음량 측정',
    Stage: SiuStage,
  },
  {
    id: 'penalty',
    mark: '🥊',
    title: '공 뺏기',
    blurb: '연타로 공을 당겨라',
    Stage: PenaltyStage,
  },
  {
    id: 'freekick',
    mark: '🧤',
    title: '프리킥 막기',
    blurb: '무회전킥을 막아라',
    Stage: FreekickStage,
  },
  {
    id: 'keypad',
    mark: '🔒',
    title: '라커룸 인증',
    blurb: '비밀번호를 맞춰라',
    Stage: KeypadStage,
  },
];

export default function GamesPage() {
  const [playing, setPlaying] = useState<Game | null>(null);

  if (playing) {
    const { Stage } = playing;
    return (
      <main className="stage">
        <div className="card">
          {/* onGiveUp·onClose 둘 다 목록으로 돌아온다 — 다음 관문이라는 개념이 없다. */}
          <Stage onGiveUp={() => setPlaying(null)} onClose={() => setPlaying(null)} />
        </div>
      </main>
    );
  }

  return (
    <main className="arcade">
      <div className="arcade-cabinet">
        {/* 상단 마키 — 오락기 간판 */}
        <div className="arcade-marquee">
          <span className="arcade-marquee-sub">CR7 ARCADE</span>
          <h1 className="arcade-marquee-title">호날두 게임</h1>
        </div>

        {/* 화면 — 게임 선택 */}
        <div className="arcade-screen">
          <p className="arcade-select">▸ SELECT GAME</p>

          <div className="arcade-grid">
            {GAMES.map((g, i) => (
              <button
                key={g.id}
                type="button"
                className="arcade-slot"
                onClick={() => setPlaying(g)}
              >
                <span className="arcade-slot-no">{String(i + 1).padStart(2, '0')}</span>
                <span className="arcade-slot-mark" aria-hidden="true">
                  {g.mark}
                </span>
                <span className="arcade-slot-title">{g.title}</span>
                <span className="arcade-slot-blurb">{g.blurb}</span>
              </button>
            ))}
          </div>

          <p className="arcade-ticker">전부 못 깬다 · 그게 정상이다 · 전부 못 깬다 · 그게 정상이다</p>
        </div>

        {/* 하단 조작부 — 장식 */}
        <div className="arcade-panel" aria-hidden="true">
          <span className="arcade-stick" />
          <span className="arcade-btn red" />
          <span className="arcade-btn yellow" />
          <span className="arcade-btn green" />
        </div>
      </div>
    </main>
  );
}

'use client';

import { useState } from 'react';
import { DodgeStage } from '@/components/reject/DodgeStage';
import { FreekickStage } from '@/components/reject/FreekickStage';
import { KeypadStage } from '@/components/reject/KeypadStage';
import { LeverStage } from '@/components/reject/LeverStage';
import { PenaltyStage } from '@/components/reject/PenaltyStage';
import { ReasonStage } from '@/components/reject/ReasonStage';
import { SiuStage } from '@/components/reject/SiuStage';

/**
 * 호날두 게임 모음.
 *
 * 초대 흐름(`/i/{slug}`)에서 분리한 화면이다. 릴스를 따로 찍기 때문에
 * 초대장 없이 바로 게임에 진입할 수 있어야 한다.
 *
 * 게임 자체는 거절 관문의 스테이지 컴포넌트를 그대로 재사용한다 —
 * 로직이 두 벌이 되면 한쪽만 고치는 실수가 난다.
 */

type Game = {
  id: string;
  emoji: string;
  title: string;
  blurb: string;
  Stage: React.ComponentType<{ onGiveUp: () => void; onClose: () => void }>;
};

const GAMES: Game[] = [
  {
    id: 'dodge',
    emoji: '🌧️',
    title: '호우 피하기',
    blurb: '하늘에서 호날두가 쏟아진다. 10초 버티기',
    Stage: DodgeStage,
  },
  {
    id: 'lever',
    emoji: '⚽',
    title: '호날두를 뚫어라',
    blurb: '폰을 기울여 공을 굴려 골라인까지',
    Stage: LeverStage,
  },
  {
    id: 'siu',
    emoji: '🗣️',
    title: 'SIUUU 심사',
    blurb: '호날두만큼 크게 외쳐보기 (마이크)',
    Stage: SiuStage,
  },
  {
    id: 'penalty',
    emoji: '🥊',
    title: '페널티킥 공 뺏기',
    blurb: '연타로 공을 당겨오기',
    Stage: PenaltyStage,
  },
  {
    id: 'freekick',
    emoji: '🧤',
    title: '무회전 프리킥 막기',
    blurb: '형이 차는 무회전킥 막아보기',
    Stage: FreekickStage,
  },
  {
    id: 'keypad',
    emoji: '🔒',
    title: '라커룸 인증',
    blurb: '호날두 라커룸 비밀번호 맞추기',
    Stage: KeypadStage,
  },
  {
    id: 'reason',
    emoji: '📋',
    title: '거절 사유 심사',
    blurb: '핑계를 대면 심사해 준다',
    Stage: ReasonStage,
  },
];

export default function GamesPage() {
  const [playing, setPlaying] = useState<Game | null>(null);

  if (playing) {
    const { Stage } = playing;
    return (
      <main className="stage">
        <div className="card">
          {/* onGiveUp 과 onClose 둘 다 목록으로 돌아온다 — 다음 관문이라는 개념이 없다. */}
          <Stage onGiveUp={() => setPlaying(null)} onClose={() => setPlaying(null)} />
        </div>
      </main>
    );
  }

  return (
    <main className="stage">
      <div className="card">
        <div className="screen">
          <h1 className="title">호날두 게임</h1>
          <p className="subtitle">전부 못 깬다. 그게 정상이다.</p>

          <div className="reason-list" style={{ maxHeight: 'none' }}>
            {GAMES.map((g) => (
              <button
                key={g.id}
                type="button"
                className="reason-item"
                onClick={() => setPlaying(g)}
              >
                <span className="reason-emoji">{g.emoji}</span>
                <span className="reason-label">
                  {g.title}
                  <span className="game-blurb">{g.blurb}</span>
                </span>
                <span className="reason-mark">›</span>
              </button>
            ))}
          </div>

          {/*
            초대 흐름과는 연결하지 않는다 — 릴스를 따로 찍기 위한 독립 화면이고,
            초대장 여정이 길어지면 안 된다. 이 URL 을 아는 사람만 들어온다.
          */}
        </div>
      </div>
    </main>
  );
}

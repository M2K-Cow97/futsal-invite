'use client';

import { useRef, useState } from 'react';
import { RejectShell } from './RejectShell';
import type { StageProps } from './types';
import { useTimers } from './useTimers';

/** 처음 보이는 조항 수. 끝에 닿을 때마다 늘어난다. */
const INITIAL_CLAUSES = 40;
const GROW_BY = 25;
/** 이 횟수만큼 배신하면 마지막 메시지로 끝낸다. */
const BETRAY_LIMIT = 3;

const CLAUSE_TEXT = [
  '거절자는 향후 모든 풋살 경기에서 벤치를 사용한다.',
  '거절자는 주최자에게 커피를 무기한 제공한다.',
  '본 조항은 거절자가 읽지 않았어도 유효하다.',
  '거절 의사는 3영업일 이내 철회될 수 있으나 철회는 불가하다.',
  '거절자는 다음 경기 조끼 세탁을 담당한다.',
  '본 약관은 예고 없이 길어질 수 있다.',
  '거절자는 호날두에게 사과문을 제출한다.',
  '스크롤은 증거로 기록된다.',
  '거절자는 골키퍼로 고정 배치된다.',
  '본 조항의 해석은 주최자에게 유리한 방향으로 한다.',
];

export function TermsStage({ onClose }: StageProps) {
  /** 연출 타이머. 언마운트 시 자동 정리된다. */
  const timers = useTimers();
  const boxRef = useRef<HTMLDivElement>(null);
  const [clauses, setClauses] = useState(INITIAL_CLAUSES);
  const [betrayals, setBetrayals] = useState(0);
  const [progress, setProgress] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);

  function onScroll() {
    const el = boxRef.current;
    if (!el || exhausted) return;

    const max = el.scrollHeight - el.clientHeight;
    setProgress(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);

    // 끝에 거의 닿으면 배신한다.
    if (max > 0 && el.scrollTop >= max - 24) {
      const n = betrayals + 1;
      setBetrayals(n);

      if (n >= BETRAY_LIMIT) {
        setExhausted(true);
        setFlash('약관을 모두 읽으셨습니다. 하지만 동의 버튼이 존재하지 않습니다.');
        return;
      }

      setClauses((c) => c + GROW_BY);
      setFlash(n === 1 ? '조항이 추가되었습니다' : '개정된 약관이 반영되었습니다');
      // 위로 튕겨 올린다.
      el.scrollTop = Math.max(0, el.scrollTop - el.clientHeight * 2.2);
      timers.set(() => setFlash(null), 1400);
    }
  }

  return (
    <RejectShell
      title="거절 약관 동의"
      subtitle="마지막 단계입니다. 약관을 끝까지 읽고 동의하세요."
    >
      <div className="terms-progress">
        <div className="terms-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <span className="terms-pct">진행률 {progress.toFixed(1)}%</span>

      <div className="terms-box" ref={boxRef} onScroll={onScroll}>
        <p className="terms-lead">풋살 참가 거절에 관한 약관 (제{clauses}조까지)</p>
        {Array.from({ length: clauses }, (_, i) => (
          <p className="terms-clause" key={i}>
            <b>제{i + 1}조</b> {CLAUSE_TEXT[i % CLAUSE_TEXT.length]}
          </p>
        ))}
        {exhausted && <p className="terms-end">— 약관 끝 —</p>}
      </div>

      {flash && <p className="lever-msg bad">{flash}</p>}

      <label className="terms-agree">
        <input type="checkbox" disabled />
        <span>위 내용을 모두 이해했습니다 {exhausted ? '(비활성)' : '(끝까지 읽어야 활성)'}</span>
      </label>

      <div className="modal-actions">
        <button type="button" className="btn btn-accent btn-block" onClick={onClose}>
          {exhausted ? '…그냥 풋살할게' : '그냥 할래'}
        </button>
      </div>
    </RejectShell>
  );
}

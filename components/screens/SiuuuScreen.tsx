'use client';

import { MediaBox } from '../MediaBox';

/**
 * ② siuuu — 수락 축하.
 * 사운드는 부모의 "좋아!" 클릭 핸들러에서 이미 시작됐다 (spec AC-4).
 * 이 컴포넌트에서 재생을 시작하면 자동재생 정책에 막히므로 여기서는 재생하지 않는다.
 */
export function SiuuuScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="screen">
      <MediaBox src="/assets/you.gif" alt="SIU 셀러브레이션" fallback="🕺" />

      <h2 className="title siu-title">나도 좋siuuuuu</h2>

      <p className="subtitle">경기는 이미 잡혀 있어. 참석만 확정하면 돼!</p>

      <button type="button" className="btn btn-accent btn-block" onClick={onNext}>
        참석 확정하기
      </button>
    </div>
  );
}

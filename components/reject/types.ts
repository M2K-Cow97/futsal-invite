/**
 * 거절 관문(Rejection Gauntlet).
 *
 * 모바일에는 hover 가 없어 "도망가는 버튼" 만으로는 재미가 약하다.
 * 그래서 거절을 시도하면 터무니없는 미니게임이 순서대로 막아선다.
 *
 * 설계 원칙: **깰 수 있어 보이지만 절대 못 깬다.**
 * 명백히 불가능하면 바로 포기하지만, "거의 됐는데!" 싶으면 계속 매달린다.
 * 그래서 모든 스테이지는 달성 직전까지 가게 해놓고 마지막 순간에 배신한다.
 */

export type StageProps = {
  /** 이 스테이지를 포기하고 다음 관문으로 넘긴다. */
  onGiveUp: () => void;
  /** 관문 전체를 닫는다 (= 거절 실패, invite 화면으로 복귀). */
  onClose: () => void;
};

export type StageId = 'lever' | 'tilt' | 'freekick' | 'keypad' | 'terms';

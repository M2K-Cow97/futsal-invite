/**
 * 사운드 재생. 반드시 사용자 제스처 핸들러 안에서 호출해야 한다 (spec AC-4).
 * 자동재생이 차단되거나 파일이 없으면 조용히 넘어간다 — 에러를 보여주지 않는다.
 */
export function playSound(src: string): void {
  try {
    const audio = new Audio(src);
    audio.volume = 0.7;
    void audio.play().catch(() => {
      /* 자동재생 차단 또는 파일 부재. 무음으로 진행한다. */
    });
  } catch {
    /* Audio 생성 자체가 실패하는 환경. 무시한다. */
  }
}

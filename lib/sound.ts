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

/** 같은 소리를 연달아 낼 때 재사용할 엘리먼트. src 별로 하나씩 둔다. */
const cache = new Map<string, HTMLAudioElement>();

/**
 * 짧은 효과음을 **겹치지 않게** 재생한다.
 *
 * "싫어." 회피처럼 빠르게 반복되는 동작에 `playSound` 를 쓰면 재생이 겹쳐
 * 소리가 뭉갠다. 같은 엘리먼트를 되감아 다시 트는 편이 깔끔하다.
 *
 * mp4 도 오디오 트랙만 재생되므로 그대로 쓸 수 있다.
 */
export function playSfx(src: string, volume = 0.7): void {
  try {
    let audio = cache.get(src);
    if (!audio) {
      audio = new Audio(src);
      cache.set(src, audio);
    }
    audio.volume = volume;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      /* 자동재생 차단 또는 파일 부재. 무음으로 진행한다. */
    });
  } catch {
    /* Audio 생성 자체가 실패하는 환경. 무시한다. */
  }
}

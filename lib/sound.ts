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

/**
 * 오디오 잠금 해제.
 *
 * iOS·안드로이드는 **사용자 제스처(tap·click) 안에서 시작한 재생**만 허용한다.
 * `touchmove` 는 제스처로 쳐주지 않아서, "싫어." 가 손가락이 닿기 전에
 * 도망가는 경우(근접 감지) 소리가 차단된다.
 *
 * 그래서 페이지의 **첫 터치**에서 볼륨 0으로 한 번 재생해 잠금을 풀어 둔다.
 * 한 번 풀리면 같은 엘리먼트는 이후 어떤 시점에도 소리를 낼 수 있다.
 *
 * 미리 로드해두는 효과도 있어 첫 재생이 끊기지 않는다.
 */
export function unlockAudio(srcs: string[]): void {
  if (typeof window === 'undefined') return;

  function unlock() {
    for (const src of srcs) {
      try {
        let audio = cache.get(src);
        if (!audio) {
          audio = new Audio(src);
          cache.set(src, audio);
        }
        audio.muted = true;
        void audio
          .play()
          .then(() => {
            audio!.pause();
            audio!.currentTime = 0;
            audio!.muted = false;
          })
          .catch(() => {
            /* 그래도 막히면 어쩔 수 없다. 무음으로 진행한다. */
            audio!.muted = false;
          });
      } catch {
        /* 무시한다. */
      }
    }
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('pointerdown', unlock);
  }

  // 첫 터치 한 번만. once 옵션은 두 리스너를 각각 소모하므로 직접 정리한다.
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('pointerdown', unlock, { passive: true });
}

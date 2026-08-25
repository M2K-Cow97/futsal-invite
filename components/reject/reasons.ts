/**
 * 거절 사유 목록.
 *
 * 각 사유는 "그럴듯한 핑계" 로 보이지만, 고르면 그 핑계가 **오히려 확정의 근거**로
 * 되돌아온다. 사유마다 배신 방식이 다른 게 핵심 — 다 눌러보게 만든다.
 *
 * `resolution` 이 핵심 반전이고, `steps` 는 진짜 심사하는 척하는 연출이다.
 *
 * 일부 사유는 `dynamic` 으로 **입력값에 따라 다른 반전**을 준다.
 * 어느 쪽으로 답해도 빠져나갈 수 없다는 게 드러나야 더 킹받는다.
 */

export type Reason = {
  id: string;
  emoji: string;
  label: string;
  /** 사유를 고른 직후 뜨는 확인 문구 */
  confirm: string;
  /** 심사 과정 (진짜 검토하는 척) */
  steps: string[];
  /** 반전 판정 */
  verdict: string;
  /** 판정 상세 — 노력이 확정 근거로 쓰이는 지점 */
  resolution: string;
  /** 도장 문구 */
  stamp: string;
  /**
   * 입력값에 반응하는 판정. 있으면 `verdict`/`resolution`/`stamp` 를 덮어쓴다.
   * 숫자로 파싱되지 않으면 기본 판정을 쓴다.
   */
  dynamic?: (input: string) => { verdict: string; resolution: string; stamp: string } | null;
  /** 파일 첨부를 요구하는 사유인지 */
  needsFile?: { cta: string; sub: string };
  /** 텍스트 입력을 요구하는 사유인지 */
  needsText?: { label: string; placeholder: string; maxLength: number };
};

export const REASONS: Reason[] = [
  {
    id: 'injury',
    emoji: '🏥',
    label: '부상이야',
    confirm: '부상 아웃을 신청합니다. 진단서를 제출하세요.',
    steps: ['진단서 수신 확인…', '호날두 주치의 소견 요청…', '레알 마드리드 의무팀 교차 검증…'],
    verdict: '✅ 메디컬 테스트 통과',
    resolution:
      '호날두의 주치의가 직접 판독했습니다. "이 정도로 못 뛴다면 나는 40살에 은퇴했겠지." 출전에 지장 없다는 소견입니다.',
    stamp: 'CR7 주치의 승인 · 출전 가능',
    needsFile: { cta: '진단서 첨부', sub: '이미지 또는 PDF · 사진 촬영도 가능' },
  },
  {
    id: 'schedule',
    emoji: '📅',
    label: '그날 약속 있어',
    confirm: '선약을 확인합니다. 일정을 입력하세요.',
    steps: ['캘린더 대조…', '호날두가 상대방에게 직접 전화…', '양해 확보…'],
    verdict: '✅ 일정 조정 완료',
    resolution:
      '호날두가 상대방에게 직접 전화했습니다. 통화 3초 만에 양해를 받았습니다. 상대방은 오히려 부러워했습니다.',
    stamp: 'CR7 직접 조율 · 참석 확정',
    needsText: { label: '무슨 약속인지', placeholder: '예: 가족 모임', maxLength: 30 },
  },
  {
    id: 'money',
    emoji: '💸',
    label: '돈이 없어',
    confirm: '호날두 무이자 대출을 신청합니다. 잔액을 입력하세요.',
    steps: ['재정 상태 확인…', '호날두 자산 조회 (₩1.2조)…', '한도 산출…'],
    verdict: '✅ CR7 무이자 대출 승인',
    resolution:
      '호날두가 회비를 빌려주기로 했습니다. 그의 연봉 기준 0.0000001% 입니다. 상환은 다음 경기 참석으로 갈음합니다 — 즉 다음에도 나와야 합니다.',
    stamp: 'CR7 대출 승인 · 참석 확정',
    needsText: { label: '현재 잔액 (원)', placeholder: '0', maxLength: 12 },
  },
  {
    id: 'skill',
    emoji: '🥶',
    label: '실력이 안 돼',
    confirm: '실력 미달을 사유로 제출합니다. 자기평가를 해주세요.',
    steps: ['최근 경기 기록 조회…', '호날두 눈으로 스카우팅…', '포지션 재배치 검토…'],
    verdict: '✅ 실력 무관 판정',
    resolution:
      '팀 전력을 재계산한 결과 귀하의 실력은 결과에 영향을 주지 않습니다. 부담 없이 오세요.',
    stamp: '참석 확정',
    needsText: { label: '내 실력 (10점 만점)', placeholder: '1', maxLength: 2 },
    // 낮게 써도 높게 써도 못 빠져나간다.
    dynamic: (input) => {
      const score = Number(input.trim());
      if (!Number.isFinite(score)) return null;

      if (score <= 3) {
        return {
          verdict: '✅ 겸손 판정',
          resolution: `${score}점이라고 하셨지만 호날두가 영상을 돌려봤습니다. 실제 실력은 7점입니다. "겸손은 챔피언의 자질이야."`,
          stamp: 'CR7 실측 7점 · 참석 확정',
        };
      }
      if (score >= 8) {
        return {
          verdict: '✅ 주전 확정',
          resolution: `${score}점이면 팀 내 최고 수준입니다. 호날두가 직접 주전으로 등록했습니다. "나 다음은 너야." 결장 시 전력 손실이 큽니다.`,
          stamp: 'CR7 지명 주전 · 참석 필수',
        };
      }
      return {
        verdict: '✅ 평균 판정',
        resolution: `${score}점은 팀 평균과 정확히 일치합니다. 호날두 말로는 "평균이 빠지면 팀이 무너져." 밸런스 핵심 전력입니다.`,
        stamp: 'CR7 인증 밸런스 · 참석 확정',
      };
    },
  },
  {
    id: 'weather',
    emoji: '🌧️',
    label: '비 올 것 같아',
    confirm: '기상 사유를 접수합니다.',
    steps: ['기상청 API 조회…', '과거 참석일 강수량 대조…', '호날두 상관관계 분석…'],
    verdict: '✅ 날씨 요정 판정',
    resolution:
      '호날두가 기록을 대조했습니다. 당신이 참석한 날은 비가 온 적이 없습니다. 상관계수 0.98. "너는 날씨를 바꾸는 남자야. 나처럼." 즉 당신이 오면 비가 안 옵니다.',
    stamp: 'CR7 인증 날씨 요정 · 참석 필수',
  },
  {
    id: 'tired',
    emoji: '😴',
    label: '너무 피곤해',
    confirm: '피로도를 측정합니다. 어제 수면 시간을 입력하세요.',
    steps: ['수면 기록 대조…', '호날두 루틴과 비교…', '운동 효과 시뮬레이션…'],
    verdict: '✅ 운동 권장 판정',
    resolution:
      '호날두는 하루 5회 낮잠으로 90분씩 나눠 잡니다. 그리고 매일 뜁니다. "피곤한 건 안 뛰어서 그래." 풋살을 처방합니다.',
    stamp: 'CR7 처방: 풋살 90분',
    needsText: { label: '어제 몇 시간 잤나요', placeholder: '5', maxLength: 4 },
    // 적게 잤어도 많이 잤어도 결론은 풋살이다.
    dynamic: (input) => {
      const hours = Number(input.trim());
      if (!Number.isFinite(hours)) return null;

      if (hours < 6) {
        return {
          verdict: '✅ 운동 처방',
          resolution: `${hours}시간이요? 호날두는 90분씩 나눠 자고 매일 뜁니다. "적게 자면 더 뛰어야 해. 그래야 잘 자."`,
          stamp: 'CR7 처방: 풋살 90분',
        };
      }
      if (hours >= 9) {
        return {
          verdict: '✅ 과다 수면 판정',
          resolution: `${hours}시간이나 잤습니다. 호날두가 그 시간에 두 번 훈련하고 사우나까지 했습니다. 즉시 운동이 필요합니다.`,
          stamp: 'CR7 처방: 풋살 90분 (긴급)',
        };
      }
      return {
        verdict: '✅ 컨디션 양호',
        resolution: `${hours}시간은 호날두가 권장하는 수면 시간입니다. 피로할 이유가 없습니다. 컨디션 최상.`,
        stamp: 'CR7 인증 컨디션 · 참석 확정',
      };
    },
  },
  {
    id: 'nointerest',
    emoji: '🤷',
    label: '그냥 하고 싶지 않아',
    confirm: '사유 없는 거절을 접수합니다.',
    steps: ['사유 유효성 검토…', '호날두에게 전달 시도…'],
    verdict: '❌ 사유 불충분',
    resolution:
      '호날두에게 "그냥 하고 싶지 않다" 고 전달했습니다. 그는 이 문장을 이해하지 못했습니다. 통역을 붙여도 실패했습니다. 규정상 사유 없는 거절은 참석으로 간주됩니다.',
    stamp: 'CR7 이해 불가 · 참석 확정',
  },
];

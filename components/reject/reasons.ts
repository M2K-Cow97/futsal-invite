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
    steps: ['진단서 수신 확인…', '병원 코드 조회…', '의무팀 교차 검증…'],
    verdict: '✅ 메디컬 테스트 통과',
    resolution:
      '진단서를 검토한 결과 출전에 지장이 없습니다. 해당 부위는 풋살에 사용되지 않습니다.',
    stamp: '출전 가능',
    needsFile: { cta: '진단서 첨부', sub: '이미지 또는 PDF · 사진 촬영도 가능' },
  },
  {
    id: 'schedule',
    emoji: '📅',
    label: '그날 약속 있어',
    confirm: '선약을 확인합니다. 일정을 입력하세요.',
    steps: ['캘린더 대조…', '선약 우선순위 산정…', '대체 가능성 검토…'],
    verdict: '✅ 일정 조정 완료',
    resolution:
      '입력하신 선약은 풋살보다 우선순위가 낮다고 판정되었습니다. 상대방에게 양해를 구했습니다.',
    stamp: '참석 확정',
    needsText: { label: '무슨 약속인지', placeholder: '예: 가족 모임', maxLength: 30 },
  },
  {
    id: 'money',
    emoji: '💸',
    label: '돈이 없어',
    confirm: '무이자 대출을 신청합니다. 잔액을 입력하세요.',
    steps: ['재정 상태 확인…', '신용 평가…', '한도 산출…'],
    verdict: '✅ 무이자 대출 승인',
    resolution:
      '주최자 명의로 회비를 빌려드립니다. 상환은 다음 경기 참석으로 갈음합니다. 즉 다음에도 나와야 합니다.',
    stamp: '대출 승인 · 참석 확정',
    needsText: { label: '현재 잔액 (원)', placeholder: '0', maxLength: 12 },
  },
  {
    id: 'skill',
    emoji: '🥶',
    label: '실력이 안 돼',
    confirm: '실력 미달을 사유로 제출합니다. 자기평가를 해주세요.',
    steps: ['최근 경기 기록 조회…', '팀 전력 균형 계산…', '포지션 재배치 검토…'],
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
          resolution: `${score}점이라고 하셨지만 최근 경기 기록 대조 결과 실제 실력은 7점입니다. 겸손하시네요.`,
          stamp: '실측 7점 · 참석 확정',
        };
      }
      if (score >= 8) {
        return {
          verdict: '✅ 주전 확정',
          resolution: `${score}점이면 팀 내 최고 수준입니다. 주전으로 등록되었으며 결장 시 전력 손실이 큽니다.`,
          stamp: '주전 등록 · 참석 필수',
        };
      }
      return {
        verdict: '✅ 평균 판정',
        resolution: `${score}점은 팀 평균과 정확히 일치합니다. 밸런스를 위해 반드시 필요한 전력입니다.`,
        stamp: '밸런스 핵심 · 참석 확정',
      };
    },
  },
  {
    id: 'weather',
    emoji: '🌧️',
    label: '비 올 것 같아',
    confirm: '기상 사유를 접수합니다.',
    steps: ['기상청 API 조회…', '과거 참석일 강수량 대조…', '상관관계 분석…'],
    verdict: '✅ 날씨 요정 판정',
    resolution:
      '기록을 대조한 결과, 당신이 참석한 날은 비가 온 적이 없습니다. 상관계수 0.98. 즉 당신이 오면 비가 안 옵니다. 안 오면 옵니다.',
    stamp: '날씨 요정 · 참석 필수',
  },
  {
    id: 'tired',
    emoji: '😴',
    label: '너무 피곤해',
    confirm: '피로도를 측정합니다. 어제 수면 시간을 입력하세요.',
    steps: ['수면 기록 대조…', '피로도 지수 산출…', '운동 효과 시뮬레이션…'],
    verdict: '✅ 운동 권장 판정',
    resolution:
      '피로 해소에는 가벼운 운동이 가장 효과적이라는 결론입니다. 풋살을 처방합니다.',
    stamp: '처방: 풋살 90분',
    needsText: { label: '어제 몇 시간 잤나요', placeholder: '5', maxLength: 4 },
    // 적게 잤어도 많이 잤어도 결론은 풋살이다.
    dynamic: (input) => {
      const hours = Number(input.trim());
      if (!Number.isFinite(hours)) return null;

      if (hours < 6) {
        return {
          verdict: '✅ 운동 처방',
          resolution: `${hours}시간 수면은 피로 누적 상태입니다. 이런 경우 가벼운 운동이 특효라는 연구 결과가 있습니다.`,
          stamp: '처방: 풋살 90분',
        };
      }
      if (hours >= 9) {
        return {
          verdict: '✅ 과다 수면 판정',
          resolution: `${hours}시간이나 주셨습니다. 과다 수면은 오히려 무기력을 유발합니다. 즉시 운동이 필요합니다.`,
          stamp: '처방: 풋살 90분 (긴급)',
        };
      }
      return {
        verdict: '✅ 컨디션 양호',
        resolution: `${hours}시간은 권장 수면 시간입니다. 피로할 이유가 없습니다. 컨디션 최상.`,
        stamp: '컨디션 양호 · 참석 확정',
      };
    },
  },
  {
    id: 'nointerest',
    emoji: '🤷',
    label: '그냥 하고 싶지 않아',
    confirm: '사유 없는 거절을 접수합니다.',
    steps: ['사유 유효성 검토…', '규정 대조…'],
    verdict: '❌ 사유 불충분',
    resolution:
      '"그냥" 은 유효한 거절 사유가 아닙니다. 규정상 사유 없는 거절은 참석으로 간주됩니다.',
    stamp: '참석 확정',
  },
];

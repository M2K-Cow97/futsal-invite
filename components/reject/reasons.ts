/**
 * 거절 사유 목록.
 *
 * 각 사유는 "그럴듯한 핑계" 로 보이지만, 고르면 그 핑계가 **오히려 확정의 근거**로
 * 되돌아온다. 사유마다 배신 방식이 다른 게 핵심 — 다 눌러보게 만든다.
 *
 * `resolution` 이 핵심 반전이고, `steps` 는 진짜 심사하는 척하는 연출이다.
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
    confirm: '회비 면제를 신청합니다. 잔액을 입력하세요.',
    steps: ['재정 상태 확인…', '회비 면제 심사…', '후원 매칭…'],
    verdict: '✅ 회비 전액 면제 승인',
    resolution:
      '주최자가 회비를 대납하기로 했습니다. 이제 참석하지 않을 이유가 없습니다.',
    stamp: '회비 0원 · 참석 확정',
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
  },
  {
    id: 'far',
    emoji: '🚌',
    label: '너무 멀어',
    confirm: '거리 사유를 제출합니다. 출발지를 입력하세요.',
    steps: ['경로 탐색…', '대중교통 조회…', '픽업 가능 인원 확인…'],
    verdict: '✅ 픽업 배차 완료',
    resolution:
      '주최자가 직접 데리러 가기로 했습니다. 집 앞에서 기다리시면 됩니다.',
    stamp: '픽업 확정 · 참석 확정',
    needsText: { label: '어디서 출발', placeholder: '예: 분당', maxLength: 20 },
  },
  {
    id: 'weather',
    emoji: '🌧️',
    label: '비 올 것 같아',
    confirm: '기상 사유를 접수합니다.',
    steps: ['기상청 API 조회…', '구장 배수 상태 확인…', '실내 대체 구장 검색…'],
    verdict: '✅ 실내 구장으로 변경',
    resolution:
      '비가 와도 문제없는 실내 구장을 예약했습니다. 오히려 쾌적합니다.',
    stamp: '구장 변경 · 참석 확정',
  },
  {
    id: 'tired',
    emoji: '😴',
    label: '너무 피곤해',
    confirm: '피로도를 측정합니다.',
    steps: ['수면 시간 추정…', '피로도 지수 산출…', '운동 효과 시뮬레이션…'],
    verdict: '✅ 운동 권장 판정',
    resolution:
      '피로 해소에는 가벼운 운동이 가장 효과적이라는 결론입니다. 풋살을 처방합니다.',
    stamp: '처방: 풋살 90분',
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

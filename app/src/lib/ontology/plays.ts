/**
 * Play 카탈로그 — stage × goal 조합별 전형 전략 시드.
 * LLM이 이 카탈로그에서 2~3 개 선택·병합하고 style/상대 프로파일로 변형.
 */

import type { StageKey } from './stages'
import type { GoalKey } from './goals'
import type { StyleKey } from './styles'

export type Play = {
  id: string
  triggers: {
    stage: StageKey[]
    goal: GoalKey[]
    style?: StyleKey[] // undefined = all
    partnerHints?: { trait?: string[]; mbtiPattern?: string }
  }
  title: string
  rationale: string
  steps: string[]
  timing: string
  messageDraftHint?: string
  successSignals: string[]
  failSignals: string[]
  risks: string[]
}

export const PLAYS: Play[] = [
  // ───────────────── pre_match / first_contact ─────────────────
  {
    id: 'premathch.observe_signal',
    triggers: { stage: ['pre_match'], goal: ['build_interest', 'qualify'] },
    title: '관찰 후 일점 오프너',
    rationale: '프로필에서 흔하지 않은 디테일 하나만 집어내 "진짜 본 것" 신호 주기.',
    steps: [
      '프로필에서 사진·문구 중 90%가 지나칠 디테일 1개 선정',
      '그 디테일에 대한 짧은 질문 or 가벼운 관찰',
      '자기 소개·칭찬 아예 생략',
      '답장 오면 바로 추가 질문 말고 24시간 여유',
    ],
    timing: '매칭 직후 12~24h',
    messageDraftHint: '프사 아닌 정보성 디테일 + 짧은 물음',
    successSignals: ['2문장 이상 답장', '상대가 먼저 후속 질문'],
    failSignals: ['짧은 이모지만', '24h+ 침묵'],
    risks: ['너무 관찰 티 나면 부담'],
  },
  {
    id: 'first.soft_opener',
    triggers: { stage: ['first_contact'], goal: ['build_interest'] },
    title: '가벼운 드립 오프너',
    rationale: '첫 대화는 긴장 내리는 게 우선. 진지 질문 금지.',
    steps: [
      '일상·밈 수준의 짧은 멘트',
      '답장하기 쉬운 yes/no보다 살짝 개방형',
      '길어도 2~3문장',
      '답장 간격 상대와 비슷하게',
    ],
    timing: '매칭 확정 후 24h 내',
    successSignals: ['농담 리턴', '웃음 이모지'],
    failSignals: ['ㅇㅇ', '단답 반복'],
    risks: ['너무 가벼워서 진지한 상대는 이탈'],
  },
  {
    id: 'first.values_probe',
    triggers: { stage: ['first_contact', 'sseom'], goal: ['qualify'] },
    title: '가치관 질문 1발',
    rationale: '허세·러브바밍 상대는 깊은 질문에 얇게 반응. 검증 지표.',
    steps: [
      '일상 대화 중 한 번, 부담 없는 톤으로',
      '"최근 네 삶에서 중요하게 된 거 있어?" 류',
      '답변 반응·깊이 관찰',
      '바로 되물어보지 말고 여운',
    ],
    timing: '편안한 분위기 확보 후',
    successSignals: ['구체 사례 공유', '되물음'],
    failSignals: ['추상적 좋은 말만', '화제 전환'],
    risks: ['이른 단계엔 무거운 사람 이미지'],
  },
  {
    id: 'first.date_propose',
    triggers: { stage: ['first_contact', 'sseom'], goal: ['escalate_to_meet'] },
    title: '구체 제안 · 낮은 부담',
    rationale: '모호한 "언제 보자" 말고 일시·장소·이유 1세트.',
    steps: [
      '평일 저녁 or 주말 낮, 2시간 블록',
      '카페·식사 1차만 제시 (2차 없음)',
      '"~해서 그 근처 지나는데" 식 자연스러운 계기',
      '거절당해도 1회만 재제안',
    ],
    timing: '첫 연락 3~7일 내',
    messageDraftHint: '시간·장소·짧은 이유',
    successSignals: ['시간 제안', '대안 역제안'],
    failSignals: ['"언젠가"', '핑계 반복'],
    risks: ['너무 빠르면 부담'],
  },
  {
    id: 'first.brake_overpace',
    triggers: { stage: ['first_contact'], goal: ['create_distance'] },
    title: '초기 과속 브레이크',
    rationale: '첫 일주일에 매일 장문 주고받으면 빨리 식음.',
    steps: [
      '답장 간격 의도적으로 2~4배 늘리기',
      '문장 길이 절반으로',
      '이모지 빈도 감소',
      '본인 일상 언급으로 "일상 있는 사람" 포지셔닝',
    ],
    timing: '과몰입 감지 즉시',
    successSignals: ['상대가 먼저 물음', '만남 제안'],
    failSignals: ['상대도 똑같이 식음', '증발'],
    risks: ['무관심으로 오해'],
  },

  // ───────────────── sseom ─────────────────
  {
    id: 'sseom.maintain_pull',
    triggers: { stage: ['sseom'], goal: ['build_interest', 'build_chemistry'] },
    title: '여백 · 궁금증 남기기',
    rationale: '썸의 핵심은 "다음"을 궁금하게 만드는 것.',
    steps: [
      '본인 이야기 70%만 공개, 30% 나중에',
      '질문에 곧장 답 말고 한 템포 쉬기',
      '대화 끝에 작은 미해결 남기기 (내일로 이어지는 훅)',
      '스크롤 가득 장문 금지',
    ],
    timing: '일상',
    successSignals: ['먼저 연락 빈도 증가', '다음 만남 제안'],
    failSignals: ['대화 짧아짐', '안 물어봄'],
    risks: ['과도하면 관심 없어 보임'],
  },
  {
    id: 'sseom.late_night_depth',
    triggers: { stage: ['sseom'], goal: ['build_chemistry'], style: ['magnetic', 'intellectual'] },
    title: '늦은 밤 깊은 질문',
    rationale: '밤 시간 + 개인 질문 = 친밀·긴장 동시 가동.',
    steps: [
      '22시 이후, 상대가 여유 있는 타이밍',
      '개방형 질문 1개 (경험·감정·기억)',
      '진지하게 듣고 짧게 반응',
      '조언·판단 금지',
    ],
    timing: '밤 22:00~24:00',
    successSignals: ['긴 답장', '본인도 비슷한 질문 되돌림'],
    failSignals: ['회피성 답', '화제 전환'],
    risks: ['이른 단계엔 무거움'],
  },
  {
    id: 'sseom.next_date_lock',
    triggers: { stage: ['sseom'], goal: ['escalate_to_meet'] },
    title: '다음 약속 바로 잡기',
    rationale: '헤어질 때 "다음엔 뭐하자" 낚시 걸어두면 모멘텀 유지.',
    steps: [
      '이번 만남 말미 or 24h 내',
      '이번에 못 간 곳·해본 얘기와 엮기',
      '구체 일시 1개 제시',
      '상대 불가면 대안 1개 준비',
    ],
    timing: '만남 직후 24h',
    successSignals: ['날짜 확정', '장소 역제안'],
    failSignals: ['"연락하자"만', '3일 침묵'],
    risks: ['너무 매달리는 느낌'],
  },
  {
    id: 'sseom.first_physical',
    triggers: { stage: ['sseom'], goal: ['escalate_physical'] },
    title: '첫 스킨십 · 단계 존중',
    rationale: '상호 동의·점진 원칙. 과속 = 회수 불가 피해.',
    steps: [
      '자연스러운 상황 (헤어질 때, 좁은 공간)',
      '손 잡기 → 반응 확인 → 다음 단계',
      '거부 신호면 즉시 멈추고 화제 전환',
      '다음 만남에 재시도 여지',
    ],
    timing: '3~5회 만남 후',
    successSignals: ['상대가 거리 안 벌림', '눈 마주침·웃음'],
    failSignals: ['몸 굳음', '거리 벌림', '무반응'],
    risks: ['너무 빠르면 관계 파탄'],
  },
  {
    id: 'sseom.fade_three_days',
    triggers: { stage: ['sseom'], goal: ['create_distance'] },
    title: '3일 사라지기',
    rationale: '과도한 접촉 → 희소성 급락. 3일 침묵으로 리셋.',
    steps: [
      '읽씹 아닌 "바쁜 척" 자연스럽게',
      '3일간 먼저 연락·SNS 반응 0',
      '4일째 짧고 밝게 재접촉',
      '변명·사과 없이 그냥 이어감',
    ],
    timing: '상대가 식은 느낌 감지 시',
    successSignals: ['상대가 먼저 찾음', '만남 제안'],
    failSignals: ['아예 연락 없음', '상대도 식음'],
    risks: ['완전 잠수처럼 보일 위험'],
  },
  {
    id: 'sseom.intent_probe',
    triggers: { stage: ['sseom'], goal: ['clarify_intent'] },
    title: '관계 정의 우회 질문',
    rationale: '"우리 뭐야" 대신 상대 의도 간접 노출.',
    steps: [
      '상대 과거 연애 얘기 자연스럽게',
      '"보통 어느 시점에 확정해?" 류 질문',
      '답변 톤 · 회피성 관찰',
      '본인 기준도 살짝 공유',
    ],
    timing: '편한 대화 중',
    successSignals: ['구체 답', '되물음'],
    failSignals: ['얼버무림', '화제 전환'],
    risks: ['너무 직구면 부담'],
  },
  {
    id: 'sseom.hype_test',
    triggers: { stage: ['sseom'], goal: ['qualify'] },
    title: '허세 필터',
    rationale: '비용 드는 디테일 하나 요구해 진심도 체크.',
    steps: [
      '구체적 약속 하나 (날짜·장소·시간 정확히)',
      '약속 지키는지 관찰',
      '미루거나 변경 잦으면 신호',
      '판단 후에도 한 번 더 기회',
    ],
    timing: '3~4회 만남 시점',
    successSignals: ['약속 그대로 이행', '시간 존중'],
    failSignals: ['반복 미루기', '마지막 분 취소'],
    risks: ['일회성 사정일 수 있음'],
  },
  {
    id: 'sseom.soft_exit',
    triggers: { stage: ['sseom'], goal: ['graceful_exit'] },
    title: '썸 소프트 종료',
    rationale: '밀고 당기다 애매한 상황이면 정리.',
    steps: [
      '마지막 만남 한 번, 톤 평소처럼',
      '그 후 연락 빈도 점진 감소',
      '직접 "끝" 선언 없이 자연 페이드',
      '혹시 상대가 물으면 솔직하되 짧게',
    ],
    timing: '2~4주 침묵',
    successSignals: ['상대도 자연 페이드'],
    failSignals: ['상대가 계속 찾음', '감정 상함'],
    risks: ['모호함이 상대를 더 상하게'],
  },

  // ───────────────── dating_early ─────────────────
  {
    id: 'earlydate.build_shared',
    triggers: { stage: ['dating_early'], goal: ['deepen_commitment'] },
    title: '공유 세계 시작',
    rationale: '초반에 "우리만의 것" 하나 만들면 결합도 급증.',
    steps: [
      '같이 하는 작은 루틴 1개 제안 (드라마·운동·요리)',
      '첫 여행 or 각자 친구 소개',
      '서로의 일상에 하루 5분 관심 (구체 질문)',
      '미래 작은 계획 하나 (다음달 뭐)',
    ],
    timing: '1~3개월 차',
    successSignals: ['루틴 유지', '상대도 제안'],
    failSignals: ['참여 안 함', '귀찮아함'],
    risks: ['너무 빨리 "우리"면 숨 막힘'],
  },
  {
    id: 'earlydate.repair_quick',
    triggers: { stage: ['dating_early'], goal: ['repair'] },
    title: '초기 갈등 즉시 봉합',
    rationale: '첫 2~3 싸움이 관계 패턴 고정. 빨리 풀면 회복 빠름.',
    steps: [
      '24h 내 먼저 연락 (감정 식힌 후)',
      '책임 인정 → 변명 0',
      '상대 감정 먼저 듣기',
      '구체 재발 방지 1개 제시',
    ],
    timing: '싸운 당일 ~ 다음날',
    messageDraftHint: '짧게. "어제 내가 ~한 게 상처였을 것 같아"',
    successSignals: ['상대가 먼저 화해 제안', '스킨십 회복'],
    failSignals: ['냉전 3일+', '반복'],
    risks: ['너무 빨리 덮으면 근본 안 풀림'],
  },
  {
    id: 'earlydate.physical_pacing',
    triggers: { stage: ['dating_early'], goal: ['escalate_physical'] },
    title: '진도 상호 체크',
    rationale: '각자 속도 다름. 대화로 맞춰가는 게 장기적으로 안전.',
    steps: [
      '편안한 순간 "우리 속도 괜찮아?" 한 번',
      '상대 선호 공간 (침대 vs 거실) 존중',
      '피임·안전 대화 적어도 1회',
      '상대 거부 시 3주간 안 꺼냄',
    ],
    timing: '친밀 전환점',
    successSignals: ['명확한 "좋아"', '상호 주도'],
    failSignals: ['말 안 함', '회피'],
    risks: ['대화 자체가 긴장 유발'],
  },

  // ───────────────── dating_stable ─────────────────
  {
    id: 'stable.future_talk',
    triggers: { stage: ['dating_stable'], goal: ['deepen_commitment'] },
    title: '미래 대화',
    rationale: '안정기 = 다음 단계 합의 안 되면 정체.',
    steps: [
      '편한 자리 (여행·산책 등)',
      '1~3년 시야 공유 (집·일·가족)',
      '공통 가능한 경로 1개 그려보기',
      '차이점 발견 시 즉시 해결 말고 메모',
    ],
    timing: '6개월~1년',
    successSignals: ['상대도 미래 언급', '현실 계획'],
    failSignals: ['회피·농담만', '미루기'],
    risks: ['이른 시점이면 부담'],
  },
  {
    id: 'stable.surprise_date',
    triggers: { stage: ['dating_stable'], goal: ['build_chemistry'] },
    title: '루틴 파괴 데이트',
    rationale: '반복이 권태. 평소 안 하는 활동 1회.',
    steps: [
      '상대 취향이지만 아직 안 해본 것',
      '짧게 (2~3시간)',
      '서프라이즈 30%, 협의 70%',
      '후기 공유로 기억 강화',
    ],
    timing: '월 1회',
    successSignals: ['웃음 늘어남', '사진 먼저 찍자'],
    failSignals: ['시큰둥', '피곤해함'],
    risks: ['상대 에너지 안 맞으면 역효과'],
  },
  {
    id: 'stable.meta_repair',
    triggers: { stage: ['dating_stable'], goal: ['repair'] },
    title: '반복 갈등 메타 대화',
    rationale: '같은 주제로 3번 이상 싸우면 표면이 아닌 구조 문제.',
    steps: [
      '싸움 직후 말고 평온한 시간',
      '"우리 이 주제 계속 반복이야" 관찰 공유',
      '각자 진짜 두려움·원하는 것 명명',
      '행동 변화 1~2개 합의',
    ],
    timing: '3번째 반복 후',
    successSignals: ['상대도 구조 인정', '빈도 감소'],
    failSignals: ['또 표면만', '역공'],
    risks: ['심층 열면 이별 결정 될 수도'],
  },
  {
    id: 'stable.space_restore',
    triggers: { stage: ['dating_stable'], goal: ['create_distance'] },
    title: '혼자 시간 복구',
    rationale: '과공생 → 흥미 감소. 개인 영역 재건.',
    steps: [
      '주 1회 혼자 시간 확보 (상대에게 알림)',
      '그 시간은 완전히 본인 것',
      '상대도 혼자 시간 갖도록 권장',
      '만날 때 업데이트 공유 → 신선함',
    ],
    timing: '지속',
    successSignals: ['만남 밀도 상승', '감사 표현 증가'],
    failSignals: ['상대 불안·의심'],
    risks: ['불안형엔 방치로 오해'],
  },

  // ───────────────── conflict ─────────────────
  {
    id: 'conflict.sincere_apology',
    triggers: { stage: ['conflict'], goal: ['repair'] },
    title: '진심 사과 스크립트',
    rationale: '사과 구조: 행동 지목 → 상대 영향 인정 → 변화 약속.',
    steps: [
      '"내가 ~했다"고 구체 행동 인정 (변명 X)',
      '"그게 너에게 ~하게 느껴졌을 것 같다"',
      '"앞으로 ~하려고 한다"',
      '상대 답 기다림, 재촉 금지',
    ],
    timing: '감정 식은 12~48h 후',
    messageDraftHint: '문자보다 대면. 불가능하면 긴 문자.',
    successSignals: ['상대가 말함', '스킨십 회복'],
    failSignals: ['냉전 유지', '"됐어" 차단'],
    risks: ['변화 안 지키면 다음엔 통 안 함'],
  },
  {
    id: 'conflict.cool_three_days',
    triggers: { stage: ['conflict'], goal: ['repair'] },
    title: '3일 냉각 후 재접촉',
    rationale: '즉시 사과하면 말 쏟아냄 → 더 싸움. 식힌 후 구조적 대화.',
    steps: [
      '3일간 연락 최소화 (생존 신호만)',
      'SNS·감정 글 금지',
      '4일째 짧고 차분한 재접촉',
      '만남 제안 (대화 아님, 같이 있기)',
    ],
    timing: '큰 싸움 직후',
    successSignals: ['상대도 차분해짐', '만남 동의'],
    failSignals: ['상대가 먼저 끝낼 것 같은 신호'],
    risks: ['상대가 그 사이 마음 정리해서 끝내기로 결정'],
  },
  {
    id: 'conflict.evaluate_exit',
    triggers: { stage: ['conflict'], goal: ['graceful_exit'] },
    title: '계속할지 판단 대화',
    rationale: '반복 갈등 + 구조적 미스매치면 정리 타이밍.',
    steps: [
      '혼자 1주 질문: 이 관계에서 내가 더 나아지고 있나?',
      '딜브레이커 근접도 체크',
      '상대에게 "계속 갈 수 있을지 확신 안 서" 직설',
      '1~2주 각자 생각 후 재논의',
    ],
    timing: '3~5회 반복 갈등 후',
    successSignals: ['상대도 같은 생각', '둘 다 회피 안 함'],
    failSignals: ['한쪽만 끝내려 함', '질질 끌림'],
    risks: ['말하는 순간 회복 어려움'],
  },

  // ───────────────── reconnection ─────────────────
  {
    id: 'recon.why_now',
    triggers: { stage: ['reconnection'], goal: ['clarify_intent'] },
    title: '왜 지금 · 진심 체크',
    rationale: '재연락에는 이유 있음. 외로움·습관·진짜 변화 구분.',
    steps: [
      '짧고 중립적 답장으로 시작',
      '2~3번 대화 후 "지금 왜 연락했어?" 직접',
      '구체적 변화 언급 유무 관찰',
      '결정은 3~4주 후',
    ],
    timing: '첫 재접촉 2주 내',
    successSignals: ['구체 이유·반성', '부담 없는 제안'],
    failSignals: ['모호한 "그냥 생각나서"', '급진전 요구'],
    risks: ['상대 감정 조종 의도 있을 수 있음'],
  },
  {
    id: 'recon.change_verify',
    triggers: { stage: ['reconnection'], goal: ['qualify'] },
    title: '변화 검증',
    rationale: '"나 바뀌었어" 말보다 행동으로 증명.',
    steps: [
      '과거 문제였던 상황 재현 (가벼운 버전)',
      '반응 관찰 (같은 패턴? 다른 패턴?)',
      '이별 원인 직접 논의',
      '3~4회 만남 후 판단',
    ],
    timing: '재연락 후 1~2개월',
    successSignals: ['구체 다른 반응', '책임 인정'],
    failSignals: ['같은 패턴 반복', '감정적 방어'],
    risks: ['가설 검증 중 감정 재점화'],
  },
  {
    id: 'recon.clean_closure',
    triggers: { stage: ['reconnection'], goal: ['graceful_exit'] },
    title: '다시 끊기',
    rationale: '한 번 더 확인하고 안 되면 단호하게.',
    steps: [
      '대화로 끝냈던 이유 확인',
      '"다시 시도 안 하는 게 맞겠다" 명확히',
      'SNS·공통 지인 접점 점진 축소',
      '3개월 완전 연락 차단',
    ],
    timing: '재연락 실패 확정 시',
    successSignals: ['두 번째 이별 상호 합의', '미련 감소'],
    failSignals: ['계속 연락 옴', '미련 지속'],
    risks: ['재차단이 더 큰 상처'],
  },
]

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────

export function findPlays(params: {
  stage?: StageKey | string | null
  goal?: GoalKey | string | null
  style?: StyleKey | string | null
}): Play[] {
  return PLAYS.filter((p) => {
    if (params.stage && !p.triggers.stage.includes(params.stage as StageKey))
      return false
    if (params.goal && !p.triggers.goal.includes(params.goal as GoalKey)) return false
    if (params.style && p.triggers.style && !p.triggers.style.includes(params.style as StyleKey))
      return false
    return true
  })
}

/** LLM 프롬프트에 카탈로그 섹션으로 주입할 markdown 생성. */
export function playsPromptBlock(plays: Play[]): string {
  if (plays.length === 0) return ''
  const lines: string[] = []
  lines.push('## [가이드 카탈로그 — 이 조합의 전형 plays]')
  lines.push('이 중 2~3 개를 고르거나 병합하고, 현재 Event·상대 프로파일·스타일에 맞게 구체화.')
  lines.push('카탈로그에 없는 훌륭한 안이 있으면 새로 써도 됨. 원래 출력 포맷(전략 A/B/C) 유지.')
  lines.push('')
  for (const p of plays) {
    lines.push(`### ${p.title} (id: ${p.id})`)
    lines.push(`- 근거: ${p.rationale}`)
    lines.push(`- 실행:`)
    for (const s of p.steps) lines.push(`  - ${s}`)
    lines.push(`- 타이밍: ${p.timing}`)
    if (p.messageDraftHint) lines.push(`- 메시지 힌트: ${p.messageDraftHint}`)
    lines.push(`- 성공: ${p.successSignals.join(' · ')}`)
    lines.push(`- 실패: ${p.failSignals.join(' · ')}`)
    lines.push(`- 리스크: ${p.risks.join(' · ')}`)
    lines.push('')
  }
  return lines.join('\n')
}

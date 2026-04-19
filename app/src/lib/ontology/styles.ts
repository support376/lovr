/**
 * 대화 스타일 온톨로지 — 7종. Relationship.style 값으로 저장.
 * LLM 프롬프트에 스타일별 가이드(핵심/언어/쓸때/실패모드)가 주입된다.
 */

export type StyleKey =
  | 'playful'
  | 'magnetic'
  | 'grounded'
  | 'intellectual'
  | 'protective'
  | 'mysterious'
  | 'vulnerable'

export const STYLES: Record<
  StyleKey,
  {
    ko: string
    tagline: string
    core: string
    language: string
    useWhen: string
    failMode: string
  }
> = {
  playful: {
    ko: '장난꾸러기',
    tagline: 'playful — 긴장 풀기, 유머',
    core: '긴장 풀기, 유머로 장벽 넘기',
    language: '드립·말장난·가벼운 놀림·이모티콘 적극',
    useWhen: '초반 단계 · 썸 · 갈등 후 긴장 풀기',
    failMode: '진지한 순간에 쓰면 가벼워 보임',
  },
  magnetic: {
    ko: '자석',
    tagline: 'magnetic — 성적 긴장, 여백',
    core: '성적 긴장 · 여백 · 암시',
    language: '짧고 낮은 톤 · 직접 말 안 함 · 상상 여지',
    useWhen: '케미 빌드업 · 스킨십 진도 · 늦은 밤 대화',
    failMode: '이른 단계에 쓰면 부담스러움',
  },
  grounded: {
    ko: '안정감',
    tagline: 'grounded — 신뢰, 책임감',
    core: '신뢰 · 성숙 · 책임감',
    language: '명확 · 간결 · 약속 지키는 톤 · 이모티콘 적게',
    useWhen: '진지한 관계 단계 · 갈등 회복 · 미래 얘기',
    failMode: '초기 단계엔 재미없어 보임',
  },
  intellectual: {
    ko: '사유',
    tagline: 'intellectual — 깊이, 독특한 시각',
    core: '깊이 있는 관찰 · 독특한 시각',
    language: '예상 밖의 질문 · 은유 · 흥미로운 관점 제시',
    useWhen: '퀄리파이 (진지한 상대 검증) · 지적 매력 강점일 때',
    failMode: '상대가 지적 자극 안 좋아하면 잘난척으로 읽힘',
  },
  protective: {
    ko: '보호본능',
    tagline: 'protective — 챙김, 든든함',
    core: '챙김 · 돌봄 · 든든함',
    language: '"밥 먹었어" · "데려다 줄게" 류의 구체적 행동 제시',
    useWhen: '상대가 지친 날 · 안정감 축적 · 여성 상대 다수 선호',
    failMode: '과도하면 간섭/통제로 읽힘',
  },
  mysterious: {
    ko: '여백',
    tagline: 'mysterious — 정보 통제, 예측 불가',
    core: '정보 통제 · 예측 불가',
    language: '답 늦추기 · 일부만 말하기 · 상대가 질문하게 만들기',
    useWhen: '희소성 만들기 · 흥미 되살리기 · 밀당',
    failMode: '잘못 쓰면 무관심·무례로 읽힘',
  },
  vulnerable: {
    ko: '취약성',
    tagline: 'vulnerable — 진솔함, 약점 공개',
    core: '진솔함 · 약점 공개로 친밀감 구축',
    language: '"사실 나 이게 어려워" · "오늘은 별로였어" 류의 자기 개방',
    useWhen: '관계 심화 · 갈등 회복 · 상대가 마음 연 순간',
    failMode: '초반이나 퀄리파이 덜 된 상대한텐 약점으로 활용당함',
  },
}

export const STYLE_ORDER: StyleKey[] = [
  'playful',
  'magnetic',
  'grounded',
  'intellectual',
  'protective',
  'mysterious',
  'vulnerable',
]

/**
 * Action.content (markdown) → 추천 행동 1/2/3 카드 단위 파싱.
 *
 * 기대 포맷:
 *   ## 지금 상황
 *   [2~3문장]
 *
 *   ## 지금 할 행동
 *   ### 1. [명령조 제목]
 *   **근거**: ...
 *   **왜**: ...
 *   **메시지 초안**: "..."
 *   **타이밍**: ...
 *
 *   ### 2. ...
 *   ### 3. ...
 *
 * 구 포맷 ("### 전략 A: ...")도 호환 유지.
 */

export type ParsedStrategy = {
  label: string // "1" / "2" / "3" (구버전은 "A"/"B"/"C")
  title: string
  rationale?: string
  why?: string
  messageDraft?: string
  timing?: string
  // 구 버전 호환
  steps?: string[]
  successSignals?: string
  failSignals?: string
  risks?: string
}

export type ParsedStrategyBundle = {
  situation?: string
  strategies: ParsedStrategy[]
}

export function parseStrategies(markdown: string): ParsedStrategy[] {
  return parseStrategyBundle(markdown).strategies
}

export function parseStrategyBundle(markdown: string): ParsedStrategyBundle {
  if (!markdown) return { strategies: [] }

  const situation = extractSection(markdown, ['지금 상황', '상황 해석', '상황'])

  // 1. 신포맷 — "### 1. 제목" / "### 2. 제목"
  const numRe = /^###\s+(\d+)\.\s*(.+)$/gm
  const numMatches = Array.from(markdown.matchAll(numRe))

  if (numMatches.length > 0) {
    const strategies: ParsedStrategy[] = []
    for (let i = 0; i < numMatches.length; i++) {
      const m = numMatches[i]
      const label = m[1].trim()
      const title = m[2].trim()
      const start = (m.index ?? 0) + m[0].length
      const end = i + 1 < numMatches.length ? numMatches[i + 1].index ?? markdown.length : markdown.length
      const body = markdown.slice(start, end)
      strategies.push(buildFromBody(label, title, body))
    }
    return { situation, strategies }
  }

  // 2. 구포맷 — "### 전략 A: 제목"
  const oldRe = /^###\s+전략\s+([A-Z가-힣0-9]+)\s*[:·-]\s*(.+)$/gm
  const oldMatches = Array.from(markdown.matchAll(oldRe))
  if (oldMatches.length > 0) {
    const strategies: ParsedStrategy[] = []
    for (let i = 0; i < oldMatches.length; i++) {
      const m = oldMatches[i]
      const label = m[1].trim()
      const title = m[2].trim()
      const start = (m.index ?? 0) + m[0].length
      const end = i + 1 < oldMatches.length ? oldMatches[i + 1].index ?? markdown.length : markdown.length
      const body = markdown.slice(start, end)
      // "## 고려했으나 제외한 안" 이후 잘라내기
      const cutoff = body.search(/^##\s+고려/m)
      const section = cutoff >= 0 ? body.slice(0, cutoff) : body
      strategies.push({
        label,
        title,
        rationale: extractField(section, ['근거', '왜']),
        steps: extractSteps(section),
        timing: extractField(section, ['타이밍', '언제']),
        successSignals: extractField(section, ['성공 신호', '성공']),
        failSignals: extractField(section, ['실패 신호', '실패']),
        risks: extractField(section, ['리스크', '위험']),
        messageDraft: extractField(section, ['메시지 초안', '메시지', '초안']),
      })
    }
    return { situation, strategies }
  }

  return { situation, strategies: [] }
}

function buildFromBody(label: string, title: string, body: string): ParsedStrategy {
  return {
    label,
    title,
    rationale: extractField(body, ['근거', '기반']),
    why: extractField(body, ['왜', '이유', '작동']),
    messageDraft: extractField(body, ['메시지 초안', '메시지', '초안']),
    timing: extractField(body, ['타이밍', '언제']),
  }
}

function extractField(section: string, keys: string[]): string | undefined {
  for (const key of keys) {
    // **근거**: ... / - 근거: ... / 근거: ... 다음 필드 헤더 또는 section 끝까지
    const re = new RegExp(
      `(?:^|\\n)[\\s\\-*]*\\*{0,2}${key}\\*{0,2}\\s*[:：]\\s*([\\s\\S]*?)(?=\\n\\s*[\\-*]?\\s*\\*{0,2}(?:근거|왜|이유|메시지|타이밍|언제|성공|실패|리스크|위험|기반|작동|초안)\\*{0,2}\\s*[:：]|\\n\\s*###\\s|\\n\\s*##\\s|$)`,
      'i'
    )
    const match = section.match(re)
    if (match) {
      const v = match[1].replace(/^\s*["“]/, '').replace(/["”]\s*$/, '').trim()
      if (v.length > 0) return v
    }
  }
  return undefined
}

function extractSteps(section: string): string[] {
  const procMatch = section.match(
    /^[-\s]*\*?\*?(?:실행(?:\s*절차)?|절차|단계|steps?)\*?\*?\s*[:：]?\s*([\s\S]*?)(?=^\s*[-*]\s+(?:타이밍|성공|실패|리스크|메시지|근거)|^##|\Z)/im
  )
  if (!procMatch) return []
  return procMatch[1]
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[\d]+\.\s+/, '').replace(/^[-*]\s+/, ''))
    .filter((l) => l.length > 0 && l.length < 200)
}

function extractSection(markdown: string, names: string[]): string | undefined {
  for (const name of names) {
    const re = new RegExp(`^##\\s+${name}\\s*\\n([\\s\\S]*?)(?=^##\\s|\\Z)`, 'm')
    const match = markdown.match(re)
    if (match) {
      const v = match[1].trim()
      if (v.length > 0) return v
    }
  }
  return undefined
}

/**
 * 파싱 실패 시 fallback — markdown 원문에서 첫 문장만 간단히.
 */
export function fallbackSummary(markdown: string, maxLen = 200): string {
  const cleaned = markdown.replace(/^#+\s+/gm, '').replace(/\*\*/g, '').trim()
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '…' : cleaned
}

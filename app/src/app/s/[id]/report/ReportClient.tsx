'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { generateWeeklyReportAction } from '@/lib/actions/coach'
import { saveInsightsFromReportAction } from '@/lib/actions/insights'

export function ReportClient({ relationshipId }: { relationshipId: string }) {
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState<number | null>(null)
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const generate = () => {
    setErr(null)
    setMarkdown(null)
    setSavedCount(null)
    start(async () => {
      try {
        const r = await generateWeeklyReportAction(relationshipId)
        setMarkdown(r.markdown)
        // Insight 자동 추출 + 저장
        const saved = await saveInsightsFromReportAction({
          relationshipId,
          reportMarkdown: r.markdown,
        })
        setSavedCount(saved.count)
        router.refresh()
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  return (
    <>
      {!markdown && (
        <Card>
          <div className="text-xs text-muted leading-relaxed mb-3">
            지난 7일의 Event·Action·Outcome을 모아 LLM에 던져 리포트 생성. Insight 섹션은
            자동 파싱되어 `insights` 테이블에 저장돼 다음 전략 제안 때 재사용.
          </div>
          <Button onClick={generate} disabled={pending} className="w-full">
            {pending ? '생성 중 (30~60초)…' : '이번 주 리포트 생성'}
          </Button>
          {err && (
            <div className="mt-2 text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-2">
              {err}
            </div>
          )}
        </Card>
      )}

      {markdown && (
        <Card>
          {savedCount != null && (
            <div className="mb-3 text-xs text-good bg-good/10 border border-good/30 rounded-lg p-2">
              ✅ 저장됨 · 신규 Insight {savedCount}건 추출.
            </div>
          )}
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{markdown}</div>
          <div className="mt-4 flex gap-2">
            <Button onClick={generate} variant="secondary" className="flex-1">
              다시 생성
            </Button>
          </div>
        </Card>
      )}
    </>
  )
}

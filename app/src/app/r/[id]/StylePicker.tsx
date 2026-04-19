'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui'
import { updateRelationship } from '@/lib/actions/relationships'
import { STYLES, STYLE_ORDER, type StyleKey } from '@/lib/ontology'

export function StylePicker({
  relationshipId,
  current,
}: {
  relationshipId: string
  current: string | null
}) {
  const [value, setValue] = useState<string>(current ?? '')
  const [pending, start] = useTransition()
  const router = useRouter()

  const onChange = (v: string) => {
    setValue(v)
    start(async () => {
      await updateRelationship(relationshipId, { style: v || null } as never)
      router.refresh()
    })
  }

  const currentStyle = value && STYLES[value as StyleKey]

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-muted uppercase tracking-wider">
          🎨 스타일
        </div>
        {pending && <span className="text-[10px] text-muted">저장…</span>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-surface-2 border border-border px-3 py-2.5 text-sm outline-none focus:border-accent"
      >
        <option value="">자동 (AI가 선택)</option>
        {STYLE_ORDER.map((k) => (
          <option key={k} value={k}>
            {STYLES[k].ko} · {STYLES[k].core}
          </option>
        ))}
      </select>
      {currentStyle && (
        <div className="mt-2 text-[11px] text-muted leading-relaxed">
          <span className="text-accent">{currentStyle.tagline}</span>
          <br />
          언어: {currentStyle.language}
        </div>
      )}
    </Card>
  )
}

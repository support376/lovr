'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { ParsedStrategy } from '@/lib/strategies/parse'

/**
 * 보조 안(2, 3번 액션) — 기본 접힘. 타이밍 + 타이틀만 노출.
 * 탭하면 전체 펼침.
 */
export function SecondaryStrategyCard({ s }: { s: ParsedStrategy }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-border bg-surface/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-3 py-2.5 flex items-center gap-2"
      >
        <div className="flex-1 min-w-0">
          {s.timing && (
            <div className="text-[10px] text-muted leading-none mb-0.5">
              {s.timing}
            </div>
          )}
          <div className="text-sm font-medium truncate">{s.title}</div>
        </div>
        <ChevronRight
          size={16}
          className={`text-muted transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0 flex flex-col gap-2 text-xs leading-relaxed">
          {(s.rationale || s.why) && (
            <div className="text-muted whitespace-pre-wrap">
              {[s.rationale, s.why].filter(Boolean).join('\n\n')}
            </div>
          )}
          {s.messageDraft && (
            <div className="rounded-md bg-surface-2 border border-border p-2.5">
              <div className="text-[10px] text-accent mb-1 uppercase">메시지</div>
              <div className="whitespace-pre-wrap text-text">
                {s.messageDraft}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

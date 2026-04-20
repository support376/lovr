'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { ParsedStrategy } from '@/lib/strategies/parse'

/**
 * 보조 안 — 기본 접힘. 타이밍 + 타이틀만 한 줄.
 * 탭하면 full 펼침 (근거/메시지).
 */
export function SecondaryStrategyCard({ s }: { s: ParsedStrategy }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-border bg-surface/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-3.5 py-3 flex items-center gap-2"
      >
        <div className="flex-1 min-w-0">
          {s.timing && (
            <div className="text-[10px] text-muted leading-none mb-0.5">
              {s.timing}
            </div>
          )}
          <div className="text-sm font-bold truncate">{s.title}</div>
        </div>
        <ChevronRight
          size={16}
          className={`text-muted transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && (
        <div className="px-3.5 pb-3 pt-0 flex flex-col gap-2 text-xs leading-relaxed border-t border-border mt-1">
          {(s.rationale || s.why) && (
            <div className="text-muted whitespace-pre-wrap pt-2">
              {[s.rationale, s.why].filter(Boolean).join('\n\n')}
            </div>
          )}
          {s.messageDraft && (
            <div className="rounded-md bg-surface-2 border border-border p-2.5">
              <div className="text-[10px] text-accent mb-1 uppercase">메시지</div>
              <div className="whitespace-pre-wrap">{s.messageDraft}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

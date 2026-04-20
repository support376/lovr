'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui'
import { SelfForm } from '@/app/me/SelfForm'
import type { Actor } from '@/lib/db/schema'

/**
 * Self 프로필 카드 — summary 항상 보이고 탭 → 전체 폼.
 * SelfForm 은 /me 에서 재사용.
 */
export function SelfSummaryPanel({ self }: { self: Actor }) {
  const [open, setOpen] = useState(false)

  const constraints = self.knownConstraints ?? []
  const dealBreakers = self.dealBreakers ?? []

  return (
    <Card>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[10px] text-muted uppercase tracking-wider">
            나
          </span>
          <span className="text-base font-bold">{self.displayName}</span>
          {self.age && (
            <span className="text-sm text-muted font-medium">{self.age}</span>
          )}
          {self.mbti && (
            <span className="text-[11px] font-mono text-accent bg-accent/10 rounded px-1.5 py-0.5">
              {self.mbti}
            </span>
          )}
          {self.occupation && (
            <span className="text-[11px] text-muted">· {self.occupation}</span>
          )}
        </div>

        {(self.rawNotes || dealBreakers.length > 0 || constraints.length > 0) && (
          <div className="flex flex-col gap-0.5 text-[11px] text-muted leading-relaxed">
            {self.rawNotes && (
              <div className="whitespace-pre-wrap line-clamp-3">
                💭 {self.rawNotes}
              </div>
            )}
            {dealBreakers.length > 0 && (
              <div className="text-bad/80">🚫 {dealBreakers.join(' · ')}</div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] text-accent hover:underline"
        >
          {open ? '접기 ▲' : '편집 ▼'}
        </button>
        <Link
          href="/me/quiz"
          className="text-[11px] text-muted hover:text-accent"
        >
          ✨ 자기 설문
        </Link>
      </div>

      {open && (
        <div className="mt-3 border-t border-border pt-3">
          <SelfForm initial={self} />
        </div>
      )}
    </Card>
  )
}

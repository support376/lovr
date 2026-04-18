import Link from 'next/link'
import { Card, Pill } from './ui'
import type { Self } from '@/lib/db/schema'

export function SelfSummaryCard({ self }: { self: Self }) {
  const p = self.psychProfile
  const hasProfile = !!p?.summary

  return (
    <Link href="/me">
      <Card className="hover:border-accent/60 transition-colors">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted uppercase tracking-wider">나</div>
          <span className="text-[11px] text-muted">→ 상세</span>
        </div>
        {hasProfile ? (
          <>
            <div className="mt-2 text-sm leading-relaxed line-clamp-2">
              {p.summary}
            </div>
            {(p.strengths?.length ?? 0) > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {p.strengths!.slice(0, 3).map((s, i) => (
                  <Pill key={i} tone="good">
                    {s}
                  </Pill>
                ))}
                {p.strengths!.length > 3 && (
                  <Pill tone="neutral">+{p.strengths!.length - 3}</Pill>
                )}
              </div>
            )}
            {(p.playbook?.length ?? 0) > 0 && (
              <div className="mt-2 text-[11px] text-accent">
                ⚡ Playbook {p.playbook!.length}건 집계됨
              </div>
            )}
          </>
        ) : (
          <div className="mt-2 text-sm text-muted">
            프로파일링 대기 중 — "나" 탭에서 재분석 돌려줘
          </div>
        )}
      </Card>
    </Link>
  )
}

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Zap, RefreshCw } from 'lucide-react'
import { getSelf } from '@/lib/actions/self'
import { getRelationship } from '@/lib/actions/relationships'
import { Card } from '@/components/ui'
import { PartnerInlineEditor } from './PartnerInlineEditor'
import { DeriveStateButton } from './DeriveStateButton'
import type { InferredTrait } from '@/lib/db/schema'

/**
 * 관계 탭 상세 — 프로필 + AI 추출 분석 전용. 전략은 /s/[id] 로 분리.
 */

const PROGRESS_KO: Record<string, string> = {
  unknown: '판단 불가',
  observing: '관찰 중',
  approaching: '다가가는 중',
  exploring: '서로 탐색',
  exclusive: '독점 직전',
  committed: '공식 연인',
  decayed: '식어감',
  ended: '종료',
  pre_match: '매칭 전',
  first_contact: '첫 접촉',
  sseom: '썸',
  dating_early: '연애 초기',
  dating_stable: '연애 안정',
  conflict: '갈등',
  reconnection: '재연결',
}

export default async function RelationshipProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  const { id } = await params
  const rel = await getRelationship(id)
  if (!rel) notFound()

  const partnerTraits: InferredTrait[] = rel.partner.inferredTraits ?? []
  const selfTraits: InferredTrait[] = self.inferredTraits ?? []

  const dynamicsItems = [
    { k: '힘의 균형', v: rel.powerBalance },
    { k: '연락 패턴', v: rel.communicationPattern },
    { k: '투자 비대칭', v: rel.investmentAsymmetry },
    { k: '심화 속도', v: rel.escalationSpeed },
  ].filter((d) => d.v)

  return (
    <>
      <header className="px-5 pt-4 pb-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">
            {rel.partner.displayName}
            {rel.partner.age ? (
              <span className="text-muted font-normal text-lg ml-1">
                ({rel.partner.age})
              </span>
            ) : null}
          </h1>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
              {PROGRESS_KO[rel.progress] ?? rel.progress}
            </span>
            {rel.partner.occupation && (
              <span className="px-1.5 py-0.5 rounded bg-surface-2 text-muted">
                {rel.partner.occupation}
              </span>
            )}
            {rel.description && (
              <span className="px-1.5 py-0.5 rounded bg-surface-2 text-muted truncate max-w-[180px]">
                {rel.description}
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/s/${id}`}
          className="shrink-0 inline-flex items-center gap-1 text-xs text-white font-medium px-3 py-2 rounded-lg bg-accent hover:brightness-110"
        >
          <Zap size={13} /> 전략
        </Link>
      </header>

      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        {/* 재분석 버튼 — 최근 Event 기반 */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted">Event에서 자동 추출된 분석</div>
          <DeriveStateButton relationshipId={id} />
        </div>

        {/* 관계 dynamics 4축 */}
        {dynamicsItems.length > 0 && (
          <section>
            <div className="text-xs text-muted uppercase tracking-wider mb-2">
              관계 다이내믹
            </div>
            <div className="flex flex-col gap-2">
              {dynamicsItems.map((d) => (
                <div
                  key={d.k}
                  className="rounded-xl border border-border bg-surface-2 px-3 py-2.5"
                >
                  <div className="text-[10px] text-muted uppercase tracking-wider mb-0.5">
                    {d.k}
                  </div>
                  <div className="text-sm leading-relaxed">{d.v}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 나 vs 상대 관찰 누적 */}
        <section>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            나 vs 상대 · Event에서 추출
          </div>
          <div className="grid grid-cols-1 gap-3">
            <TraitsCard title="나" tone="accent-2" traits={selfTraits} />
            <TraitsCard title={rel.partner.displayName} tone="accent" traits={partnerTraits} />
          </div>
        </section>

        {/* 상대 프로필 편집 */}
        <section>
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            {rel.partner.displayName} 프로필 (직접 입력)
          </div>
          <PartnerInlineEditor rel={rel} open={true} showToggleButton={false} />
        </section>
      </div>
    </>
  )
}

function TraitsCard({
  title,
  tone,
  traits,
}: {
  title: string
  tone: 'accent' | 'accent-2'
  traits: InferredTrait[]
}) {
  const borderClass = tone === 'accent' ? 'border-accent/30' : 'border-accent-2/30'
  const bgClass =
    tone === 'accent' ? 'bg-accent/5' : 'bg-accent-2/5'
  const headerClass = tone === 'accent' ? 'text-accent' : 'text-accent-2'

  return (
    <Card className={`${borderClass} ${bgClass}`}>
      <div className={`text-xs font-semibold mb-2 ${headerClass}`}>{title}</div>
      {traits.length === 0 ? (
        <div className="text-[11px] text-muted leading-relaxed inline-flex items-center gap-1.5">
          <RefreshCw size={11} /> 아직 관찰 없음. 기록 탭에 대화·사건 쌓고 위 &ldquo;재분석&rdquo; 눌러.
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {traits.map((t, i) => (
            <li key={i} className="text-xs leading-relaxed">
              • {t.observation}
              <span className="text-muted ml-1">({t.confidenceNarrative})</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

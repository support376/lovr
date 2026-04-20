import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, User } from 'lucide-react'
import { getSelf } from '@/lib/actions/self'
import { listRelationships } from '@/lib/actions/relationships'
import { Button, Card, Empty, PageHeader, Pill } from '@/components/ui'

/**
 * 관계 탭 루트 — 내 프로필 카드 + 상대 목록.
 * 관계가 1개면 /r/[id] 로 바로 점프하는 과거 UX는 제거 — 내 프로필 접근도 여기 있음.
 */
export default async function RelationshipsIndex() {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  const all = await listRelationships()

  return (
    <>
      <PageHeader
        title="관계"
        subtitle="나 · 상대 프로필 + AI 추출 분석"
        right={
          <Link
            href="/r/new"
            className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center"
            aria-label="관계 추가"
          >
            <Plus size={20} />
          </Link>
        }
      />

      <div className="px-5 pb-10 flex-1 flex flex-col gap-4">
        {/* 내 프로필 카드 */}
        <Link href="/r/me">
          <Card className="border-accent-2/30 bg-accent-2/5 hover:border-accent-2/60 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-2/20 flex items-center justify-center shrink-0">
                <User size={18} className="text-accent-2" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">내 프로필</div>
                <div className="text-[11px] text-muted truncate">
                  {self.displayName}
                  {self.age ? ` · ${self.age}` : ''}
                  {self.occupation ? ` · ${self.occupation}` : ''}
                </div>
              </div>
              <span className="text-accent-2 text-sm">→</span>
            </div>
          </Card>
        </Link>

        <div className="text-xs text-muted uppercase tracking-wider">
          상대 ({all.length})
        </div>

        {all.length === 0 ? (
          <Empty
            title="아직 등록된 상대 없어"
            subtitle="상대를 등록하면 나와의 프로파일 비교·분석이 시작돼."
            action={
              <Link href="/r/new">
                <Button>
                  <Plus size={16} /> 첫 상대 등록
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {all.map((r) => (
              <Link key={r.id} href={`/r/${r.id}`}>
                <Card className="hover:border-accent/60 transition-colors">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold">{r.partner.displayName}</div>
                    {r.partner.age && (
                      <span className="text-muted text-xs">({r.partner.age})</span>
                    )}
                    <Pill tone="neutral">{r.progress}</Pill>
                    {r.status !== 'active' && <Pill tone="warn">{r.status}</Pill>}
                  </div>
                  {r.description && (
                    <div className="text-[11px] text-muted mt-1 truncate">
                      {r.description}
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

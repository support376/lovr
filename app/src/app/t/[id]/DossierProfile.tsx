import type { Target, TargetProfile } from '@/lib/db/schema'
import { Card, Pill } from '@/components/ui'

const BIGFIVE_LABEL: Record<string, string> = {
  openness: '개방',
  conscientiousness: '성실',
  extraversion: '외향',
  agreeableness: '친화',
  neuroticism: '신경',
}

const COMM_LABEL: Record<string, string> = {
  directness: '직설',
  emotionalExpressiveness: '감정표현',
  humor: '유머',
  formality: '격식',
}

const VALUE_LABEL: Record<string, string> = {
  achievement: '성취',
  benevolence: '이타',
  hedonism: '쾌락',
  security: '안정',
  tradition: '전통',
  selfDirection: '자율',
}

const ATTACHMENT_LABEL: Record<string, string> = {
  secure: '안정형',
  anxious: '불안형',
  avoidant: '회피형',
  disorganized: '혼란형',
  unknown: '판단 유보',
}

export function DossierProfile({ target }: { target: Target }) {
  const p = target.profile
  const hasData = p && (p.summary || p.attachment || p.bigFive || p.commStyle)

  if (!hasData) {
    return (
      <Card>
        <div className="text-sm text-muted">
          아직 프로파일링된 데이터가 없음. 메시지를 몇 개 넣고 재분석을 돌리면 채워져.
        </div>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {p.summary && (
        <Card>
          <div className="text-xs text-muted mb-1">요약</div>
          <div className="text-sm leading-relaxed">{p.summary}</div>
        </Card>
      )}

      {p.attachment && p.attachment.type !== 'unknown' && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted">애착 유형</div>
            <ConfidenceBar value={p.attachment.confidence} />
          </div>
          <div className="mt-1 text-sm font-semibold">
            {ATTACHMENT_LABEL[p.attachment.type] ?? p.attachment.type}
          </div>
        </Card>
      )}

      <DimGroup title="Big Five" data={p.bigFive} labels={BIGFIVE_LABEL} />
      <DimGroup
        title="커뮤니케이션 스타일"
        data={p.commStyle}
        labels={COMM_LABEL}
      />
      <DimGroup title="가치관" data={p.values} labels={VALUE_LABEL} />

      {(p.redFlags?.length || p.greenFlags?.length) && (
        <Card>
          {p.greenFlags && p.greenFlags.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-muted mb-1.5">강점</div>
              <div className="flex flex-wrap gap-1.5">
                {p.greenFlags.map((f, i) => (
                  <Pill key={i} tone="good">
                    {f}
                  </Pill>
                ))}
              </div>
            </div>
          )}
          {p.redFlags && p.redFlags.length > 0 && (
            <div>
              <div className="text-xs text-muted mb-1.5">주의</div>
              <div className="flex flex-wrap gap-1.5">
                {p.redFlags.map((f, i) => (
                  <Pill key={i} tone="bad">
                    {f}
                  </Pill>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

function DimGroup({
  title,
  data,
  labels,
}: {
  title: string
  data: Record<string, { value: number; confidence: number } | undefined> | undefined
  labels: Record<string, string>
}) {
  if (!data) return null
  const entries = Object.entries(data).filter(([, v]) => v != null) as Array<
    [string, { value: number; confidence: number }]
  >
  if (entries.length === 0) return null
  return (
    <Card>
      <div className="text-xs text-muted mb-3">{title}</div>
      <div className="flex flex-col gap-2.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-3">
            <div className="w-16 text-xs shrink-0">{labels[k] ?? k}</div>
            <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent"
                style={{ width: `${Math.round(v.value * 100)}%` }}
              />
            </div>
            <ConfidenceBar value={v.confidence} small />
          </div>
        ))}
      </div>
    </Card>
  )
}

function ConfidenceBar({ value, small }: { value: number; small?: boolean }) {
  const pct = Math.round(value * 100)
  return (
    <div
      className={`flex items-center gap-1.5 ${small ? 'text-[10px]' : 'text-xs'} text-muted`}
      title={`confidence ${pct}%`}
    >
      <span>{pct}%</span>
    </div>
  )
}

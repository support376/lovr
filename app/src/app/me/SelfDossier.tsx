'use client'
import { useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { Card, Pill } from '@/components/ui'
import { reprofileSelfAction } from '@/lib/actions/self'
import type { Self } from '@/lib/db/schema'

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
const ATTACH_LABEL: Record<string, string> = {
  secure: '안정형',
  anxious: '불안형',
  avoidant: '회피형',
  disorganized: '혼란형',
  unknown: '판단 유보',
}

export function SelfDossier({ self }: { self: Self }) {
  const p = self.psychProfile
  const [pending, start] = useTransition()

  const hasAnything = p?.summary || p?.strengths?.length || p?.bigFive

  const reprofile = () => {
    start(async () => {
      try {
        await reprofileSelfAction()
      } catch (e) {
        alert((e as Error).message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted uppercase tracking-wider">
          너의 프로파일
        </div>
        <button
          onClick={reprofile}
          disabled={pending}
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent disabled:opacity-40"
        >
          <RefreshCw size={12} className={pending ? 'animate-spin' : ''} />
          {pending ? 'AI 분석 중…' : '재분석'}
        </button>
      </div>

      {/* 자가선언 요약 카드 */}
      <Card>
        <div className="text-xs text-muted mb-2">자가 선언</div>
        <div className="flex flex-wrap gap-1.5">
          {self.mbti && <Pill tone="accent">{self.mbti}</Pill>}
          {self.age && <Pill tone="neutral">{self.age}세</Pill>}
          {self.gender && (
            <Pill tone="neutral">
              {self.gender === 'male' ? '남' : self.gender === 'female' ? '여' : self.gender}
            </Pill>
          )}
          {self.experienceLevel && (
            <Pill tone="neutral">경험 {self.experienceLevel}</Pill>
          )}
        </div>
        {self.strengths.length > 0 && (
          <div className="mt-3">
            <div className="text-[11px] text-muted mb-1">선언한 강점</div>
            <div className="flex flex-wrap gap-1.5">
              {self.strengths.map((s, i) => (
                <Pill key={i} tone="good">
                  {s}
                </Pill>
              ))}
            </div>
          </div>
        )}
        {self.weaknesses.length > 0 && (
          <div className="mt-3">
            <div className="text-[11px] text-muted mb-1">선언한 약점</div>
            <div className="flex flex-wrap gap-1.5">
              {self.weaknesses.map((s, i) => (
                <Pill key={i} tone="bad">
                  {s}
                </Pill>
              ))}
            </div>
          </div>
        )}
        {self.dealBreakers.length > 0 && (
          <div className="mt-3">
            <div className="text-[11px] text-muted mb-1">딜 브레이커</div>
            <div className="flex flex-wrap gap-1.5">
              {self.dealBreakers.map((s, i) => (
                <Pill key={i} tone="bad">
                  🚫 {s}
                </Pill>
              ))}
            </div>
          </div>
        )}
        {self.idealType && (
          <div className="mt-3 text-xs text-muted">
            <span className="font-medium text-text">이상형:</span> {self.idealType}
          </div>
        )}
      </Card>

      {/* AI 제안 */}
      {((p?.suggestedStrengths?.length ?? 0) > 0 ||
        (p?.suggestedWeaknesses?.length ?? 0) > 0) && (
        <Card className="border-accent/40 bg-accent/5">
          <div className="flex items-center gap-1.5 text-xs text-accent mb-2">
            ✨ AI가 대화에서 발견한 것
          </div>
          {(p?.suggestedStrengths?.length ?? 0) > 0 && (
            <div className="mb-2">
              <div className="text-[11px] text-muted mb-1">
                너가 선언 안 한 강점 (추가할까?)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {p!.suggestedStrengths!.map((s, i) => (
                  <Pill key={i} tone="good">
                    + {s}
                  </Pill>
                ))}
              </div>
            </div>
          )}
          {(p?.suggestedWeaknesses?.length ?? 0) > 0 && (
            <div>
              <div className="text-[11px] text-muted mb-1">
                주의 패턴 (자각했어?)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {p!.suggestedWeaknesses!.map((s, i) => (
                  <Pill key={i} tone="bad">
                    + {s}
                  </Pill>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 text-[11px] text-muted/80 leading-relaxed">
            아래 "내 정보 편집"에서 확정해서 추가할 수 있어.
          </div>
        </Card>
      )}

      {!hasAnything ? (
        <Card>
          <div className="text-sm text-muted">
            AI 추론 프로파일 아직 없음. 상대 추가 + 대화 기록 넣고 "재분석" 누르면
            Big Five / 애착 / playbook이 생성돼.
          </div>
        </Card>
      ) : (
        <>
          {p.summary && (
            <Card>
              <div className="text-xs text-muted mb-1">요약</div>
              <div className="text-sm leading-relaxed">{p.summary}</div>
            </Card>
          )}

          {p.attachment && p.attachment.type !== 'unknown' && (
            <Card>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted">너의 애착 유형</div>
                <span className="text-xs text-muted">
                  {Math.round(p.attachment.confidence * 100)}%
                </span>
              </div>
              <div className="mt-1 text-sm font-semibold">
                {ATTACH_LABEL[p.attachment.type] ?? p.attachment.type}
              </div>
            </Card>
          )}

          <DimGroup title="Big Five" data={p.bigFive} labels={BIGFIVE_LABEL} />
          <DimGroup title="커뮤니케이션 스타일" data={p.commStyle} labels={COMM_LABEL} />
          <DimGroup title="가치관" data={p.values} labels={VALUE_LABEL} />

          {(p.strengths?.length ?? 0) > 0 && (
            <Card>
              <div className="text-xs text-muted mb-1.5">강점</div>
              <div className="flex flex-wrap gap-1.5">
                {p.strengths!.map((s, i) => (
                  <Pill key={i} tone="good">
                    {s}
                  </Pill>
                ))}
              </div>
            </Card>
          )}

          {(p.weaknesses?.length ?? 0) > 0 && (
            <Card>
              <div className="text-xs text-muted mb-1.5">반복 약점</div>
              <div className="flex flex-wrap gap-1.5">
                {p.weaknesses!.map((s, i) => (
                  <Pill key={i} tone="bad">
                    {s}
                  </Pill>
                ))}
              </div>
            </Card>
          )}

          {(p.patterns?.length ?? 0) > 0 && (
            <Card>
              <div className="text-xs text-muted mb-1.5">반복 패턴</div>
              <ul className="text-sm leading-relaxed list-disc list-inside">
                {p.patterns!.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Card>
          )}

          {(p.playbook?.length ?? 0) > 0 && (
            <Card>
              <div className="text-xs text-muted mb-2">너의 Playbook</div>
              <div className="flex flex-col gap-2.5">
                {p.playbook!.map((pb, i) => (
                  <div
                    key={i}
                    className="border border-border rounded-lg p-2.5 bg-surface-2/60"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-accent">{pb.when}</div>
                      <span className="text-[10px] text-muted">
                        {Math.round(pb.confidence * 100)}%
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-medium">{pb.strategy}</div>
                    <div className="mt-1 text-[11px] text-muted">{pb.evidence}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {p.basedOn && (
            <div className="text-[11px] text-muted text-center">
              분석 기준 · 메시지 {p.basedOn.totalInteractions} · 상대{' '}
              {p.basedOn.totalTargets}명 · 전략 {p.basedOn.totalStrategies}건 · 톤샘플{' '}
              {p.basedOn.toneSampleCount}개
              {p.lastProfiledAt && (
                <> · {new Date(p.lastProfiledAt).toLocaleString('ko-KR')}</>
              )}
            </div>
          )}
        </>
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
            <span className="text-[10px] text-muted">
              {Math.round(v.confidence * 100)}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

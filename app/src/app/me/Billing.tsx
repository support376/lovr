'use client'

import { Check, Lock, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui'
import { usePlan, setPlan } from '@/lib/plan'

/**
 * Plan 센터 — 베타 기간 CTA-only. 실제 PG 연결 전.
 * localStorage.luvos_plan 조작만 함. 서버 검증 없음.
 */
export function BillingMock() {
  const plan = usePlan()
  const isPaid = plan === 'paid'

  return (
    <div className="flex flex-col gap-3">
      <Card className={isPaid ? 'border-good/40 bg-good/5' : ''}>
        <div className="flex items-center gap-2 mb-1">
          {isPaid ? (
            <Check size={16} className="text-good" />
          ) : (
            <Sparkles size={16} className="text-accent" />
          )}
          <div className="text-sm font-semibold">
            현재 플랜: {isPaid ? 'PRO' : 'Free'}
          </div>
        </div>
        <div className="text-[11px] text-muted leading-relaxed mb-3">
          {isPaid
            ? '모든 기능 활성. 베타 기간 — 추후 정식 과금 시작 전 14일 사전 공지.'
            : '기본 기능 무료. 심화 분석·다관계·무제한 아카이브는 유료.'}
        </div>
        <button
          onClick={() => setPlan(isPaid ? 'free' : 'paid')}
          className={`w-full rounded-xl py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1.5 ${
            isPaid
              ? 'bg-surface-2 text-muted hover:bg-surface'
              : 'bg-gradient-to-br from-accent to-accent-2 text-white'
          }`}
        >
          {isPaid ? '다운그레이드' : (
            <>
              <Sparkles size={13} /> 업그레이드 (mock)
            </>
          )}
        </button>
      </Card>

      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-3">
          플랜 비교
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-y-2 gap-x-3 text-[11px]">
          <HeaderRow />
          <Row label="상대 관리" free="1명" paid="무제한" />
          <Row label="이벤트 기록" free="무제한" paid="무제한" />
          <Row label="모델 추출·재분석" free="월 1회" paid="무제한" />
          <Row label="AI 채팅" free="일 5회" paid="무제한" />
          <Row label="대화 아카이브" free="3개" paid="무제한" />
          <Row label="케미 점수·한줄" free="✅" paid="✅" />
          <Row label="8축 Radar" free="✅" paid="✅" />
          <Row label="잘/안 맞는 점 상세" free="일부" paid="전체" />
          <Row label="주간 리포트" free="—" paid="✅" />
          <Row label="반응 시뮬레이션" free="—" paid="✅" />
        </div>
      </Card>

      <div className="text-[10px] text-muted/60 leading-relaxed bg-surface-2 rounded-xl px-3 py-2.5">
        <Lock size={10} className="inline mr-1" />
        현재 베타 — PG 미연결. &ldquo;업그레이드&rdquo; 는 localStorage 로컬 스위치로,
        요금 부과 없음. 정식 출시 시 Paddle/Toss 연결 예정.
      </div>
    </div>
  )
}

function HeaderRow() {
  return (
    <>
      <div />
      <div className="text-[10px] text-muted text-center uppercase tracking-wider">
        Free
      </div>
      <div className="text-[10px] text-accent text-center uppercase tracking-wider font-semibold">
        PRO
      </div>
    </>
  )
}

function Row({
  label,
  free,
  paid,
}: {
  label: string
  free: string
  paid: string
}) {
  return (
    <>
      <div className="text-text">{label}</div>
      <div className="text-muted text-center w-12">{free}</div>
      <div className="text-accent text-center w-12 font-semibold">{paid}</div>
    </>
  )
}

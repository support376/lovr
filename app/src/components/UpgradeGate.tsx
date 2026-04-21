'use client'

import { useState } from 'react'
import { Sparkles, Lock, X, Check } from 'lucide-react'
import {
  usePlan,
  setPlan,
  FEATURE_META,
  type GateFeature,
} from '@/lib/plan'

/**
 * 유료 기능 게이트 wrapper.
 * - free 면 children 렌더 + 클릭시 모달
 * - paid 면 children 그대로 · 모달 없음
 *
 * 진짜 PG 연결 전이므로 "업그레이드" 누르면 즉시 localStorage.plan='paid' → 통과.
 */
export function UpgradeGate({
  feature,
  children,
  onProceed,
}: {
  feature: GateFeature
  children: React.ReactNode
  /** 유료 진입 후(또는 이미 paid) 실행될 동작. 없으면 아무것도 안 함. */
  onProceed?: () => void
}) {
  const plan = usePlan()
  const [open, setOpen] = useState(false)
  const meta = FEATURE_META[feature]

  const handleClick = (e: React.MouseEvent) => {
    if (plan === 'paid') {
      onProceed?.()
      return
    }
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
  }

  const upgradeAndGo = () => {
    setPlan('paid')
    setOpen(false)
    // 상태 업데이트 이후 다음 tick 에서 진행
    setTimeout(() => onProceed?.(), 0)
  }

  return (
    <>
      <div onClick={handleClick} className="contents">
        {children}
      </div>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="flex items-center gap-2 mb-3">
            <Lock size={16} className="text-accent" />
            <div className="text-sm font-bold">{meta.title}</div>
            <span className="ml-auto text-[10px] text-muted bg-surface-2 px-2 py-0.5 rounded-full">
              프리미엄
            </span>
          </div>
          <div className="text-xs text-muted leading-relaxed mb-4">
            {meta.rationale}
          </div>
          <div className="text-[10px] text-muted/60 bg-surface-2 rounded-lg px-3 py-2 mb-4 leading-relaxed">
            ⚠️ 현재 베타 · PG 연결 전. &ldquo;업그레이드&rdquo; 누르면 로컬 상태만 전환됨
            (요금 부과 없음). 게이트 위치 확인용.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl bg-surface-2 text-muted text-sm py-2.5 hover:bg-surface"
            >
              취소
            </button>
            <button
              onClick={upgradeAndGo}
              className="flex-1 rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white text-sm font-semibold py-2.5 inline-flex items-center justify-center gap-1.5"
            >
              <Sparkles size={13} /> 업그레이드
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

/**
 * 페이지/섹션에 "프리미엄" 배지만 표시 — 클릭 불가능 wrapper 안 쓸 때.
 */
export function PaidBadge({ className = '' }: { className?: string }) {
  const plan = usePlan()
  if (plan === 'paid') {
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-good/20 text-good ${className}`}
      >
        <Check size={9} /> PRO
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/15 text-accent ${className}`}
    >
      <Lock size={9} /> PRO
    </span>
  )
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-surface border border-border rounded-2xl p-4 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted hover:text-text"
          aria-label="닫기"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  )
}

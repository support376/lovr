'use client'
import { Zap, Crown, Bell, Download, HelpCircle, LogOut, Sparkles } from 'lucide-react'
import { Card, Pill } from '@/components/ui'

// ============================================================================
// 앱 설정 / 구독 / 계정 — MVP는 UI만. 결제 연동은 나중.
// ============================================================================
export function AppSettings() {
  return (
    <div className="flex flex-col gap-4">
      <PlanCard />
      <SettingsGroup title="알림" icon={Bell}>
        <SettingRow label="전략 준비 알림" hint="AI가 새 전략 뽑으면 알림" disabled />
        <SettingRow label="TODO 마감 리마인더" hint="할 일 시한 다가오면 알림" disabled />
        <SettingRow
          label="프로파일 제안 알림"
          hint="AI가 새 강점·약점 발견 시 알림"
          disabled
        />
      </SettingsGroup>

      <SettingsGroup title="데이터" icon={Download}>
        <SettingRow label="내 데이터 내보내기" hint="JSON으로 다운로드" disabled />
        <SettingRow label="모든 데이터 삭제" hint="복구 불가" danger disabled />
      </SettingsGroup>

      <SettingsGroup title="정보" icon={HelpCircle}>
        <SettingRow label="버전" hint="v0.1.0" />
        <SettingRow label="서비스 약관" disabled />
        <SettingRow label="개인정보 처리방침" disabled />
      </SettingsGroup>

      <div className="text-center text-[10px] text-muted/60 pt-2">
        LuvOS · Circle21 · 2026
      </div>
    </div>
  )
}

// ============================================================================
// 플랜
// ============================================================================
function PlanCard() {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-accent" />
          <span className="text-sm font-semibold">플랜</span>
        </div>
        <Pill tone="accent">Free</Pill>
      </div>

      <div className="text-xs text-muted leading-relaxed">
        현재 무료. 전략/프로파일링 무제한 (베타 특혜). 정식 런칭 후 유료 전환 예정.
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <PlanTile name="Free" price="0원" current dim />
        <PlanTile name="Pro" price="29,000원" hint="상대 5명 / 실시간 음성 / 브리핑" />
        <PlanTile name="Elite" price="79,000원" hint="무제한 / Opus 심층 / 1:1 코치 AI" />
      </div>

      <button
        disabled
        className="mt-4 w-full rounded-xl py-3 text-sm font-semibold border border-border bg-surface-2 text-muted flex items-center justify-center gap-2 cursor-not-allowed"
      >
        <Crown size={14} />
        업그레이드 (곧)
      </button>
      <div className="mt-2 text-[11px] text-muted/70 text-center">
        결제 시스템 준비 중. 베타 기간 동안 모든 기능 무료.
      </div>
    </Card>
  )
}

function PlanTile({
  name,
  price,
  hint,
  current,
  dim,
}: {
  name: string
  price: string
  hint?: string
  current?: boolean
  dim?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-2.5 text-left ${
        current
          ? 'bg-accent/10 border-accent'
          : dim
          ? 'bg-surface-2 border-border'
          : 'bg-surface-2 border-border'
      }`}
    >
      <div className="flex items-center gap-1">
        <div className="text-sm font-semibold">{name}</div>
        {current && <span className="text-[9px] text-accent">· 현재</span>}
      </div>
      <div className="mt-0.5 text-xs text-muted">{price}/월</div>
      {hint && (
        <div className="mt-1 text-[10px] text-muted/80 leading-snug line-clamp-3">
          {hint}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 설정 섹션
// ============================================================================
function SettingsGroup({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  children: React.ReactNode
}) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-muted" />
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-border/50">{children}</div>
    </Card>
  )
}

function SettingRow({
  label,
  hint,
  disabled,
  danger,
}: {
  label: string
  hint?: string
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between py-2.5 ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${danger ? 'text-bad' : ''}`}>{label}</div>
        {hint && <div className="text-[11px] text-muted mt-0.5">{hint}</div>}
      </div>
      {disabled && (
        <span className="text-[10px] text-muted/70 ml-2">곧</span>
      )}
    </div>
  )
}

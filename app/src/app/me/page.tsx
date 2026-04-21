import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronDown, ChevronRight, User, Heart, CreditCard, LogOut, Shield } from 'lucide-react'
import { getSelf } from '@/lib/actions/self'
import {
  getCurrentRelationship,
  listRelationships,
} from '@/lib/actions/relationships'
import { PageHeader } from '@/components/ui'
import { SelfForm } from './SelfForm'
import { PartnerSettings } from './PartnerSettings'
import { BillingMock } from './Billing'
import { SignOutButton } from './SignOutButton'
import { AccountActions } from './AccountActions'

/**
 * 설정 탭 — 내 정보 + 상대 정보 (N명 관리) + 결제 + 로그아웃.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>
}) {
  const self = await getSelf()
  if (!self) redirect('/onboarding')

  const all = await listRelationships()
  const current = await getCurrentRelationship()
  const sp = await searchParams
  const open = sp.open ?? 'self'

  return (
    <>
      <PageHeader title="설정" subtitle="내 정보 · 상대 · 결제" />
      <div className="px-5 pb-10 flex-1 flex flex-col gap-3">
        <Section
          id="self"
          icon={<User size={14} />}
          label="내 정보"
          hint={self.displayName + (self.age ? ` · ${self.age}` : '')}
          open={open === 'self'}
        >
          <SelfForm initial={self} />
        </Section>

        <Section
          id="partner"
          icon={<Heart size={14} />}
          label="상대 정보"
          hint={
            all.length === 0
              ? '미등록'
              : `${current?.partner.displayName ?? '-'} · 전체 ${all.length}명`
          }
          open={open === 'partner'}
        >
          <PartnerSettings all={all} current={current} />
        </Section>

        <Section
          id="billing"
          icon={<CreditCard size={14} />}
          label="플랜 · 결제"
          hint="Free · PRO 비교"
          open={open === 'billing'}
        >
          <BillingMock />
        </Section>

        <Section
          id="privacy"
          icon={<Shield size={14} />}
          label="개인정보 · 계정"
          hint="데이터 내보내기 · 계정 삭제"
          open={open === 'privacy'}
        >
          <AccountActions />
        </Section>

        <Section
          id="session"
          icon={<LogOut size={14} />}
          label="세션"
          hint="로그아웃"
          open={open === 'session'}
        >
          <SignOutButton />
        </Section>

        {/* 법적 문구 footer */}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-center gap-3 text-[10px] text-muted/70">
          <Link href="/legal/privacy" className="hover:text-accent">
            개인정보 처리방침
          </Link>
          <span className="opacity-40">·</span>
          <Link href="/legal/terms" className="hover:text-accent">
            이용약관
          </Link>
          <span className="opacity-40">·</span>
          <span>제3자 제공 없음</span>
        </div>
      </div>
    </>
  )
}

function Section({
  id,
  icon,
  label,
  hint,
  open,
  children,
}: {
  id: string
  icon: React.ReactNode
  label: string
  hint?: string
  open: boolean
  children: React.ReactNode
}) {
  const href = open ? '/me' : `/me?open=${id}`
  return (
    <details
      open={open}
      className="group rounded-2xl border border-border bg-surface/50 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-3">
        <a href={href} className="contents">
          <span className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-muted">
            {icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{label}</div>
            {hint && <div className="text-[11px] text-muted truncate">{hint}</div>}
          </div>
          {open ? (
            <ChevronDown size={16} className="text-muted" />
          ) : (
            <ChevronRight size={16} className="text-muted" />
          )}
        </a>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  )
}

'use client'
import clsx from 'clsx'
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
}) {
  return (
    <header className="px-5 pt-8 pb-4 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-border bg-surface p-4',
        className
      )}
    >
      {children}
    </div>
  )
}

export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        variant === 'primary' &&
          'bg-accent text-white hover:bg-accent/90 active:bg-accent/80',
        variant === 'secondary' &&
          'bg-surface-2 text-text border border-border hover:bg-surface-2/70',
        variant === 'ghost' && 'text-muted hover:text-text',
        variant === 'danger' && 'bg-bad/20 text-bad hover:bg-bad/30',
        className
      )}
    >
      {children}
    </button>
  )
}

export function TextInput({
  label,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-xs text-muted">{label}</span>}
      <input
        {...props}
        className={clsx(
          'w-full rounded-xl bg-surface-2 border border-border px-3 py-3 text-sm outline-none focus:border-accent',
          className
        )}
      />
      {error && <span className="text-xs text-bad">{error}</span>}
    </label>
  )
}

export function TextArea({
  label,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-xs text-muted">{label}</span>}
      <textarea
        {...props}
        className={clsx(
          'w-full rounded-xl bg-surface-2 border border-border px-3 py-3 text-sm outline-none focus:border-accent resize-y min-h-[80px]',
          className
        )}
      />
    </label>
  )
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'accent'
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        tone === 'neutral' && 'bg-surface-2 text-muted',
        tone === 'good' && 'bg-good/15 text-good',
        tone === 'warn' && 'bg-warn/15 text-warn',
        tone === 'bad' && 'bg-bad/15 text-bad',
        tone === 'accent' && 'bg-accent/15 text-accent'
      )}
    >
      {children}
    </span>
  )
}

export function Empty({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-lg font-semibold">{title}</div>
      {subtitle && <div className="mt-1 text-sm text-muted max-w-xs">{subtitle}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export const STAGE_LABEL: Record<string, string> = {
  matched: '매칭',
  exploring: '탐색',
  crush: '썸',
  confirmed: '호감 확정',
  committed: '관계',
  fading: '소강',
  ended: '종료',
}

export const STAGE_TONE: Record<string, 'neutral' | 'good' | 'warn' | 'bad' | 'accent'> = {
  matched: 'neutral',
  exploring: 'accent',
  crush: 'accent',
  confirmed: 'good',
  committed: 'good',
  fading: 'warn',
  ended: 'bad',
}

export const GOAL_LABEL: Record<string, string> = {
  casual: '캐주얼 유지',
  sum_to_couple: '썸 → 연인',
  confirm_relationship: '관계 확정',
  soft_end: '소프트 종료',
  observe: '관찰만',
  explore: '탐색',
  custom: '커스텀',
}

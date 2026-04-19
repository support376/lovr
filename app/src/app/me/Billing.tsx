'use client'

import { useState } from 'react'
import { CreditCard, Lock } from 'lucide-react'
import { Button, Card } from '@/components/ui'

export function BillingMock() {
  const [num, setNum] = useState('')
  const [exp, setExp] = useState('')
  const [cvc, setCvc] = useState('')
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)

  const formatCardNum = (v: string) =>
    v
      .replace(/\D/g, '')
      .slice(0, 16)
      .replace(/(\d{4})(?=\d)/g, '$1 ')
  const formatExp = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4)
    return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
  }
  const formatCvc = (v: string) => v.replace(/\D/g, '').slice(0, 4)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!num || !exp || !cvc || !name) return
    // 실제 결제 연동 없음 — 로컬 mock 만
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const masked = num ? '•••• •••• •••• ' + num.replace(/\s/g, '').slice(-4) : ''

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <CreditCard size={16} className="text-accent" />
        <div className="text-sm font-semibold">결제 수단</div>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted">
          <Lock size={10} /> mock
        </span>
      </div>
      <div className="text-[11px] text-muted mb-3 leading-relaxed">
        베타 기간 — 아직 실제 결제 연동 안 됨. 카드 정보 입력해도 서버로 전송 안 하고
        UI 상태만 저장해봄. 프리미엄 다면 리포트·2명 이상 관계 관리는 추후 이 카드로 과금.
      </div>

      {saved && (
        <div className="mb-3 text-xs text-good bg-good/10 border border-good/30 rounded-lg px-3 py-2">
          ✓ 저장됨 (mock). {masked}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-2">
        <input
          value={num}
          onChange={(e) => setNum(formatCardNum(e.target.value))}
          placeholder="카드번호 1234 5678 9012 3456"
          inputMode="numeric"
          className="rounded-xl bg-surface-2 border border-border px-3 py-2.5 text-sm outline-none focus:border-accent font-mono"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={exp}
            onChange={(e) => setExp(formatExp(e.target.value))}
            placeholder="MM/YY"
            inputMode="numeric"
            className="rounded-xl bg-surface-2 border border-border px-3 py-2.5 text-sm outline-none focus:border-accent font-mono"
          />
          <input
            value={cvc}
            onChange={(e) => setCvc(formatCvc(e.target.value))}
            placeholder="CVC"
            inputMode="numeric"
            className="rounded-xl bg-surface-2 border border-border px-3 py-2.5 text-sm outline-none focus:border-accent font-mono"
          />
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="카드 명의"
          className="rounded-xl bg-surface-2 border border-border px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <Button type="submit" disabled={!num || !exp || !cvc || !name}>
          저장 (mock)
        </Button>
      </form>
    </Card>
  )
}

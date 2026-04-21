'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Trash2, AlertTriangle } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { deleteAccountData, exportAllData } from '@/lib/actions/account'

export function AccountActions() {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const router = useRouter()

  const onExport = () => {
    setErr(null)
    start(async () => {
      try {
        const bundle = await exportAllData()
        const blob = new Blob([JSON.stringify(bundle, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `luvos-export-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  const onDelete = () => {
    if (confirmText !== '삭제') {
      setErr('"삭제" 정확히 입력해야 진행 가능')
      return
    }
    setErr(null)
    start(async () => {
      try {
        await deleteAccountData()
        // localStorage 클리어 (plan 포함)
        try {
          localStorage.clear()
        } catch {}
        router.replace('/login')
      } catch (e) {
        setErr((e as Error).message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="text-xs text-muted uppercase tracking-wider mb-2">
          데이터 내보내기
        </div>
        <div className="text-[11px] text-muted leading-relaxed mb-3">
          본인 프로필·상대·이벤트·대화 아카이브 전체를 JSON 파일로 다운로드.
          개인정보보호법 § 열람권 대응.
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onExport}
          disabled={pending}
          className="w-full"
        >
          <Download size={14} /> JSON 내보내기
        </Button>
      </Card>

      <Card className="border-bad/40">
        <div className="text-xs text-bad uppercase tracking-wider mb-2 flex items-center gap-1">
          <AlertTriangle size={12} /> 위험 구역
        </div>
        <div className="text-[11px] text-muted leading-relaxed mb-3">
          계정 삭제 — 본인 프로필·상대·이벤트·대화 모두 <strong>영구 삭제</strong> (되돌림
          불가). 30일 이내 Supabase 백업 로그에는 남을 수 있음.
        </div>
        {!confirmOpen ? (
          <Button
            type="button"
            variant="danger"
            onClick={() => setConfirmOpen(true)}
            disabled={pending}
            className="w-full"
          >
            <Trash2 size={14} /> 계정 삭제
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="text-xs text-bad">
              정말 삭제하려면 아래 &ldquo;삭제&rdquo; 라고 정확히 입력:
            </div>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="삭제"
              className="rounded-xl bg-surface-2 border border-bad/40 px-3 py-2.5 text-sm outline-none focus:border-bad"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setConfirmOpen(false)
                  setConfirmText('')
                  setErr(null)
                }}
                disabled={pending}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={onDelete}
                disabled={pending || confirmText !== '삭제'}
                className="flex-1"
              >
                {pending ? '삭제 중…' : '영구 삭제'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {err && (
        <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2">
          {err}
        </div>
      )}
    </div>
  )
}

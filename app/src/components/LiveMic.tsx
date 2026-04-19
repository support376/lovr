'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { AudioLines, X, Square, Save, Sparkles } from 'lucide-react'
import { Button, Pill } from './ui'
import {
  askFast,
  askMid,
  askTenMinReport,
  saveMeetingEvent,
  type Turn,
} from '@/lib/actions/realtime'

type Role = 'me' | 'partner' | 'unknown'
type Segment = { segId: number; text: string; role: Role; speakerName?: string }
type Status = 'idle' | 'requesting' | 'connecting' | 'recording' | 'error' | 'stopped'

export function LiveMic() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-2 text-white flex items-center justify-center active:scale-95 transition-transform shadow-md shadow-accent/20"
        aria-label="실시간 음성 모드"
      >
        <AudioLines size={18} />
      </button>
      {open && <LiveMicModal onClose={() => setOpen(false)} />}
    </>
  )
}

const FAST_INTERVAL_MS = 6_000
const MID_INTERVAL_MS = 90_000
const TEN_MIN_MS = 10 * 60 * 1000

function LiveMicModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [finals, setFinals] = useState<Segment[]>([])
  const [partial, setPartial] = useState<string>('')

  const [coachingOn, setCoachingOn] = useState(true)
  const [fastTag, setFastTag] = useState<string>('[중립]')
  const [midSuggestion, setMidSuggestion] = useState<string>('')
  const [midPending, setMidPending] = useState(false)

  const [reports, setReports] = useState<Array<{ markdown: string; at: number }>>([])
  const [reportPending, setReportPending] = useState(false)
  const startedAtRef = useRef<number>(0)
  const reportTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const workletRef = useRef<AudioWorkletNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const finalsRef = useRef<Segment[]>([])
  const lastFastCheckAt = useRef(0)
  const midTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const wsUrl = process.env.NEXT_PUBLIC_REALTIME_WS_URL

  const runFast = useCallback(async () => {
    const recent = finalsRef.current.slice(-5).map((s) => s.text).join(' ').trim()
    if (!recent) return
    try {
      const r = await askFast({ chunk: recent })
      setFastTag(r.tag)
    } catch {}
  }, [])

  const runMid = useCallback(async () => {
    const full = finalsRef.current.map((s) => s.text).join(' ').trim()
    if (full.length < 30) return
    setMidPending(true)
    try {
      const r = await askMid({ transcript: full })
      setMidSuggestion(r.markdown)
    } catch {}
    finally {
      setMidPending(false)
    }
  }, [])

  const runTenMin = useCallback(async () => {
    const turns: Turn[] = finalsRef.current.map((s) => ({ role: s.role, text: s.text }))
    if (turns.length === 0) return
    const elapsedMin = Math.round((Date.now() - startedAtRef.current) / 60000)
    setReportPending(true)
    try {
      const r = await askTenMinReport({ turns, elapsedMin, mode: 'explore' })
      setReports((prev) => [...prev, { markdown: r.markdown, at: Date.now() }])
    } catch (e) {
      setErrorMsg((e as Error).message)
    } finally {
      setReportPending(false)
    }
  }, [])

  useEffect(() => {
    if (!wsUrl) {
      setStatus('error')
      setErrorMsg('NEXT_PUBLIC_REALTIME_WS_URL 미설정')
      return
    }
    start()
    return () => {
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!coachingOn || status !== 'recording') {
      if (midTimerRef.current) {
        clearInterval(midTimerRef.current)
        midTimerRef.current = null
      }
      if (reportTimerRef.current) {
        clearInterval(reportTimerRef.current)
        reportTimerRef.current = null
      }
      return
    }
    midTimerRef.current = setInterval(runMid, MID_INTERVAL_MS)
    reportTimerRef.current = setInterval(runTenMin, TEN_MIN_MS)
    return () => {
      if (midTimerRef.current) clearInterval(midTimerRef.current)
      if (reportTimerRef.current) clearInterval(reportTimerRef.current)
    }
  }, [coachingOn, status, runMid, runTenMin])

  useEffect(() => {
    if (!coachingOn || status !== 'recording') return
    const now = Date.now()
    if (now - lastFastCheckAt.current < FAST_INTERVAL_MS) return
    lastFastCheckAt.current = now
    runFast()
  }, [finals, coachingOn, status, runFast])

  async function start() {
    setStatus('requesting')
    setErrorMsg(null)
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
    } catch (e) {
      setStatus('error')
      setErrorMsg('마이크 접근 실패: ' + (e as Error).message)
      return
    }

    const AC: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtxRef.current = new AC({ sampleRate: 16000 })
    try {
      await audioCtxRef.current.audioWorklet.addModule('/realtime-worklet.js')
    } catch (e) {
      setStatus('error')
      setErrorMsg('AudioWorklet 로드 실패: ' + (e as Error).message)
      return
    }

    const source = audioCtxRef.current.createMediaStreamSource(streamRef.current)
    workletRef.current = new AudioWorkletNode(audioCtxRef.current, 'pcm-sender')

    setStatus('connecting')
    const ws = new WebSocket(wsUrl!)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      source.connect(workletRef.current!)
      workletRef.current!.port.onmessage = (e) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(e.data)
      }
      setStatus('recording')
      startedAtRef.current = Date.now()
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'partial') {
          setPartial(msg.text ?? '')
        } else if (msg.type === 'final') {
          setPartial('')
          setFinals((prev) => {
            const next = [
              ...prev,
              { segId: msg.seg_id, text: msg.text, role: 'unknown' as Role },
            ]
            finalsRef.current = next
            return next
          })
        } else if (msg.type === 'speaker') {
          const { seg_id, display_name, role } = msg as {
            seg_id: number
            display_name?: string | null
            role?: 'me' | 'partner' | null
          }
          setFinals((prev) => {
            const next = prev.map((s) =>
              s.segId === seg_id
                ? {
                    ...s,
                    role: (role ?? s.role) as Role,
                    speakerName: display_name ?? s.speakerName,
                  }
                : s
            )
            finalsRef.current = next
            return next
          })
        } else if (msg.type === 'error') {
          setStatus('error')
          setErrorMsg('STT 오류: ' + msg.error)
        }
      } catch {}
    }

    ws.onclose = () => {
      if (status === 'recording') setStatus('stopped')
    }
    ws.onerror = () => {
      setStatus('error')
      setErrorMsg('WebSocket 연결 오류')
    }
  }

  function stop() {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }))
    }
    cleanup()
    setStatus('stopped')
  }

  function cleanup() {
    if (workletRef.current) {
      try {
        workletRef.current.disconnect()
      } catch {}
      workletRef.current = null
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close()
      } catch {}
      audioCtxRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (wsRef.current) {
      try {
        wsRef.current.close()
      } catch {}
      wsRef.current = null
    }
  }

  const fullTranscript = finals
    .map((f) => {
      const prefix =
        f.role === 'me' ? '나: ' : f.role === 'partner' ? '상대: ' : f.speakerName ? `${f.speakerName}: ` : ''
      return `${prefix}${f.text}`
    })
    .join('\n')
    .trim()

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const saveAsMeeting = async () => {
    if (!fullTranscript) return
    setSaving(true)
    try {
      const r = await saveMeetingEvent({ transcript: fullTranscript })
      setSaved(`기록 저장됨 (${r.eventId.slice(0, 10)}…)`)
    } catch (e) {
      setErrorMsg((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const fastTone = fastTag.includes('경고') || fastTag.includes('철수')
    ? 'bad'
    : fastTag.includes('기회')
    ? 'good'
    : fastTag.includes('전환')
    ? 'warn'
    : 'neutral'

  return (
    <div
      className="fixed inset-0 z-50 bg-bg flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      {/* 헤더 */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <div className="text-sm font-semibold">실시간 음성</div>
          <StatusBanner status={status} />
        </div>
        <button
          onClick={() => {
            cleanup()
            onClose()
          }}
          className="w-9 h-9 rounded-full bg-surface-2 hover:bg-surface-2/60 flex items-center justify-center"
          aria-label="닫기"
        >
          <X size={20} />
        </button>
      </div>

      {/* 바디 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {errorMsg && (
          <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg px-3 py-2 whitespace-pre-wrap">
            {errorMsg}
          </div>
        )}

        {/* AI 코칭 토글 */}
        <button
          onClick={() => setCoachingOn((v) => !v)}
          className={`self-start px-3 py-1.5 rounded-full border text-xs font-medium ${
            coachingOn
              ? 'bg-accent/15 border-accent/40 text-accent'
              : 'bg-surface-2 border-border text-muted'
          }`}
        >
          <Sparkles size={11} className="inline mr-1" />
          AI 코칭 {coachingOn ? 'ON' : 'OFF'}
        </button>

        {/* 실시간 태그 (Fast) */}
        {coachingOn && status === 'recording' && (
          <div className="flex items-center justify-center py-1">
            <Pill tone={fastTone}>{fastTag}</Pill>
          </div>
        )}

        {/* 실시간 제안 (Mid) */}
        {coachingOn && midSuggestion && (
          <div className="rounded-xl bg-accent/10 border border-accent/30 p-3 text-xs leading-relaxed">
            <div className="text-[10px] text-accent mb-1 flex items-center gap-1">
              <Sparkles size={10} /> 실시간 제안 {midPending ? '· 갱신 중' : ''}
            </div>
            <div className="whitespace-pre-wrap">{midSuggestion}</div>
          </div>
        )}

        {/* 10분 리포트 */}
        {reports.map((r, i) => (
          <div
            key={i}
            className="rounded-xl bg-warn/10 border border-warn/30 p-3 text-xs leading-relaxed"
          >
            <div className="text-[10px] text-warn mb-1 flex items-center gap-1">
              📊 {10 * (i + 1)}분 리포트
            </div>
            <div className="whitespace-pre-wrap">{r.markdown}</div>
          </div>
        ))}
        {reportPending && (
          <div className="text-[11px] text-muted text-center">분석 중…</div>
        )}

        {/* transcript */}
        <div className="flex-1 rounded-xl bg-surface-2/70 border border-border p-3 min-h-[200px] text-sm leading-relaxed">
          {finals.length === 0 && !partial && (
            <div className="text-xs text-muted text-center py-8">
              {status === 'recording' ? '말해봐…' : '시작 대기'}
            </div>
          )}
          {finals.map((f) => (
            <div key={f.segId} className="mb-1.5">
              <span
                className={`text-[10px] font-mono mr-1.5 ${
                  f.role === 'me'
                    ? 'text-accent'
                    : f.role === 'partner'
                    ? 'text-accent-2'
                    : 'text-muted/60'
                }`}
              >
                {f.role === 'me'
                  ? '나'
                  : f.role === 'partner'
                  ? '상대'
                  : f.speakerName ?? `#${f.segId}`}
              </span>
              {f.text}
            </div>
          ))}
          {partial && <div className="text-muted italic">{partial}</div>}
        </div>
      </div>

      {/* 하단 고정 버튼 바 */}
      <div className="shrink-0 px-4 py-3 border-t border-border flex flex-col gap-2">
        {status === 'recording' && (
          <div className="flex gap-2">
            <Button onClick={stop} variant="secondary" className="flex-1">
              <Square size={14} /> 정지
            </Button>
            <Button onClick={runTenMin} variant="secondary" className="flex-1">
              📊 지금 분석
            </Button>
          </div>
        )}

        {status === 'stopped' && fullTranscript && (
          <Button onClick={saveAsMeeting} disabled={saving}>
            <Save size={14} /> {saving ? '저장…' : '기록으로 저장'}
          </Button>
        )}
        {saved && <div className="text-xs text-good text-center">{saved}</div>}
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: Status }) {
  const color =
    status === 'recording'
      ? 'bg-bad animate-pulse'
      : status === 'error'
      ? 'bg-bad'
      : status === 'connecting' || status === 'requesting'
      ? 'bg-warn animate-pulse'
      : 'bg-muted'
  return <span className={`w-2 h-2 rounded-full ${color}`} />
}

function StatusBanner({ status }: { status: Status }) {
  const text: Record<Status, string> = {
    idle: '대기',
    requesting: '권한…',
    connecting: '연결…',
    recording: '🔴 녹음',
    error: '⚠️ 오류',
    stopped: '⏹ 정지',
  }
  return <span className="text-[11px] text-muted">{text[status]}</span>
}

import Link from 'next/link'
import {
  ArrowRight,
  Brain,
  ListTodo,
  MessageSquare,
  RefreshCw,
  Scroll,
  Target as TargetIcon,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react'

// ============================================================================
// 랜딩 — Self 없을 때 첫 진입 화면
// 폰 프레임 안에서 스크롤 가능한 세로 섹션 구조
// ============================================================================
export function Landing() {
  return (
    <div className="flex flex-col">
      <Hero />
      <PainSection />
      <HowSection />
      <CompareSection />
      <FinalCTA />
      <Footer />
    </div>
  )
}

// ============================================================================
// Hero — 첫 화면
// ============================================================================
function Hero() {
  return (
    <section className="px-6 pt-12 pb-10 flex flex-col items-start">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-[11px] text-accent mb-5">
        <Zap size={11} /> Private beta · 2026
      </div>
      <h1 className="text-[2.6rem] leading-[1.05] font-bold tracking-tight">
        사랑은
        <br />
        <span className="bg-gradient-to-br from-accent to-accent-2 bg-clip-text text-transparent">
          기억력 싸움
        </span>
        <span className="text-text">이야.</span>
      </h1>
      <p className="mt-5 text-base text-muted leading-relaxed">
        LuvOS가 대신 기억하고,
        <br />
        너를 분석하고, 다음 수를 짠다.
      </p>

      <Link
        href="/onboarding"
        className="mt-8 w-full rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-white font-semibold py-4 flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
      >
        2분 만에 시작 <ArrowRight size={18} />
      </Link>
      <div className="mt-2 text-[11px] text-muted/70">
        신용카드 필요 없음 · 베타 무료
      </div>
    </section>
  )
}

// ============================================================================
// Pain — 공감 먼저
// ============================================================================
function PainSection() {
  const items = [
    { icon: Scroll, text: '"지난주에 뭐라 했더라…" 스크롤업 하루 30분.' },
    { icon: Users, text: '5명 동시 대화 중. 누가 누군지 가끔 헷갈림.' },
    {
      icon: RefreshCw,
      text: '왜 매번 3주차에 식는지 본인도 모름.',
    },
    {
      icon: MessageSquare,
      text: '답장봇은 많지만 관계 전체 방향은 아무도 안 잡아줌.',
    },
  ]

  return (
    <section className="px-6 py-10 bg-surface/40 border-y border-border">
      <div className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
        너한테 이런 일 있지?
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-2/70 border border-border"
          >
            <item.icon size={18} className="text-muted shrink-0 mt-0.5" />
            <div className="text-sm leading-relaxed">{item.text}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ============================================================================
// How — 4단계 작동 원리
// ============================================================================
function HowSection() {
  const steps = [
    {
      n: 1,
      icon: UserPlus,
      title: '나를 알려줘',
      time: '2분',
      desc:
        '강점·약점·MBTI·이상형. AI가 즉시 1차 프로파일링해서 너의 사랑 운영 스타일을 파악함.',
    },
    {
      n: 2,
      icon: Users,
      title: '상대를 등록해',
      time: '상대당 2분',
      desc:
        '신상·배경·MBTI·공통점·**현재 진행 상황**. 아는 만큼만. 나머진 대화로 채워짐.',
    },
    {
      n: 3,
      icon: MessageSquare,
      title: '대화 기록 넣어',
      time: '붙여넣기',
      desc:
        '카톡 복사 → 붙여넣기. AI가 매번 상대 프로파일(애착·Big Five·가치관)을 갱신.',
    },
    {
      n: 4,
      icon: TargetIcon,
      title: '전략 + TODO 받기',
      time: '30초',
      desc:
        '목표 기반 다음 수 3~4개 + 구체 할 일 리스트. 결과를 라벨하면 다음 전략이 학습함.',
    },
  ]

  return (
    <section className="px-6 py-10">
      <div className="text-xs font-mono text-muted uppercase tracking-widest mb-1">
        How it works
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-5">
        데이터가 쌓일수록
        <br />
        전략이 정교해진다.
      </h2>

      <div className="flex flex-col gap-3">
        {steps.map((s) => (
          <div
            key={s.n}
            className="relative rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {s.n}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{s.title}</span>
                  <span className="text-[10px] text-muted bg-surface-2 px-1.5 py-0.5 rounded">
                    {s.time}
                  </span>
                </div>
                <div className="mt-1.5 text-xs text-muted leading-relaxed">
                  {s.desc
                    .split(/(\*\*[^*]+\*\*)/)
                    .map((part, i) =>
                      part.startsWith('**') ? (
                        <strong key={i} className="text-accent">
                          {part.slice(2, -2)}
                        </strong>
                      ) : (
                        part
                      )
                    )}
                </div>
              </div>
              <s.icon size={16} className="text-muted/50 shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* Closed loop 강조 */}
      <div className="mt-5 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-transparent to-accent-2/10 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold mb-1">
          <Brain size={16} className="text-accent" />
          클로즈드 루프 학습
        </div>
        <div className="text-xs text-muted leading-relaxed">
          전략 채택 → 결과 라벨 → 다음 전략이 이 학습을 읽음. 쓸수록 너 전용
          playbook이 쌓임.
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// Compare — 왜 답장봇이랑 달라
// ============================================================================
function CompareSection() {
  const rows = [
    { k: '상대 관리', rizz: '스샷 1장씩 독립', luvos: '여러 명 dossier 누적' },
    { k: '전략', rizz: '답장 한 줄', luvos: '관계 전체 방향 + 다음 수' },
    { k: '목표', rizz: '없음', luvos: '내가 정한 목표로 수렴' },
    { k: '학습', rizz: '없음', luvos: 'Playbook · 약점 회피' },
    { k: 'TODO', rizz: '없음', luvos: '까먹지 않게 자동 생성' },
  ]

  return (
    <section className="px-6 py-10 bg-surface/40 border-y border-border">
      <div className="text-xs font-mono text-muted uppercase tracking-widest mb-3">
        답장봇 vs LuvOS
      </div>

      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="grid grid-cols-3 text-[11px] font-semibold bg-surface-2/60 px-3 py-2 border-b border-border">
          <div className="text-muted"></div>
          <div className="text-muted">Rizz류 답장봇</div>
          <div className="text-accent">LuvOS</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.k}
            className={`grid grid-cols-3 text-xs px-3 py-2.5 gap-2 ${
              i < rows.length - 1 ? 'border-b border-border/70' : ''
            }`}
          >
            <div className="text-muted font-medium">{r.k}</div>
            <div className="text-muted/90">{r.rizz}</div>
            <div className="text-text">{r.luvos}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ============================================================================
// Final CTA
// ============================================================================
function FinalCTA() {
  return (
    <section className="px-6 py-12 flex flex-col items-center text-center">
      <ListTodo size={32} className="text-accent mb-3" />
      <h2 className="text-2xl font-bold tracking-tight leading-tight">
        네 사랑을 그만
        <br />
        기억력으로 운영하지 마.
      </h2>
      <p className="mt-3 text-sm text-muted">
        2분이면 첫 프로파일 완성.
        <br />
        첫 전략은 상대 1명 + 대화 5줄이면 뽑혀.
      </p>

      <Link
        href="/onboarding"
        className="mt-6 w-full rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-white font-semibold py-4 flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
      >
        지금 시작 <ArrowRight size={18} />
      </Link>
    </section>
  )
}

function Footer() {
  return (
    <div className="px-6 py-6 text-center text-[10px] text-muted/50 border-t border-border">
      LuvOS · Circle21 · 2026
      <br />
      Stateful · Goal-driven · Closed-loop
    </div>
  )
}

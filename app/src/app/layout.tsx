import type { Metadata, Viewport } from 'next'
import './globals.css'
import { BottomNav } from '@/components/BottomNav'
import { getOrNullSelf } from '@/lib/actions/self'

export const metadata: Metadata = {
  title: 'LuvOS',
  description: '너의 연애를 운영하는 법',
  applicationName: 'LuvOS',
  manifest: '/manifest.json',
}

// LLM 호출하는 server action 위해 함수 타임아웃 늘림.
// Vercel Hobby=10s 고정, Pro=60s까지. 값만 지정하고 플랜이 허용하는 만큼 적용됨.
export const maxDuration = 60

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const self = await getOrNullSelf().catch(() => null)
  const showNav = !!self

  return (
    <html lang="ko">
      <body className="min-h-screen bg-bg text-text">
        {/* Desktop: 그라데이션 + 폰 프레임 레이아웃. Mobile: 풀스크린 */}
        <div
          className="min-h-screen flex md:items-center md:justify-center
                     md:bg-[radial-gradient(ellipse_at_top,rgba(177,77,255,0.15),transparent_50%),radial-gradient(ellipse_at_bottom,rgba(255,77,125,0.1),transparent_50%)]
                     md:py-8 md:px-4"
        >
          {/* 데스크톱 좌측 브랜딩 */}
          <aside className="hidden lg:flex flex-col justify-center mr-12 max-w-sm">
            <div className="text-5xl font-bold tracking-tight bg-gradient-to-br from-accent to-accent-2 bg-clip-text text-transparent">
              LuvOS
            </div>
            <div className="mt-4 text-lg text-muted leading-relaxed">
              너의 연애를 <br />
              운영하는 법.
            </div>
            <div className="mt-6 text-xs text-muted/70 leading-relaxed">
              Stateful multi-target dating OS.<br />
              Progressive profiling · Goal-driven strategy · Closed-loop learning.
            </div>
            <div className="mt-6 text-[11px] text-muted/50">
              📱 이 앱은 모바일 퍼스트로 설계됐어.<br />
              데스크톱에서는 폰 프레임으로 미리 볼 수 있어.
            </div>
          </aside>

          {/* 폰 프레임 */}
          <div
            className="relative w-full md:w-[420px]
                       min-h-screen md:min-h-0 md:h-[860px] md:max-h-[90vh]
                       bg-bg flex flex-col overflow-hidden
                       md:rounded-[2.5rem] md:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)]
                       md:ring-1 md:ring-border md:border-[12px] md:border-[#0f0f15]"
          >
            {/* 상단 notch (데스크톱만) */}
            <div
              className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2
                         w-24 h-6 bg-[#0f0f15] rounded-b-2xl z-50"
              aria-hidden="true"
            />
            <main className="flex-1 flex flex-col overflow-y-auto safe-bottom">
              {children}
            </main>
            {showNav && <BottomNav />}
          </div>
        </div>
      </body>
    </html>
  )
}

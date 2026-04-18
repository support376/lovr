import type { Metadata, Viewport } from 'next'
import './globals.css'
import { BottomNav } from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'LuvOS',
  description: '너의 연애를 운영하는 법',
  applicationName: 'LuvOS',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-bg text-text">
        <div className="mx-auto w-full max-w-md min-h-screen flex flex-col">
          <main className="flex-1 flex flex-col safe-bottom">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  )
}

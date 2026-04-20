import { signIn } from '@/auth'
import { Button, Card } from '@/components/ui'

export const dynamic = 'force-dynamic'

/**
 * 로그인 스캐폴딩. AUTH_GOOGLE_ID/SECRET 있으면 Google 버튼 작동.
 * 없으면 ENV 안내만 보여주고 홈으로 돌려보냄 → 기존 단일유저 경로 유지.
 */
export default function LoginPage() {
  const configured =
    !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET

  return (
    <main className="flex-1 px-5 py-10 flex flex-col gap-6 max-w-sm mx-auto">
      <h1 className="text-2xl font-bold">로그인</h1>

      {!configured ? (
        <Card className="border-warn/40 bg-warn/5">
          <div className="text-sm leading-relaxed">
            Google OAuth 환경변수가 아직 설정되지 않았어.
            <br />
            <code className="text-[11px] bg-surface-2 px-1.5 py-0.5 rounded">
              AUTH_SECRET
            </code>{' '}
            /{' '}
            <code className="text-[11px] bg-surface-2 px-1.5 py-0.5 rounded">
              AUTH_GOOGLE_ID
            </code>{' '}
            /{' '}
            <code className="text-[11px] bg-surface-2 px-1.5 py-0.5 rounded">
              AUTH_GOOGLE_SECRET
            </code>{' '}
            Vercel 프로젝트 환경변수에 추가하면 활성화돼.
          </div>
        </Card>
      ) : (
        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/' })
          }}
        >
          <Button type="submit" className="w-full">
            Google로 계속하기
          </Button>
        </form>
      )}
    </main>
  )
}

import { LoginClient } from './LoginClient'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <main className="flex-1 px-5 py-10 flex flex-col gap-6 max-w-sm mx-auto">
      <div>
        <h1 className="text-3xl font-bold">LuvOS</h1>
        <p className="text-sm text-muted mt-1">너의 연애를 운영하는 OS</p>
      </div>
      <LoginClient />
    </main>
  )
}

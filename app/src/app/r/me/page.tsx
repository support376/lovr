import { redirect } from 'next/navigation'

// Legacy route — SelfForm 은 MY 탭(/me) 으로 이관.
export default function LegacyMyProfile() {
  redirect('/me')
}

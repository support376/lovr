/**
 * Auth.js v5 config — Google OAuth.
 *
 * ⚠ 현재 상태: 스캐폴딩만. 실제 사용하려면 아래 ENV 필요.
 *
 *   AUTH_SECRET=<openssl rand -base64 32>
 *   AUTH_GOOGLE_ID=<Google Cloud Console OAuth 2.0 Client ID>
 *   AUTH_GOOGLE_SECRET=<client secret>
 *
 * 설정 안 되면 `signIn`은 오류를 던지고, 기존 SELF_ID 하드코딩 경로는 그대로 동작.
 * 카카오 OAuth는 별도 Provider 추가 필요 (next-auth provider 문서 참고).
 */
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  // DB adapter는 users 테이블 마이그레이션 + per-user Turso 전환 설계 후 붙인다.
  // 현재는 JWT only.
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
})

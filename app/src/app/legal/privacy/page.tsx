export default function PrivacyPage() {
  return (
    <>
      <h1>개인정보 처리방침</h1>
      <p className="text-[11px] text-muted/60 !mb-6">최종 갱신: 2026-04-22</p>

      <h2>1. 우리는 데이터를 팔지 않아</h2>
      <p>
        LuvOS는 유저가 입력한 모든 정보(프로필, 상대 정보, 이벤트 기록, AI 대화)를
        <strong> 제3자에게 제공·판매·공유하지 않아</strong>. 광고 네트워크·데이터 브로커·
        마케팅 파트너에게 넘기는 일 없음.
      </p>

      <h2>2. 수집하는 정보</h2>
      <ul>
        <li>
          <strong>계정</strong>: Google OAuth 로그인 시 이메일·프로필 사진(Supabase Auth 저장)
        </li>
        <li>
          <strong>유저 입력</strong>: 본인 프로필, 상대 정보, 이벤트 기록, AI 대화 내용
        </li>
        <li>
          <strong>추론된 데이터</strong>: 이벤트로부터 추출된 관계 모델·케미 분석 (Anthropic Claude 사용)
        </li>
      </ul>

      <h2>3. 저장 위치</h2>
      <p>
        모든 데이터는 <strong>Supabase Postgres</strong> (서울 리전)에 저장됨.
        Row Level Security (RLS) 로 유저 간 완전 격리. 다른 유저가 네 데이터를 볼 수 없음.
      </p>

      <h2>4. AI 처리 (Anthropic)</h2>
      <p>
        AI 답변·모델 추출 시 필요한 맥락(프로필 일부 + 최근 이벤트)이 Anthropic API로 전송됨.
      </p>
      <ul>
        <li>Anthropic은 API 요청 데이터를 <strong>기본적으로 학습에 사용하지 않음</strong></li>
        <li>Anthropic의 자체 Zero Data Retention 정책 준수</li>
        <li>전송은 TLS 1.3 암호화</li>
      </ul>

      <h2>5. 쿠키·추적</h2>
      <p>
        필수 쿠키(로그인 세션·현재 상대 focus)만 사용. 마케팅·분석용 3자 트래커 없음.
      </p>

      <h2>6. 유저 권리</h2>
      <ul>
        <li><strong>열람</strong>: 설정 → 데이터 내보내기로 전체 데이터 JSON 다운로드</li>
        <li><strong>삭제</strong>: 설정 → 계정 삭제로 모든 데이터 즉시 영구 삭제</li>
        <li><strong>수정</strong>: 설정 탭에서 프로필·상대 정보 언제든 수정 가능</li>
      </ul>

      <h2>7. 보관 기간</h2>
      <p>
        계정 활성 상태인 한 보관. 계정 삭제 시 즉시 hard-delete. 백업 로그에는
        최대 30일간 남을 수 있음(Supabase 백업 주기).
      </p>

      <h2>8. 미성년자</h2>
      <p>
        만 14세 미만은 사용 금지. 14~19세는 법정대리인 동의 필요.
      </p>

      <h2>9. 문의</h2>
      <p>
        개인정보 관련 문의: <strong>first@dreamframe.org</strong>
      </p>

      <h2>10. 변경 고지</h2>
      <p>
        방침 변경 시 앱 내 공지 + 로그인 화면 배너로 최소 7일 전 알림.
      </p>
    </>
  )
}

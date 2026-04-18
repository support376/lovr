# LuvOS

> 너의 연애를 운영하는 법 — Stateful multi-target dating OS.

**앱 본체는 [`app/`](./app) 디렉터리.** Next.js 15 App Router + Drizzle ORM + libSQL(로컬 SQLite / Turso) + Anthropic Sonnet 4.6.

## 로컬 실행

```bash
cd app
cp .env.local.example .env.local
# .env.local 에 ANTHROPIC_API_KEY 채우기
npm install
npm run dev
# → http://localhost:3000
```

## 기능 (Tier 1 완료)

- Self 온보딩 → 자동 AI 프로파일링 (Big Five / 애착 / 강점·약점 / patterns)
- Target 다중 관리 + 목표값 설정 (preset 7종 + 커스텀)
- 대화 붙여넣기 / 한 줄 / 메모 / 데이트 기록 입력
- 매 입력마다 Target 프로파일 점진 업데이트 (confidence 누적, 스냅샷 히스토리)
- 목표 기반 Strategy 생성 (situation report + 목표 수렴도 + 다음 수 3-4개 + 메시지 초안)
- 전략 채택 → 결과 라벨링 (잘됨/모호/망함)
- **클로즈드 루프**: outcome 저장 즉시 Self 재프로파일 → playbook/weaknesses 갱신 → 다음 전략이 이 학습을 참조

STT/실시간 음성은 외부 모듈이 붙을 자리만 남겨둠 (`addBulkMessages` server action).

## Vercel 배포

### 1. Turso DB 생성

```bash
# Turso CLI 설치 (Windows: https://docs.turso.tech/cli/installation)
turso auth signup
turso db create luvos
turso db show luvos --url          # → DATABASE_URL
turso db tokens create luvos       # → TURSO_AUTH_TOKEN
```

### 2. Vercel 프로젝트 생성

1. https://vercel.com/new 에서 이 레포 import
2. **Root Directory**: `app` 로 설정 (중요)
3. Framework: Next.js 자동 감지
4. Environment Variables 3개 추가:
   - `ANTHROPIC_API_KEY` = `sk-ant-...`
   - `DATABASE_URL` = `libsql://luvos-<org>.turso.io` (Turso가 준 URL)
   - `TURSO_AUTH_TOKEN` = `...` (Turso가 준 토큰)
5. Deploy

배포 완료 후 `https://<project>.vercel.app` 접속.

## 주요 경로

| 경로 | 설명 |
|---|---|
| `/onboarding` | 첫 실행 시 자동 리다이렉트. Self 생성 + 1차 AI 프로파일링 |
| `/` | 홈 — Self 요약 카드 + Target 리스트 |
| `/me` | Self Dossier (Big Five / 강점 / 약점 / patterns / Playbook) + 재분석 |
| `/t/new` | 새 Target 등록 |
| `/t/[id]` | Target Dossier + 타임라인 |
| `/t/[id]/add` | Interaction 입력 (붙여넣기/한줄/메모/데이트) |
| `/t/[id]/strategy` | AI 전략 생성 + 채택 + 결과 라벨 |
| `/t/[id]/edit` | 목표·단계·메타 편집 |

## 아키텍처

```
app/src/
  app/              # Next.js App Router 라우트
  components/       # 공통 UI (MobileShell, BottomNav, Card, etc.)
  lib/
    db/
      schema.ts     # Drizzle 스키마 + 타입
      client.ts     # libSQL 커넥션 (로컬 SQLite or Turso)
      init.ts       # 스키마 부트스트랩 (CREATE TABLE IF NOT EXISTS)
    ai/
      client.ts          # Anthropic SDK wrapper (tool-use 강제)
      prompts.ts         # Dossier 렌더
      profile-updater.ts # Target Progressive Profiling
      self-profiler.ts   # Self Auto-Profiler (playbook 집계 포함)
      strategy-engine.ts # Strategy 생성 (과거 outcome + playbook 반영)
    actions/        # Server Actions
      self.ts
      targets.ts
      interactions.ts
      strategy.ts
```

## 설계 원칙

- **Stateful over stateless**: Rizz/DatingAI 같은 1회성 답장 도구와 선 긋기. 모든 입력이 축적.
- **Progressive profiling**: 시간 지날수록 Target·Self 모두 날카로워짐. confidence 필드로 추론 신뢰도 표기.
- **Goal-driven**: Target별 목표가 북극성. 전략은 그 쪽으로만.
- **Closed loop**: 전략 채택 + outcome 라벨 → Self playbook 갱신 → 다음 전략이 이를 읽음.
- **Text-first**: STT/음성은 외부 모듈 담당. 내부는 `{sender, text}[]` 계약만 지킴.

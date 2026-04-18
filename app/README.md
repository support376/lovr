# LuvOS · MVP Tier 1

모바일 퍼스트 개인 연애 OS. 텍스트 입력 전제 (STT는 나중에 붙임).

## 실행

```bash
cd app
cp .env.local.example .env.local
# .env.local 의 ANTHROPIC_API_KEY 채우기
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 열고 폰 사이즈로 보거나 실제 폰에서 접속.

## 현재 구현된 것 (Tier 1 완)

- **DB**: Drizzle ORM + libSQL(SQLite). 첫 요청 시 스키마 자동 생성.
  - `selves` · `targets` · `interactions` · `profile_snapshots` · `strategies`
- **Self 온보딩**: 이름/나이/성별/관계지향/톤 샘플 3개/자유메모.
- **Target CRUD**: 아바타 이모지, 기본 메타, 목표(preset 6종 + 커스텀 + 시한), 단계 7종.
- **Interaction 입력**: 4가지 탭
  - 대화 붙여넣기 (「나: / 상대:」 prefix 자동 파싱)
  - 한 줄 메시지
  - 자유 메모
  - 데이트 기록 (장소/분위기/시간/노트)
- **Progressive Profiling**: Sonnet 4.6 + tool use로 Big Five / Attachment / CommStyle / Values 각 차원에 value+confidence 산정. 데이터 양에 비례해 confidence 상한 관리. `profile_snapshots`에 히스토리 남김.
- **Strategy Engine**: 목표·최근 25개 Interaction·프로파일을 묶어 Situation Report + 목표 수렴도 + 다음 수 3-4개 (risk/reward/메시지 초안/타이밍).
- **Outcome 라벨링**: 채택한 옵션에 대해 잘됨/모호/망함 피드백 → 추후 Learning Loop 입력.

## 아키텍처

```
app/
  src/
    app/                      # Next.js App Router
      page.tsx                # 홈 (Target 카드 리스트)
      onboarding/             # 첫 실행 Self 생성
      me/                     # 내 프로파일 수정
      t/new/                  # 새 Target
      t/[id]/                 # Dossier
      t/[id]/add/             # Interaction 추가
      t/[id]/edit/            # 목표/단계/메타 편집
      t/[id]/strategy/        # AI 전략 생성 & 채택
    components/               # 공통 UI
    lib/
      db/
        schema.ts             # Drizzle 스키마 + 타입
        client.ts             # DB 인스턴스
        init.ts               # 스키마 부트스트랩
      ai/
        client.ts             # Anthropic SDK wrapper (tool-use 강제)
        prompts.ts            # Dossier 렌더 + 시스템 프롬프트
        profile-updater.ts    # Progressive Profiling
        strategy-engine.ts    # Strategy 생성
      actions/                # Server Actions
        self.ts
        targets.ts
        interactions.ts
        strategy.ts
```

## 다음 단계 후보 (Tier 2)

- 스크린샷 OCR (카톡)
- Pre-date 브리핑
- 주간 리포트
- Playbook 집계 뷰
- STT 연동 지점 (나중에 외부 모듈이 텍스트만 던져주면 됨 — `addBulkMessages` 그대로 사용)
- 다중 Target 비교 뷰

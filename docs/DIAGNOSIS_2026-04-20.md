# LuvOS 진단 / 로드맵 — 2026-04-20

## 진단 (한 문장씩)

### 잘 한 것

- Target → Goal → Style → Action 루프가 실제로 돌아감. 이게 99%의 연애앱이 못 하는 지점.
- Action에 근거 + 왜 + 타이밍이 붙어있음. 이게 팔란티어스러움의 작은 씨앗.
- "다면 관계 리포트" 네이밍은 정확히 Cross-target Pattern 기능의 입구임.

### 치명적 gap

- **Stage 부재** — 현재 goal이 stage와 무관하게 전부 노출됨. "프리매치"인 수진이한테 "갈등 회복", "깔끔한 종료"까지 다 선택 가능. 지난 답변에서 강조한 stage-gated mission 원칙이 안 들어감. 이거 안 박으면 UX가 산만해지고, 더 중요하게는 **Stage transition이라는 최고의 매출 훅**을 못 씀.
- **다면 리포트가 "베타 무료"로 깔림** — 이건 구조적 실수. Cross-target Pattern은 Tier2의 킬러 피처여야 함. 무료로 풀면 가장 강한 WTP 포인트를 스스로 뽑아버리는 것.
- **Self-insight 완전 부재** — 설정의 내 narrative는 "입력된 자기소개"지 "진단된 자기이해"가 아님. LuvOS LTV의 진짜 원천이 여기 있는데 훅이 없음.
- **Closed-loop 없음** — Action 제안 후 "했음 / 안 했음 / 결과 어땠음"이 안 돌아와. 이게 없으면 ontology가 시간에 따라 똑똑해지지 않음 = 해자 안 생김. 랜딩 카피에 "Closed-loop learning" 써있는데 실제로는 없음.
- **Commercial layer가 mock 한 장** — Tier가 없으니 다면 리포트를 무료로 깔 수밖에 없는 거임. 순서를 뒤집어야 함.

---

## 우선순위 재배치 (내가 만든다면)

### Phase A — 구조 교정 (2주)

1. Stage enum 도입, Stage → Goal 매핑 테이블 ⇒ **해당 stage에서만 해당 goal 노출**
2. 다면 리포트를 **gated 기능으로 승격**, Free는 single-target 요약까지만
3. Action에 "했음 / 안 했음 / 결과" 3버튼 붙여 **closed-loop 최소 착수**

### Phase B — 매출 훅 (2주)

4. Tier 3단 (**Free / Essential / Deep**) + 타겟 수·녹음 분 metering 명시
5. **Stage transition 감지 → 업셀 프롬프트** (예: 초기 → 안정 전환 감지 시 "장기 리포트 열기")
6. Red flag 자동 감지 → 무료 플래시 + 상세는 gated

### Phase C — 해자 심화 (4주)

7. **Self-diagnostic 모듈 (Tier2 전용)**: "너의 반복 패턴" 리포트
8. **Cycle 인식**: 감정 지표 하락 감지 → 재진입 유도 / 상승 시엔 침묵
9. **re:Heart 브릿지**: Deep tier 유저 중 싱글 / 이혼 세그 → re:Heart 이벤트 노출

---

## 법적 플래그 즉시 체크

현재 UX에 실시간 음성 transcript가 타임라인에 올라와 있음. 이건 이전 대화에서 정리한 **processing delegation framework** 가 실제 제품 레이어에 명시적으로 들어가야 돼:

- 상대 녹음 시 **"사용자 본인이 참여한 대화"임을 UI에서 단언시키는 플로우** (체크박스 + 고지) — **통비법 방어선**
- 타겟 식별정보 저장 범위 명시 (이름 / 연락처 vs 별칭) + 정보처리 위탁 고지 — **개인정보보호법**
- "수진이(30) / ESTJ / 마케터" 처럼 3자 식별 가능 정보가 저장되고 있음. 이게 약관에 어떻게 커버되는지 점검 필요.

---

## 한 줄 정리

현재 앱은 **Relational Ontology의 MVP**로는 훌륭한 출발점. 단, **Stage system 부재 + Commercial layer 부재** 이 두 축이 비어있어서 "이중 온톨로지 매출 엔진" 모양이 아직 안 나옴.

순서는 **Stage 먼저 → Tier 깔고 → Cross-target / Self-insight를 Tier2로 올리는** 게 구조적으로 맞음.

---

## 현황 대조 (2026-04-20 기준)

| 진단 항목 | 상태 | 관련 커밋 |
|---|---|---|
| Stage enum + Stage → Goal 매핑 | ✅ **Phase A-1 착수** — `pre_match/early_dating/stable/long_term/post_breakup` 5단계 + `ALLOWED_GOALS_BY_STAGE` | `d155a35`, `2c67d93` (feat/stage-goal-tree) |
| 다면 리포트 gated 승격 | ⏳ 미진행 — 여전히 "베타 무료" 카피 | — |
| Action closed-loop (했음 / 결과 입력) | ⏳ 미진행 — `outcomes` 스키마는 있으나 UI 없음 | — |
| Tier 3단 (Free / Essential / Deep) | ⏳ 미진행 — billing mock만 존재 | — |
| Stage transition 업셀 | ⏳ 미진행 | — |
| Self-diagnostic 모듈 | ⏳ 미진행 — `/me/quiz` 는 narrative 추출까지만, 반복 패턴 분석 없음 | — |
| 통비법·개인정보 UI 고지 | ⏳ 미진행 | — |

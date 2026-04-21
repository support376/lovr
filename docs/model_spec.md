# LuvOS 관계 모델 스펙 v3

## Input 3-tier

### Tier 1 · Static (유저 편집, 드물게 변경)
- **Self**: displayName · age · gender · occupation · rawNotes
- **Partner**: displayName · age · gender · occupation · rawNotes · knownConstraints
- **Relationship**:
  - `state` (5 enum) — 관계의 현재 위상
  - `goal` (state-gated enum) — 유저가 원하는 방향
  - `description` — "직장 후임" 한 줄
  - `timelineStart` · `timelineEnd`

### Tier 2 · Ongoing (append-only)
- **Events**: `chat | event | note` × content × timestamp?

### Tier 3 · Derived (시스템 자동)
- **RelationshipModel**: rules (a) + baseline (b)

---

## State (5개 enum)

| state | 의미 |
|---|---|
| `exploring` | 탐색·썸 (아직 사귄 적 없음) |
| `dating` | 사귀는 중 |
| `serious` | 장기·결혼·동거 |
| `struggling` | 갈등 중·이별 직전 |
| `ended` | 이별 후 (재연결 시도 포함) |

## Goal (state 별 허용 목록)

| state | allowed goals |
|---|---|
| `exploring` | `qualify` / `advance` / `early_exit` |
| `dating` | `deepen` / `clarify` / `resolve_conflict` / `pace` |
| `serious` | `maintain` / `revive` / `marriage_prep` / `check_fit` |
| `struggling` | `heal` / `clarify_future` / `graceful_exit` |
| `ended` | `closure` / `reconnect_try` / `learn_pattern` |

State 전환 시 현 goal 이 새 state 에 없으면 null 화 → 유저 재선택.

---

## 8축 (X 와 Y 공유)

| id | X 의미 | Y 의미 |
|---|---|---|
| `proximity_push` | 내가 접근·적극 | 상대도 접근 |
| `proximity_pull` | 내가 거리두기 | 상대도 물러남 |
| `emotion_open` | 내가 감정 공개 | 상대도 감정 열기 |
| `emotion_hide` | 내가 감정 숨김 | 상대도 닫힘 |
| `commit_push` | 내가 관계 격상 | 상대도 commit |
| `commit_hold` | 내가 현상 유지 | 상대도 유지 |
| `conflict_press` | 내가 갈등 표출 | 상대도 방어 |
| `conflict_soothe` | 내가 갈등 완화 | 상대도 풀림 |

**축은 고정.** 추가 금지.

## intensity 스케일

규칙의 `intensity`: **0 ~ 100** (양수만).

**반대 방향 반응은 음수 쓰지 말고 yAxis 를 반대 축으로 지정**.
8축은 대립쌍이 있음:
- proximity_push ↔ proximity_pull
- emotion_open ↔ emotion_hide
- commit_push ↔ commit_hold
- conflict_press ↔ conflict_soothe

예:
- `pull → push (75)` 내 거리두기 → 상대 접근 (고전적 당김)
- `commit_push → commit_hold (60)` 내 격상 제안 → 상대 현상유지 (회피)
- `conflict_press → conflict_soothe (40)` 내 갈등 표출 → 상대 완화

강도:
- 0~30 약함 · 40~60 중간 · 70~100 강함

## baseline

각 축 **0~100** (상대 평상시 해당 행동 경향).

```
{
  proximity_push: 45,
  proximity_pull: 20,
  emotion_open: 30,
  emotion_hide: 60,
  commit_push: 15,
  commit_hold: 70,
  conflict_press: 10,
  conflict_soothe: 55
}
```

추가로 `narrative` 3~5문장 — 축으로 안 잡히는 톤.

---

## Model 스키마

```ts
type RelationshipModel = {
  rules: Rule[]              // a
  baseline: Baseline         // b
  lastEventIds: string[]     // 증분 업데이트 기준점
  version: number
  evidenceCount: number
  confidenceOverall: number
  updatedAt: number
  narrative: string          // 3~5 문장 축약
}

type Rule = {
  xAxis: Axis                // 8축 중 하나
  yAxis: Axis
  intensity: number          // -100 ~ +100
  observations: number
  confidence: number         // 0 ~ 100
  examplesX: string[]        // 원문 조각 2~3
  examplesY: string[]
  evidenceEventIds: string[]
  lastUpdated: number
}

type Baseline = {
  axes: Record<Axis, number> // 0~100 per axis
  narrative: string
}
```

---

## 업데이트 정책

- **MVP**: 수동 "모델 추출" 클릭 시 전체 재추출.
- **Phase B**: 새 event 5개 쌓이면 증분 (lastEventIds 이후만 LLM). Beta-Binomial confidence.

## Extraction 프롬프트 맥락 블록

```
## [관계 맥락]
state: dating (사귀는 중)
goal: clarify (진심 확인)
description: 소개팅 3회차 · 사내 인연 아님
timelineStart: 2026-02-14
[timelineEnd 없음]

## [Self]
...
## [Partner]
...
## [Events N개]
...
## [현재 model — v7]  (있으면)
```

## Simulation 프롬프트 맥락 블록

위 + 유저 제안 X 추가:
```
## [제안 X]
"서연한테 감정 직설 고백하면?"
```

**goal 은 예측에 개입 X** (예측은 사실 기반). 대신 **goal 유리도** 주석으로 output 에 포함:
- goal `advance` 에서 Y=proximity_pull 은 🔽 (불리)
- goal `closure` 에서 Y=proximity_pull 은 🔼 (유리)

## Simulation 계산

1. LLM 이 X → `xAxis ∈ AXES` 분류
2. 매칭 rules 가져오기 (xAxis 일치)
3. Y 계산:
   - yAxis = 매칭 rules 중 confidence 최고의 yAxis (또는 가중 최빈)
   - y_intensity = `Σ (intensity × confidence) / Σ confidence`
4. 매칭 없으면 baseline 상위 축으로 fallback
5. LLM 이 수치 + state/goal 참조해 자연어 rendering

## LLM 주입 포맷 예시

```
## [관계 모델 v7 · 신뢰도 65%]

### Baseline
- proximity_push 45 / proximity_pull 20
- emotion_open 30 / emotion_hide 60
- commit_push 15 / commit_hold 70
- conflict_press 10 / conflict_soothe 55
narrative: (3~5 문장)

### Rules (관찰 강한 순)
1. [pull → push +75] 내 거리두기 시 상대 먼저 연락
   관찰 3회 · 신뢰 72%
   ex_X: "48h 무응답" / ex_Y: "서연 '바빴어?' 메시지"
2. ...
```

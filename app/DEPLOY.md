# LuvOS 배포 가이드 (Vercel + Turso)

## 왜 Turso?

Vercel serverless는 stateless. 현재 `luvos.db` 파일은 로컬 dev용. 프로덕션에선 **Turso**(libSQL remote — 이미 `db/client.ts`가 지원)가 가장 마찰 없음. 무료 티어 9GB + 500M rows/month.

## 배포 절차 (10분)

### 1. Turso DB 만들기
```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
turso db create luvos
turso db show luvos --url       # → TURSO_DATABASE_URL
turso db tokens create luvos    # → TURSO_AUTH_TOKEN
```

### 2. Vercel 로그인 + 링크
```bash
cd C:/Users/user/Desktop/claude/Luvos/luvos/app
vercel login                     # 브라우저 로그인
vercel link                      # 프로젝트 링크 (새로 생성 선택 가능)
```

### 3. 환경변수 설정
```bash
vercel env add ANTHROPIC_API_KEY production
vercel env add TURSO_DATABASE_URL production
vercel env add TURSO_AUTH_TOKEN production
```
각각 입력창에 값 붙여넣기.

### 4. 첫 배포
```bash
vercel --prod
```
→ `https://luvos-xxx.vercel.app` 나옴.

## 이후 바로바로 배포하는 법

### 옵션 A — GitHub 연동 (권장)
```bash
git init
git add .
git commit -m "LuvOS MVP"
# GitHub에 레포 만든 뒤
git remote add origin https://github.com/USERNAME/luvos.git
git push -u origin main
```
Vercel 대시보드에서 해당 레포 import → 이후 **push할 때마다 자동 배포**.

### 옵션 B — 수동 프로덕션 배포
```bash
vercel --prod
```
→ 1분 내 재배포.

### 옵션 C — Preview 배포 (브랜치별)
```bash
vercel
```
→ 프리뷰 URL 나옴, 본인만 볼 수 있음. 피드백 루프에 편함.

## 주의

- `luvos.db`, `repro.db`, `test.db` 등 로컬 DB 파일은 **커밋 금지** — `.gitignore`에 이미 포함.
- `ANTHROPIC_API_KEY`는 절대 레포에 커밋 금지.
- Vercel Hobby는 함수 타임아웃 10초. LLM 호출이 긴 경우 Pro로 올려 `vercel.json`의 `maxDuration: 60` 완전 활용.

## 로컬 개발 유지
로컬에선 Turso 없이 여전히 `luvos.db` 파일로 작동 (`db/client.ts`의 fallback).
```bash
npm run dev
```

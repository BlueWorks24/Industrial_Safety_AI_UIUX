---
title: "디자인 자동화 & AI 설계 도구 비교"
type: note
category: research
status: active
priority: high
tags: [design-skill, ai-ux, automation, playwright-cli, taste-skill, impeccable, awesome-design, img2threejs, ui-ux-pro-max]
created: "2026-09-24"
area: notes
---

# 디자인 자동화 & AI 설계 도구 비교

## 비교표

| 도구 | 주요 용도 | 기술 스택 | 설치 난도 | 비용 | 주요 특징 |
|------|---------|---------|---------|------|---------|
| **Playwright CLI** | AI 에이전트용 브라우저 자동화 | Node.js (`@playwright/cli`) | 낮음 | 무료 오픈소스 | MCP 대비 토큰 효율적, 세션 상태 유지 |
| **Taste skill** | AI 생성 UI 품질 개선 | SKILL.md 파일 기반 | 매우 낮음 | 무료 오픈소스 | "Slop" 방지, 조정 가능한 3개 파라미터 |
| **Impeccable** | 디자인 어휘 제공 & UI 폴리싱 | SKILL.md 파일 기반 | 매우 낮음 | 무료 오픈소스 | 20개 설계 명령어, 7개 심화 가이드 |
| **Awesome Design.md** | 브랜드 스타일 가이드 | SKILL.md + DESIGN.md 쌍 | 낮음 | 무료 오픈소스 | 67개 사전 제작된 설계 시스템 |
| **img2threejs** | 이미지→3D 모델 변환 | Python + TypeScript (Three.js) | 중간 | 무료 오픈소스 | 코드 기반(비-메시) 절차적 출력 |
| **UI UX Pro Max** | 디자인 인텔리전스 DB·디자인 시스템 자동 생성 | SKILL.md + Python 검색 스크립트 | 낮음 | 무료 오픈소스 (MIT) | 제품 유형별 추론 규칙으로 스타일·팔레트·폰트 매칭 |

---

## 상세 가이드

### 1. Playwright CLI — AI 에이전트용 브라우저 자동화

> 표준 Playwright 테스트 프레임워크(`@playwright/test`)와는 **별개의 도구**다. 정확한 패키지명은 `@playwright/cli`([microsoft/playwright-cli](https://github.com/microsoft/playwright-cli))이며, "코딩 에이전트를 위해 특별히 구축된 명령행 인터페이스"다.

**특징:**
- Playwright MCP의 대안으로, 페이지 데이터를 LLM 컨텍스트에 직접 로드하지 않아 토큰 효율적
- 셀렉터 검사, 스크린샷 캡처, 코드 생성(codegen) 기능 내장
- CLI 호출 사이에도 쿠키/스토리지 상태 유지 (세션 관리)
- `playwright-cli show` 명령으로 실행 중인 세션을 시각적으로 모니터링 가능
- Claude Code, GitHub Copilot, Cursor 등과 연동

**용도:**
- 코딩 에이전트를 통한 웹 자동화 및 UI 디버깅
- 사용자 흐름을 기록해 테스트 코드 생성
- 요소 검사 및 탐색적 테스팅

**단점:**
- Node.js 18 이상 필요
- 헤드리스 세션은 명령 없이 1시간 경과 시 자동 종료
- 파일 접근이 기본적으로 제한됨 (`allowUnrestrictedFileAccess` 옵션 필요)

**설치방법:**
```bash
npm install -g @playwright/cli@latest
playwright-cli install --skills
```
- `playwright-cli --help`로 전체 명령 확인

---

### 2. Taste skill — AI UI 품질 개선 프레임워크

**특징:**
- AI 생성 코드에서 "Slop" (평범하고 제너릭한 결과물) 방지
- 지원 도구: ChatGPT Images, Codex, Cursor, Claude Code
- 프레임워크 독립적 (React, Vue, Svelte 등 모두 지원)
- 조정 가능한 3개 파라미터로 출력 강도 제어:
  - `DESIGN_VARIANCE` — 레이아웃 실험 강도
  - `MOTION_INTENSITY` — 애니메이션 깊이
  - `VISUAL_DENSITY` — 화면당 정보 밀도
- 2026 대규모 재작성: 브리프 추론, 설계 시스템 매핑, GSAP 스켈레톤, 재설계 감사

**용도:**
- AI 에이전트가 독특하고 고품질의 UI 생성 유도
- 템플릿처럼 보이는 인터페이스 방지
- 일관된 설계 언어 적용

**단점:**
- 스킬 파일 유지보수 필요
- AI 모델의 설계 이해도에 의존
- 프로젝트별 파라미터 튜닝 필요

**설치방법:**
```bash
npx skills add https://github.com/Leonxlnx/taste-skill
# 개별 스킬만 설치할 경우
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
```
- 또는 `SKILL.md` 파일을 프로젝트나 대화에 직접 복사

---

### 3. Impeccable — AI 설계 어휘 강화 도구

**특징:**
- jQuery UI 창시자 Paul Bakaus 제작
- 원본 frontend-design 스킬 확장 + 20개 전문 설계 명령어
- 7개 심화 가이드: 타이포그래피, 색상 대비, 공간 설계, 모션, 인터랙션, 반응형, UX 라이팅
- `/polish`, `/typeset`, `/arrange`, `/bolder`, `/quieter`, `/overdrive` 등 명령어
- `/critique` 명령으로 시각 계층, 정보 아키텍처, 감정적 공명 분석

**용도:**
- AI가 생성한 UI를 우아하고 세련된 디자인으로 업그레이드
- 타이포그래피 및 색상 최적화
- 인터랙션 및 모션 개선
- 포괄적 UX 검토

**단점:**
- Impeccable 명령어 학습 필요
- 설치 후 세션당 1회 컨텍스트 로드 단계 필요 (누락 시 오작동)
- 최종 결과는 여전히 기초 모델 품질에 의존

**설치방법:**
```bash
npx skills add https://github.com/pbakaus/impeccable --skill impeccable
```
- 설치 후 세션당 한 번 `<skill-base-dir>/scripts/impeccable context` 실행 필요
- Windows(sh 없는 셸)에서는 `impeccable.cmd` 사용
- 런처 실패 시 프로젝트의 PRODUCT.md/DESIGN.md를 직접 읽고 진행 가능

---

### 4. Awesome Design.md — AI용 설계 시스템 컬렉션

**특징:**
- **67개**의 디자인 스킬 제공 (Vercel, Linear, Stripe, Apple, BMW, Tesla, Notion 등 브랜드 스타일 포함)
- 각 스킬은 `SKILL.md`(AI 에이전트 지침 — 브랜드 미션, 스타일 기초, 컴포넌트 패밀리, 접근성 규칙)와 `DESIGN.md`(사람이 읽는 설계 개요 및 유지보수 노트) 쌍으로 구성
- 전용 CLI(`typeui.sh`)로 스킬을 프로젝트에 가져옴
- Claude Code, Cursor 등과 호환

**용도:**
- AI 생성 UI를 특정 브랜드 스타일로 만들기
- 설계 시스템 없는 프로젝트에서도 일관성 유지
- 빠른 프로토타입 개발

**단점:**
- 정적 문서 (자동 업데이트 불가, 브랜드 리뉴얼 반영 지연)
- 표준화된 형식이므로 세부 커스터마이징 제한적
- 정확한 브랜드 색상/타이포그래피 100% 일치 보장 안 함

**설치방법:**
```bash
# 전체 스킬 목록 확인
npx typeui.sh list

# 특정 스킬 가져오기 (예: Glassmorphism)
npx typeui.sh pull glassmorphism

# 특정 에이전트 지정
npx typeui.sh pull glassmorphism -p cursor,claude

# 실제 작성 없이 미리보기
npx typeui.sh pull glassmorphism --dry-run

# 커스텀 스킬 생성
npx typeui.sh generate
```

---

### 5. img2threejs — 이미지→Three.js 3D 모델 변환

> 정확한 프로젝트명은 **img2threejs**다.

**특징:**
- 참조 이미지를 코드 기반 절차적 Three.js 모델로 변환
- TypeScript 팩토리 함수 + JSON `ObjectSculptSpec` 출력 (검사·버전관리 가능)
- 명명된 컴포넌트, 재료, 변환, 피벗, 소켓, 콜라이더 포함
- 다중 메가바이트 메시 파일 대신 몇 KB의 코드로 결과물 표현
- Python 스크립트 + TypeScript 생성기로 구성
- Claude Code, Codex 등 기존 AI 호스트의 스킬 시스템 위에서 동작

**용도:**
- 제품 사진 → 인터랙티브 3D 모델 신속 생성
- 웹사이트에 애니메이션·인터랙션 준비된 3D 자산 통합
- 디자인 프로토타입 빠른 검증

**단점:**
- npm 패키지로 직접 설치 불가 (git clone 또는 스킬 설치기 필요)
- 단일 객체만 처리 (복잡한 장면 미지원)
- 명확히 보이는 객체 이미지 필요 (배경 간섭 시 품질 저하)

**설치방법:**
```bash
# 스킬 디렉토리에 직접 clone
git clone https://github.com/img2threejs/img2threejs.git ~/.claude/skills/img2threejs

# 또는 설치기 사용 (선택적 플러그인 추가 포함)
npx github:img2threejs/img2 install
img2 add img2threejs/plugin-cs2
```
- Claude Code에서 `/img2threejs Rebuild this object as a Three.js model`로 실행

---

### 6. UI UX Pro Max — 디자인 인텔리전스 DB

> 정확한 저장소는 [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)이다. 같은 이름의 포크 플러그인(`tadokoro-ryusuke/ui-ux-pro-max`, `pradyolsarvasiddi/ui-ux-pro-max`)이 마켓플레이스에 있으므로 원본인지 확인 후 설치한다.

**특징:**
- 로컬 검색형 디자인 DB: UI 스타일 79~84종(출처마다 다름), 컬러 팔레트 192종, 폰트 조합 74종, 제품 유형별 추론 규칙 192종, UX 가이드라인 98개, 차트 25종
- v2.0 핵심 기능: 제품 유형(핀테크, SaaS 등)을 추론해 디자인 시스템(스타일·색상·타이포그래피)을 자동 생성
- 22개 스택 지원: React, Next.js, Vue, Svelte, SwiftUI, Flutter, Tailwind, shadcn/ui, WPF, HTML/CSS 등
- Claude Code, Cursor, Windsurf, Copilot, Kiro, Antigravity 등 다수 에이전트 지원
- MIT 라이선스, GitHub 스타 약 13만(2026-09-28 README 기준, 요약 도구 경유 수치)

**용도:**
- 제품·산업 맥락에 맞는 색상 체계, 타이포그래피, 컴포넌트 구성 결정
- 설계 시스템이 없는 신규 프로젝트의 초기 디자인 시스템 생성
- 에이전트가 학습 데이터 추측 대신 DB 근거로 디자인 판단하도록 유도

**단점:**
- Python 3.x 필요 (표준 라이브러리만 사용, Windows에서는 `python` 명령 경로 확인)
- 데이터가 커서 무겁고, 번들 스크립트는 서드파티 코드이므로 설치 전 검토 필요
- 버전별 수치 변동이 커서 과거 노트의 수치(67 스타일·96 팔레트, 240+ 스타일)와 불일치
- 기존 설치 스킬(`design-consultation`, `design-review`)과 역할 일부 중복

**설치방법:**
```bash
# Claude Code 플러그인 마켓플레이스
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill

# 또는 CLI (프로젝트 단위, 전역 설치 없음)
npx ui-ux-pro-max-cli init --ai claude
```
- 전역 설치는 `uipro init --ai claude --global` (`npm install -g ui-ux-pro-max-cli` 선행)

---

## 선택 가이드

| 상황 | 권장 도구 |
|-----|---------|
| AI 코딩 도구에서 제너릭 UI 방지 | **Taste skill** + **Impeccable** |
| 특정 브랜드 스타일 통일 필요 | **Awesome Design.md** |
| AI 에이전트의 브라우저 자동화·UI 검증 | **Playwright CLI** |
| 제품 사진을 3D로 변환 | **img2threejs** |
| 포괄적 설계 개선 | **Impeccable** (모든 항목 검토) |
| 제품·산업 맞춤 디자인 시스템 초기 생성 | **UI UX Pro Max** |

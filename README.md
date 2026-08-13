# N-Queens Problem

체스판 위에 서로 공격할 수 없도록 N개의 퀸을 배치하는 고전 알고리즘 문제 **N-Queens** 를
사용자가 직접 플레이해 볼 수 있는 반응형 웹 게임입니다.

백엔드 서버, 데이터베이스, API 가 존재하지 않는 **100% 클라이언트 사이드(FE-only)** 애플리케이션이며,
모든 검증 로직은 브라우저에서 순수 함수로 동작합니다.

- 요구사항 원본: [`.claude/_workspace/requirements.md`](.claude/_workspace/requirements.md)
- 시스템 계약(단일 진실 공급원): [`.claude/_workspace/03_contracts/nqueens.contract.ts`](.claude/_workspace/03_contracts/nqueens.contract.ts)
- 아키텍처 상세: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 알려진 기술 부채: [docs/TECH-DEBT.md](docs/TECH-DEBT.md)

---

## 1. 기술 스택

`package.json` 에 고정된 실제 버전입니다.

| 구분 | 패키지 | 버전 |
| --- | --- | --- |
| 프레임워크 | `next` (App Router) | `16.3.0` |
| UI 런타임 | `react` / `react-dom` | `19.2.8` |
| 스타일링 | `tailwindcss` / `@tailwindcss/postcss` | `^4` |
| 언어 | `typescript` | `^5` |
| 테스트 러너 | `vitest` | `^4.1.10` (실행 확인 버전 `4.1.10`) |
| 테스트 환경 | `jsdom` | `^30.0.1` |
| 테스트 유틸 | `@testing-library/react` / `user-event` / `jest-dom` | `^16.3.2` / `^14.6.4` / `^7.0.1` |
| 린터 | `eslint` / `eslint-config-next` | `^9` / `16.3.0` |

- 상태 관리 라이브러리(Redux, Zustand 등)는 사용하지 않습니다. 상태는 커스텀 훅 `useNQueens` 가 단독으로 소유합니다.
- 폰트는 `next/font/google` 의 **Geist** 를 사용합니다 (`src/app/layout.tsx`).

## 2. 주요 기능

요구사항 정의서 §2 의 4개 기능 요구사항을 모두 구현합니다.

### 2.1 보드판 설정

- 정사각형 체스 보드를 렌더링하며, 보드 크기 **N은 4×4 ~ 8×8** 을 지원합니다 (`MIN_N = 4`, `MAX_N = 8`).
- 화면 상단의 Select Box(`SizeSelector`)로 N을 조절하고, **크기 변경 시 보드는 즉시 초기화**됩니다.
- 최초 진입 시 기본값은 고전 8-Queens 문제인 `N = 8` 입니다 (`DEFAULT_BOARD_SIZE`).

### 2.2 퀸 배치 및 취소 (좌클릭 토글)

- 빈 칸을 좌클릭(탭)하면 퀸이 배치되고, 퀸이 있는 칸을 다시 클릭하면 배치가 취소됩니다.
- 모바일 터치 환경을 고려하여 **우클릭(contextmenu)은 사용하지 않습니다.**
- 이미 N개를 모두 배치한 상태에서 빈 칸을 클릭하면 무시됩니다(초과 배치 불가). 기존 퀸의 취소는 정상 동작합니다.

### 2.3 제출 및 검증

화면 하단의 [제출] 버튼을 누르면 다음 순서로 단락 평가합니다.

| 판정 | 조건 | 결과 |
| --- | --- | --- |
| `incomplete` | 배치된 퀸 수 < N | **Toast 경고**(`N개의 퀸을 모두 배치해주세요`)만 띄우고 검증하지 않음. 보드 색상 불변 |
| `invalid` | 같은 행/열/대각선에 겹치는 퀸 존재 | 충돌에 **연루된 퀸들의 칸만 빨간색**으로 변경 |
| `solved` | 모든 퀸이 서로 공격 불가 | 모든 퀸의 칸을 **초록색**으로 변경 |

- 서로 공격하는 두 퀸은 **양쪽 모두** 빨간색이 됩니다(한쪽만 칠해지지 않습니다).
- 제출 후 보드를 변경하는 모든 액션(배치/취소, 크기 변경, 초기화)은 색상 결과를 즉시 `idle` 로 무효화합니다.
- 정답(`solved`) 상태에서는 [제출] 버튼이 비활성화됩니다.

### 2.4 보드 초기화

- **원형 화살표 아이콘이 중앙에 있는 정사각형 버튼**(`ResetButton`)을 제공합니다.
- 클릭 시 배치된 모든 퀸이 제거되고 타일 색상이 기본값으로 돌아갑니다. **보드 크기 N은 유지**됩니다.
- 배치된 퀸이 0개이면 버튼이 비활성화됩니다.

### 2.5 UI/UX

- **테마:** 모노톤 팔레트. 모든 색상은 `src/app/globals.css` 의 CSS 커스텀 프로퍼티(디자인 토큰)로 관리하며, `prefers-color-scheme: dark` 대응이 포함되어 있습니다.
- **반응형:** `--board-size: clamp(16rem, min(88vw, 60dvh), 44rem)` + `aspect-ratio: 1 / 1` 로, 미디어 쿼리 없이 모바일부터 2440×1440 대형 모니터까지 정사각 보드가 중앙에 유지됩니다.
- **애니메이션:** 모션 토큰 `--dur-fast(120ms)` / `--dur-base(220ms)` / `--ease-standard` 를 전 컴포넌트가 공유하여 속도와 easing 이 일관됩니다. `prefers-reduced-motion: reduce` 를 전역에서 존중합니다.
- **접근성:** 모든 타일은 `aria-label`(행/열/퀸 유무/상태)과 `aria-pressed` 를 가진 `<button>` 이며, 색상 정보는 문구로도 전달됩니다. Toast 는 `role="status"` + `aria-live="polite"` 라이브 리전을 사용합니다.

## 3. 시작하기

### 요구 환경

- Node.js (타입 정의는 `@types/node@^20` 기준)
- npm

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행 (http://localhost:3000)
npm run dev

# 3. 프로덕션 빌드
npm run build

# 4. 빌드 산출물 실행
npm run start
```

## 4. 개발 스크립트

`package.json` 의 `scripts` 전체입니다.

| 스크립트 | 실제 명령 | 용도 |
| --- | --- | --- |
| `npm run dev` | `next dev` | 개발 서버를 기동합니다. |
| `npm run build` | `next build` | 프로덕션 번들을 빌드합니다. |
| `npm run start` | `next start` | `build` 산출물로 프로덕션 서버를 실행합니다. |
| `npm run lint` | `eslint` | `eslint-config-next`(core-web-vitals + typescript) 규칙으로 정적 검사를 수행합니다. |
| `npm run typecheck` | `tsc --noEmit` | 산출물 없이 TypeScript 타입만 전수 검사합니다. |
| `npm run test` | `vitest run` | 전체 테스트를 1회 실행하고 종료합니다(CI 용). |
| `npm run test:watch` | `vitest` | 파일 변경을 감시하며 테스트를 반복 실행합니다. |

## 5. 프로젝트 구조

```text
n-queens/
├─ src/
│  ├─ app/                        # Next.js App Router
│  │  ├─ layout.tsx               # RootLayout — Header/main/Footer 골격, metadata, viewport
│  │  ├─ page.tsx                 # 홈(서버 컴포넌트). NQueensGame 만 렌더
│  │  ├─ globals.css              # 디자인 토큰 + Tailwind v4 @theme 매핑 + 전역 스타일
│  │  └─ favicon.ico
│  ├─ components/
│  │  ├─ NQueensGame.tsx          # 유일한 상태 소유 컨테이너 ('use client')
│  │  ├─ board/
│  │  │  ├─ Board.tsx             # size×size 그리드, 정사각 비율 유지
│  │  │  └─ Tile.tsx              # 단일 칸(memo). 퀸 글리프 + 상태 색상
│  │  ├─ controls/
│  │  │  ├─ SizeSelector.tsx      # 보드 크기 <select>
│  │  │  ├─ SubmitButton.tsx      # [제출]
│  │  │  └─ ResetButton.tsx       # [초기화] (정사각 + 원형 화살표 아이콘)
│  │  ├─ feedback/
│  │  │  └─ Toast.tsx             # 미달 제출 경고 Toast
│  │  └─ layout/
│  │     ├─ Header.tsx            # "N-Queens Problem" 타이틀
│  │     └─ Footer.tsx            # "Copyright © nyj001012"
│  ├─ hooks/
│  │  └─ useNQueens.ts            # 상태 훅 계층 (State)
│  └─ lib/
│     └─ nqueens.ts               # 도메인 로직 계층 (Domain, 순수 함수)
├─ tests/
│  ├─ nqueens.spec.ts             # 도메인 순수 함수 테스트 (71)
│  └─ useNQueens.spec.tsx         # 상태 훅 테스트 (39)
├─ public/                        # 정적 에셋 (Next.js 기본 SVG)
├─ docs/
│  ├─ ARCHITECTURE.md
│  └─ TECH-DEBT.md
├─ next.config.ts
├─ tsconfig.json                  # strict, paths: "@/*" → "./src/*"
├─ eslint.config.mjs
├─ postcss.config.mjs
├─ vitest.config.mts              # jsdom, globals, tests/**/*.spec.{ts,tsx}
└─ vitest.setup.ts                # jest-dom 확장 + afterEach cleanup
```

## 6. 아키텍처

백엔드/DB/API 가 없으므로 전통적인 Controller / Service / Repository 3계층 대신
계약 서문이 정의한 **View → State → Domain 단방향 의존** 3계층을 따릅니다.

```text
   View (UI Props 계층)          State (상태 훅 계층)         Domain (도메인 로직 계층)
 ┌────────────────────────┐   ┌────────────────────────┐   ┌────────────────────────┐
 │ Board / Tile           │   │ useNQueens             │   │ nqueens.ts             │
 │ SizeSelector           │──▶│  · InternalState       │──▶│  · 순수 함수만          │
 │ SubmitButton           │   │  · toggleQueen         │   │  · React/DOM 비의존     │
 │ ResetButton / Toast    │   │  · changeSize / reset  │   │  · 부수효과 없음        │
 │ Header / Footer        │   │  · submit              │   │                        │
 └────────────────────────┘   └────────────────────────┘   └────────────────────────┘
   상태를 소유하지 않음           도메인 함수를 오케스트레이션      State/View 를 알지 못함
```

| 계층 | 담당 모듈 | 책임 |
| --- | --- | --- |
| Domain | `src/lib/nqueens.ts` | 상수, 도메인 타입, 충돌 판정·제출 검증·타일 상태 도출 순수 함수 |
| State | `src/hooks/useNQueens.ts` | 단일 상태 객체 소유, 액션 4종 제공, 도메인 함수 호출 |
| View (컨테이너) | `src/components/NQueensGame.tsx` | 훅을 호출하는 유일한 컴포넌트. Toast 노출 여부 및 disabled 정책 결정 |
| View (프레젠테이션) | `src/components/{board,controls,feedback,layout}/**` | props 로만 데이터를 받고 콜백으로 변경을 위임 |
| View (셸) | `src/app/layout.tsx`, `src/app/page.tsx` | Header/`<main>`/Footer 골격, metadata, 클라이언트 경계 시작점 |

- `Domain` 은 `State` 를, `State` 는 `View` 를 import 하지 않습니다.
- 계약 §6 의 View Props 7종은 도메인 모듈이 아닌 **각 컴포넌트 파일에 코로케이션**되어 있습니다(단방향 의존 규약 준수). 상세 이유는 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 를 참고하십시오.

## 7. 테스트

```bash
npm run test        # 1회 실행
npm run test:watch  # 감시 모드
```

- 현재 **110개 테스트가 모두 통과**합니다 (`Test Files 2 passed / Tests 110 passed`).
  - `tests/nqueens.spec.ts` — **71개**. 상수, `toCellKey`/`fromCellKey` 왕복, `isBoardSize`, `isWithinBoard`, `isAttacking`, `findConflicts`, `isSolved`, `validateSubmission`, `resolveTileStatus`, `formatIncompleteMessage`.
  - `tests/useNQueens.spec.tsx` — **39개**. 초기 상태, `toggleQueen`(토글/방어 로직), `changeSize`, `reset`, `submit`(미달/오답/정답), 제출 결과 무효화, 액션 참조 안정성.
- 실행 환경은 `jsdom` 이며 `vitest.setup.ts` 가 `@testing-library/jest-dom` 매처를 등록하고 매 테스트 후 `cleanup()` 을 수행합니다.
- 테스트는 `tests/**/*.spec.ts`, `tests/**/*.spec.tsx` 만 수집합니다(`vitest.config.mts`).
- **컴포넌트/통합 테스트는 아직 없습니다.** 상세는 [docs/TECH-DEBT.md](docs/TECH-DEBT.md) 를 참고하십시오.

권장 검증 순서:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

## 8. 라이선스 / 저작자

Copyright © nyj001012

별도의 오픈소스 라이선스 파일이 저장소에 포함되어 있지 않습니다.

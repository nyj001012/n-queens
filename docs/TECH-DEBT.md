# 기술 부채 목록 (Tech Debt)

Phase 3 리뷰 게이트(`.claude/_workspace/log/orchestrator-log.jsonl`, 2026-08-13T02:39:43Z)의
판정 결과는 **`APPROVE`** 이며, 결함 집계는 `critical 0 / major 1 / minor 3` 이고 **모두 해소(`all_resolved: true`)** 되었습니다.

> Major 결함이었던 "타일 포커스 링이 보드 `overflow-hidden` 에 클리핑(WCAG 2.4.7 / 2.4.11)" 은
> `outline-offset` 반전(`focus-visible:[outline-offset:-2px]!`)으로 이미 해결되었습니다.
> 자세한 내용은 [ARCHITECTURE.md §6.3](ARCHITECTURE.md) 을 참고하십시오.

아래는 승인과 **별개로 기록된 `tech_debt` 6항목**입니다. 모두 "지금 당장 동작을 깨뜨리지는 않지만
방치하면 비용이 커지는" 항목입니다.

| # | 항목 | 상태 | 우선순위 |
| --- | --- | --- | --- |
| 1 | 컴포넌트/통합 테스트 부재 | 미해소 | **High** |
| 2 | `stateRef` concurrent 제약 미문서화 | **본 문서/ARCHITECTURE.md 로 해소** | Medium |
| 3 | 제출 결과 요약 라이브 리전 부재 | 미해소 | **High** |
| 4 | 미사용 디자인 토큰 4종 | 유지 승인 (조치 불필요) | Low |
| 5 | 타일 탭 스톱 64개 | 미해소 | Medium |
| 6 | README 스텁 | **본 작업(Phase 4)에서 해소** | — |

관련 문서: [../README.md](../README.md) · [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 1. 컴포넌트/통합 테스트 부재

**우선순위: High**

### 현상

테스트는 `tests/nqueens.spec.ts`(71개, Domain)와 `tests/useNQueens.spec.tsx`(39개, State) 두 파일뿐이며,
총 110개 모두 통과합니다. 그러나 **View 계층에 대한 테스트가 하나도 없습니다.**

커버되지 않는 모듈:

- `src/components/NQueensGame.tsx` — 컨테이너 조립, `disabled` 정책, Toast 트리거/`nonce` 재마운트 로직
- `src/components/board/Board.tsx`, `Tile.tsx` — 그리드 렌더, `memo` 전제, 접근성 속성
- `src/components/controls/*` — `<select>` 타입 가드 경로, 버튼 비활성화 상태
- `src/components/feedback/Toast.tsx` — 자동 소멸 타이머, 라이브 리전
- `src/components/layout/*`, `src/app/*`

`@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` 은
이미 devDependencies 에 설치되어 있고 `vitest.setup.ts` 도 준비되어 있으므로 **인프라는 이미 갖춰져 있습니다.**

### 영향

- 요구사항 §2.3 의 사용자 관점 시나리오(퀸 미달 제출 → Toast 노출 → 문구 확인)가 **자동 검증되지 않습니다.** 훅 단위로는 `incomplete` 반환을 검증하지만, "실제로 Toast 가 화면에 뜨는가"는 검증 범위 밖입니다.
- `Tile` 의 `memo` 가 성립하는 전제(좌표 `useMemo`, 액션 참조 안정성)가 리팩터링으로 깨져도 테스트가 잡아내지 못하고 성능만 조용히 나빠집니다.
- 컨테이너의 `disabled` 정책(제출은 `solved` 일 때만, 초기화는 `placedCount === 0` 일 때)이 회귀해도 감지되지 않습니다.
- 포커스 링 `outline-offset` 반전처럼 CSS 캐스케이드에 의존한 수정은 특히 회귀에 취약한데, 이를 지키는 테스트가 없습니다.

### 권장 조치

1. `tests/NQueensGame.spec.tsx` (통합) — user-event 기반 시나리오:
   - 타일 클릭 → 퀸 배치 → 재클릭 → 취소
   - N개 미달 제출 → `"{N}개의 퀸을 모두 배치해주세요"` Toast 노출, 보드 색상 불변
   - 충돌 배치 제출 → 충돌 타일만 `conflict` 표시, 무관한 퀸은 `default` 유지
   - 정답 배치 제출 → 전 타일 `solved`, 제출 버튼 비활성화
   - 보드 크기 변경 → 즉시 초기화
2. `tests/Tile.spec.tsx` — `aria-label` 문구(행/열/퀸 유무/상태), `aria-pressed`, 클릭 시 자기 좌표 전달.
3. `tests/Toast.spec.tsx` — `vi.useFakeTimers()` 로 `durationMs` 경과 후 `onClose` 호출, cleanup 시 타이머 해제.
4. 색상 클래스가 아니라 **`aria-label` 의 상태 문구**를 어서션 기준으로 삼으면 스타일 리팩터링에 깨지지 않습니다.

## 2. `stateRef` Concurrent 모드 제약 미문서화

**우선순위: Medium — 문서화로 해소**

### 현상

`useNQueens` 는 `useState` 로 보관하는 `InternalState` 와 별개로 `stateRef` 를 **동기 미러**로 유지하며,
`commit(next)` 에서 `stateRef.current = next` 와 `setState(next)` 를 함께 수행합니다.

```ts
const commit = useCallback((next: InternalState): void => {
  stateRef.current = next;
  setState(next);
}, []);
```

이 설계는 `submit(): SubmitResult` 의 **동기 반환** 요구(계약 §5)를 만족시키고 액션의 참조 안정성을
영구 보장하기 위한 의도적 선택입니다. 코드 주석은 "렌더 단계에서 ref 를 읽거나 쓰지 않으므로
순수 렌더 규칙을 위반하지 않는다"까지는 설명하지만, **React Concurrent 기능과 결합할 때 무엇이
깨지는지는 명시하지 않았습니다.**

### 영향

`stateRef` 는 React 스케줄러 밖의 가변 저장소이므로, 다음을 도입하는 순간 전제가 무너집니다.

| 기능 | 깨지는 지점 |
| --- | --- |
| `useTransition` / `startTransition` | 전이 렌더가 중단·폐기되어도 `stateRef.current` 는 롤백되지 않습니다. ref 는 커밋이 아니라 **핸들러 실행 시점**에 이미 갱신되기 때문입니다. |
| `useDeferredValue` | 렌더는 옛 값으로 진행되는데 ref 는 최신 값이라 두 소스가 서로 다른 시점을 가리킵니다. |
| Offscreen / Activity 사전 렌더 | 폐기된 렌더 경로의 커밋이 ref 에 잔류할 수 있습니다. |
| `<StrictMode>` 이중 호출 | 현재 `commit` 은 멱등 대입만 하므로 **안전**하지만, `stateRef.current` 를 읽어 증분 갱신하는 코드가 추가되는 순간 깨집니다. |

**현재 코드베이스는 위 기능을 전혀 사용하지 않으므로 실제 결함은 없습니다.**
문제는 이 전제가 어디에도 적혀 있지 않아, 나중에 누군가 `startTransition` 으로 감싸도
아무 경고 없이 상태 불일치가 발생한다는 점입니다.

### 권장 조치

1. **(완료)** 제약을 [ARCHITECTURE.md §5.4](ARCHITECTURE.md) 와 본 문서에 명시했습니다.
2. `src/hooks/useNQueens.ts` 의 `commit` 근처에 "이 훅의 상태를 `startTransition` / `useDeferredValue` 로 감싸지 말 것" 경고 주석을 추가하는 것을 권장합니다. (본 문서화 작업 범위에는 코드 수정이 포함되지 않아 미적용)
3. 전이 기능을 실제로 도입해야 한다면 정공법은 둘 중 하나입니다.
   - `useState` + `stateRef` 를 `useReducer` 로 대체하고, `submit` 의 동기 반환은 "액션 디스패치 + 계산은 도메인 함수 직접 호출"로 분리
   - 상태를 외부 스토어로 옮기고 `useSyncExternalStore` 로 구독

## 3. 제출 결과 요약 라이브 리전 부재

**우선순위: High (접근성)**

### 현상

현재 `role="status" aria-live="polite"` 라이브 리전은 `Toast` 컴포넌트에만 존재하며,
**`incomplete`(퀸 미달) 경로에서만 문구를 담습니다.**

제출 결과 중 `invalid`(오답)와 `solved`(정답)는 **타일의 배경색 변경**과 각 타일 `aria-label` 끝에
붙는 `", 충돌"` / `", 정답"` 문구로만 표현됩니다. `aria-label` 은 해당 타일에 포커스가 가거나
스크린 리더로 그 요소를 탐색해야만 읽힙니다.

### 영향

- 스크린 리더 사용자가 [제출] 버튼을 누른 직후 **아무런 즉각적 피드백을 받지 못합니다.** 제출이 처리되었는지, 정답인지 오답인지 알 수 없습니다.
- 결과를 알려면 64개 타일을 일일이 탐색해야 하며(항목 5의 탭 스톱 문제와 곱해집니다), 최악의 경우 N=8 에서 64칸을 순회해야 "충돌" 문구를 만납니다.
- 색상만으로 정보를 전달하지 않는다는 원칙(WCAG 1.4.1 Use of Color)은 `aria-label` 로 형식상 충족되지만, 상태 변화 통지(WCAG 4.1.3 Status Messages)는 충족되지 않습니다.

### 권장 조치

1. `NQueensGame` 에 제출 결과 전용 라이브 리전을 추가합니다(시각적으로는 `sr-only`).
   - `invalid` → `"충돌이 있습니다. {conflicts.size}개의 퀸이 서로 공격 가능한 위치에 있습니다."`
   - `solved` → `"정답입니다. {N}개의 퀸을 모두 안전하게 배치했습니다."`
2. `aria-live="polite"` + `role="status"` 를 사용하고, `Toast` 와 **동시에 두 리전이 울리지 않도록** 경로를 분리합니다(`incomplete` 는 Toast, `invalid`/`solved` 는 결과 리전).
3. 리전 노드는 항상 DOM 에 상주시키고 텍스트만 갱신해야 낭독이 안정적으로 트리거됩니다(`Toast` 가 이미 쓰는 전략과 동일).
4. 시각 사용자에게도 유용한 정보이므로, `sr-only` 대신 보드 하단의 상태 텍스트로 노출하는 방안도 검토할 만합니다(요구사항 §3 의 "심플한" 제약과 절충 필요).

## 4. 미사용 디자인 토큰 4종 (유지 승인)

**우선순위: Low — 조치 불필요(의도적 유지)**

### 현상

`src/app/globals.css` 에 정의되어 있으나 어떤 컴포넌트도 참조하지 않는 토큰이 정확히 4종 있습니다.

| 토큰 | 정의 위치 | 값(light / dark) | 용도 추정 |
| --- | --- | --- | --- |
| `--conflict-soft` | `:root`, dark 블록, `@theme inline` | `#e6c8c5` / `#4a2622` | 충돌 상태의 저채도 배경(연한 강조) |
| `--solved-soft` | `:root`, dark 블록, `@theme inline` | `#c6e0d5` / `#1d3b30` | 정답 상태의 저채도 배경 |
| `--radius-sm` | `:root` | `0.25rem` | 작은 모서리 반경 |
| `--radius-lg` | `:root` | `0.75rem` | 큰 모서리 반경 |

현재 모든 컴포넌트는 `--radius-md`(0.5rem) 하나만 사용하고, 상태 색상은 진한 쪽
(`--conflict` / `--solved`)만 사용합니다.

### 영향

- 기능적 영향 없음. Tailwind v4 의 `@theme inline` 은 사용되지 않는 색상 유틸리티를 산출물에 포함시키지 않으며, `--radius-*` 는 커스텀 프로퍼티 선언 몇 줄에 불과합니다.
- 다만 "정의되어 있으나 아무도 안 쓰는 토큰"은 새로 합류한 개발자에게 **"이걸 써야 하나?"** 라는 혼선을 줍니다.

### 권장 조치

리뷰 게이트에서 **유지 승인**된 항목입니다. 제거하지 마십시오. 근거는 다음과 같습니다.

- 4종 모두 **의미적으로 완결된 스케일의 일부**입니다. `radius-sm/md/lg` 는 3단 스케일이고, `conflict/solved` 는 강/약 2단 쌍입니다. 스케일에서 미사용분만 골라내면 남은 토큰의 명명 규칙이 깨집니다(`--radius-md` 만 남으면 `md` 라는 이름이 의미를 잃습니다).
- `globals.css` 헤더 주석이 **"Do not rename tokens without coordination"** 이라고 명시하고 있습니다. 토큰 세트는 여러 FE 에이전트가 공유하는 계약면입니다.
- 향후 확장(예: 충돌 타일에 연한 배경 + 진한 테두리 조합, Toast 반경 차등화) 시 그대로 사용할 수 있습니다.

조치가 필요하다면 삭제가 아니라 **`globals.css` 에 "현재 미사용, 확장 대비 예약" 주석을 붙이는 것**을 권장합니다.

## 5. 타일 탭 스톱 64개

**우선순위: Medium (접근성 / UX)**

### 현상

`Tile` 은 각각 독립된 `<button type="button">` 이며 별도의 `tabIndex` 조정이 없습니다.
따라서 **모든 타일이 개별 탭 스톱**이 됩니다.

| N | 타일 수 = 탭 스톱 수 | 페이지 전체 포커스 가능 요소 |
| --- | --- | --- |
| 4 | 16 | 19 (+ SizeSelector, 제출, 초기화) |
| 8 | **64** | **67** |

즉 N=8 에서 [제출] 버튼에 도달하려면 Tab 을 최대 65번 눌러야 합니다.

### 영향

- 키보드 전용 사용자와 스크린 리더 사용자에게 **보드를 "지나가는" 비용이 과도**합니다. 보드를 건너뛸 방법이 없습니다.
- 항목 3(결과 라이브 리전 부재)과 결합하면 특히 나쁩니다. 제출 결과를 확인하려면 64칸을 순회해야 하는데, 그 순회 자체도 64번의 탭입니다.
- WCAG 2.4.1(Bypass Blocks)의 정신에 어긋납니다. 이 지침이 주로 페이지 간 반복 블록을 겨냥하긴 하지만, 단일 페이지 내 대형 격자에도 동일한 문제가 발생합니다.
- 다만 **타일이 `<button>` 인 것 자체는 올바른 설계**입니다. 클릭 가능한 대화형 요소이며 `aria-pressed` 토글 시맨틱에 정확히 부합합니다. 문제는 "버튼이라서"가 아니라 "격자에 격자용 포커스 모델이 없어서"입니다.

### 권장 조치

우선순위 순으로:

1. **Roving tabindex 도입 (권장)** — 보드를 `role="grid"`(행은 `role="row"`, 칸은 `role="gridcell"`)로 바꾸고, 격자 전체가 **탭 스톱 1개**만 갖게 합니다. 내부 이동은 방향키(↑↓←→), `Home`/`End`, `PageUp`/`PageDown` 으로 처리합니다. 이는 WAI-ARIA Authoring Practices 의 Grid 패턴 그대로이며, 체스판 UI 의 표준 해법입니다.
2. **최소 조치 — 스킵 링크** — 보드 직전에 `.sr-only:focus-visible` 스킵 링크("보드 건너뛰고 컨트롤로 이동")를 추가합니다. 구현 비용이 가장 낮고 효과가 즉각적입니다.
3. 1번을 적용할 경우 `aria-pressed` 는 `gridcell` 시맨틱과 맞지 않으므로 `aria-selected` 또는 셀 내부 텍스트 표현으로 전환 검토가 필요합니다. **계약 §6 `TileProps` 는 그대로 유지 가능**합니다(포커스 모델은 `Board` 의 관심사).
4. 어떤 방식이든 항목 1(컴포넌트 테스트)과 함께 진행해야 안전합니다. 포커스 이동 로직은 테스트 없이 리팩터링하기 매우 위험합니다.

## 6. README 스텁 — **해소됨**

**우선순위: — (Phase 4 에서 해소)**

### 현상 (조치 전)

`README.md` 가 `# n-queens` 한 줄, 총 11바이트의 스텁 상태였습니다.
`create-next-app` 기본 README 조차 아니었고, 프로젝트 소개·실행 방법·구조·테스트 정보가 전무했습니다.

### 영향 (조치 전)

- 신규 합류자가 저장소를 클론한 뒤 **무엇을 실행해야 하는지 알 수 없었습니다.** `package.json` 을 직접 열어 `scripts` 를 읽어야 했습니다.
- 요구사항 문서와 계약 파일이 `.claude/_workspace/` 라는 비관례적 경로에 있어, 진입점 문서 없이는 발견하기 어려웠습니다.
- FE-only 아키텍처(백엔드 없음)라는 가장 중요한 전제가 어디에도 명시되어 있지 않았습니다.

### 조치 (완료)

Phase 4 `#7 P4-DOC` 에서 다음을 작성했습니다.

- [`README.md`](../README.md) — 프로젝트 소개, 기술 스택(package.json 실제 버전), 주요 기능 4종, 시작하기, 개발 스크립트 7종 표, 프로젝트 구조 트리, 3계층 아키텍처 요약, 테스트(110개) 안내, 저작자
- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — 3계층 구조와 데이터 흐름, 도메인 API 전수 명세, 상태 모델·전이·`stateRef` 설계 의도, 컴포넌트 계층도와 Props 7종, 검증 알고리즘
- [`docs/TECH-DEBT.md`](TECH-DEBT.md) — 본 문서

### 유지 보수 규칙

README 는 다음이 바뀔 때마다 **반드시 함께 갱신**해야 합니다. 모두 실제 파일과 대조 가능한 사실입니다.

- `package.json` 의 `scripts` 또는 의존성 버전
- 테스트 개수 (`npm run test` 결과)
- 디렉터리 구조

---

## 7. 문서화 과정에서 추가로 관찰된 항목

리뷰 게이트의 `tech_debt` 배열에는 없지만, Phase 4 문서화 중 확인된 사항입니다.
**참고용이며 별도 판단이 필요합니다.**

### 7.1 계약 ↔ 구현 간 컴파일 타임 연결 부재

`.claude/_workspace/03_contracts/nqueens.contract.ts` 는 `export declare` 전용 선언 파일이라
런타임 import 대상이 아닙니다. 그 결과 도메인 타입(`BoardSize`, `Position`, `QueenSet`, `SubmitResult` 등)이
계약 파일과 `src/lib/nqueens.ts` 에 **각각 독립적으로 선언**되어 있고, View Props 7종도 계약과
각 컴포넌트 파일에 이중으로 존재합니다.

- **영향:** 계약을 수정해도 구현이 따라오지 않으면 컴파일 오류가 나지 않습니다. 드리프트가 조용히 누적될 수 있습니다.
- **권장:** 계약 준수를 강제하려면 타입 레벨 어서션 테스트(예: `expectTypeOf<typeof import('@/lib/nqueens')>().toMatchTypeOf<typeof import('.../nqueens.contract')>()`)를 추가하거나, 계약을 `src/` 안의 타입 전용 모듈로 옮겨 실제 import 하는 방안을 검토할 수 있습니다.

### 7.2 `tsconfig.json` 의 include 범위

`tsconfig.json` 의 `include` 가 `"**/*.ts"` 이므로 `.claude/_workspace/03_contracts/nqueens.contract.ts` 도
`npm run typecheck` 대상에 포함됩니다.

- **영향:** 기능적 문제는 없으며 오히려 계약 파일의 문법 오류를 잡아주는 이점이 있습니다. 다만 파이프라인 산출물이 애플리케이션 타입 검사 범위에 들어온다는 점은 의도된 것인지 확인이 필요합니다.

### 7.3 `isSolved` 의 프로덕션 미사용

`src/lib/nqueens.ts` 의 `isSolved` 는 계약 §4 에 정의되어 있고 테스트도 존재하지만,
`validateSubmission` 이 `findConflicts` 를 직접 호출하므로 **프로덕션 경로에서는 호출되지 않습니다.**

- **영향:** 없음. 계약이 요구한 공개 API 이고 순수 함수라 트리 셰이킹 대상입니다. 제거 대상이 아니라 "계약 이행" 항목으로 이해하면 됩니다.

### 7.4 `@theme inline` 에만 노출된 `--color-focus-ring`

`--focus-ring` 토큰 자체는 `globals.css` 의 `:focus-visible` 규칙에서 사용됩니다.
다만 `@theme inline` 이 만들어내는 Tailwind 유틸리티(`*-focus-ring`)는 어떤 컴포넌트도 쓰지 않습니다.

- **영향:** 없음(항목 4 의 "미사용 토큰 4종"에는 포함되지 않습니다 — 토큰 자체는 사용 중입니다).

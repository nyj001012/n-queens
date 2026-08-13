# 아키텍처 — N-Queens Puzzle Web Application

본 문서는 **실제 구현된 소스 코드(`src/`)를 진실의 원천(SSOT)** 으로 삼아 작성되었습니다.
설계 원칙의 근거는 [`.claude/_workspace/03_contracts/nqueens.contract.ts`](../.claude/_workspace/03_contracts/nqueens.contract.ts) 이며,
기능 요구사항 원본은 [`.claude/_workspace/requirements.md`](../.claude/_workspace/requirements.md) 입니다.

- 프로젝트 개요·실행 방법: [../README.md](../README.md)
- 알려진 기술 부채: [TECH-DEBT.md](TECH-DEBT.md)

---

## 1. 3계층 구조와 의존 방향

이 시스템에는 백엔드·DB·API 가 존재하지 않습니다. 따라서 Controller / Service / Repository 대신
다음 3계층으로 치환하여 계약을 정의하고 구현했습니다.

```text
        ┌──────────────────────────────────────────────────────────────┐
        │  View — UI Props 계층                                        │
        │  src/app/**, src/components/**                               │
        │  · 상태를 소유하지 않는다                                     │
        │  · 데이터는 props 로 받고 변경은 콜백으로 위임한다              │
        └──────────────────────────────┬───────────────────────────────┘
                                       │ import (단방향)
                                       ▼
        ┌──────────────────────────────────────────────────────────────┐
        │  State — 상태 훅 계층                                        │
        │  src/hooks/useNQueens.ts                                     │
        │  · 애플리케이션 상태를 단독 소유한다                           │
        │  · 도메인 순수 함수를 오케스트레이션한다                        │
        │  · View 를 알지 못한다                                        │
        └──────────────────────────────┬───────────────────────────────┘
                                       │ import (단방향)
                                       ▼
        ┌──────────────────────────────────────────────────────────────┐
        │  Domain — 도메인 로직 계층                                    │
        │  src/lib/nqueens.ts                                          │
        │  · 부수효과 없음 / 인자 변형 없음 / 동일 입력 → 동일 출력       │
        │  · React·DOM·브라우저 API 비의존                              │
        │  · State 와 View 를 알지 못한다                               │
        └──────────────────────────────────────────────────────────────┘
```

**역방향 import 는 존재하지 않습니다.** `src/lib/nqueens.ts` 는 어떤 React 모듈도 import 하지 않으며,
`src/hooks/useNQueens.ts` 는 `react` 와 `@/lib/nqueens` 만 import 합니다.

## 2. 데이터 흐름

한 번의 사용자 상호작용이 계층을 통과하는 경로는 항상 동일합니다.

```text
 [사용자]
    │ ① 클릭 / 탭 / select 변경
    ▼
 Tile · SizeSelector · SubmitButton · ResetButton      (View — 프레젠테이션)
    │ ② props 로 받은 콜백 호출 (onClick / onChange)
    ▼
 NQueensGame                                           (View — 컨테이너)
    │ ③ 훅 액션 호출 (toggleQueen / changeSize / reset / submit)
    ▼
 useNQueens                                            (State)
    │ ④ 순수 함수 호출 (isWithinBoard / toCellKey / validateSubmission)
    ▼
 nqueens.ts                                            (Domain)
    │ ⑤ 계산 결과 반환 (SubmitResult 등, 부수효과 없음)
    ▼
 useNQueens — commit(next): stateRef 동기 갱신 + setState
    │ ⑥ 새 스냅샷으로 리렌더
    ▼
 NQueensGame → Board → resolveTileStatus(...) → Tile 색상/글리프 갱신
```

제출(`submit`)만 예외적으로 **반환값이 위로 흐릅니다.** `submit()` 은 `SubmitResult` 를 동기 반환하고,
컨테이너(`NQueensGame`)가 그 `kind` 를 보고 Toast 노출 여부를 결정합니다. 보드 색상은 훅이 이미
상태에 반영했으므로 컨테이너가 다시 계산하지 않습니다.

## 3. Domain 계층 API 명세 — `src/lib/nqueens.ts`

### 3.1 상수

| 이름 | 타입 | 값 | 역할 |
| --- | --- | --- | --- |
| `MIN_N` | `number` | `4` | 지원 보드 크기 하한. N=2,3 은 해가 없어 게임이 성립하지 않는다. |
| `MAX_N` | `number` | `8` | 지원 보드 크기 상한. |
| `BOARD_SIZES` | `readonly BoardSize[]` | `[4,5,6,7,8]` | Select 옵션 데이터 소스. 오름차순 보장. |
| `DEFAULT_BOARD_SIZE` | `BoardSize` | `8` | 최초 마운트 시 기본 N. |
| `MIN_INDEX` | `number` | `0` | 좌표 인덱스 하한(0-based). `isWithinBoard` 가 소비한다. |
| `MSG_INCOMPLETE_TEMPLATE` | `string` | `'{n}개의 퀸을 모두 배치해주세요'` | 미달 경고 문구 템플릿. |
| `TOAST_DURATION_MS` | `number` | `2000` | Toast 자동 소멸 시간(ms). |

### 3.2 타입

| 이름 | 정의 | 불변식 / 설계 의도 |
| --- | --- | --- |
| `BoardSize` | `4 \| 5 \| 6 \| 7 \| 8` | 리터럴 유니온. 범위 밖 N이 계층 경계를 넘는 것을 **컴파일 타임에** 차단한다. |
| `Position` | `{ readonly row: number; readonly col: number }` | 0-based, 좌상단 원점. 불변 값 객체. |
| `CellKey` | `` `${number},${number}` `` | 좌표 직렬화 키. 생성은 `toCellKey`, 파싱은 `fromCellKey` 로만 한다. |
| `QueenSet` | `ReadonlySet<CellKey>` | 배치된 퀸 집합. 아래 3.5 참조. |
| `TileStatus` | `'default' \| 'conflict' \| 'solved'` | 타일 1칸의 시각 상태. |
| `SubmitStatus` | `'idle' \| 'invalid' \| 'solved'` | 보드 전체의 제출 단계. `incomplete` 는 **포함되지 않는다**(상태를 바꾸지 않으므로). |
| `SubmitIncomplete` | `{ kind: 'incomplete'; placed: number; required: BoardSize }` | `0 ≤ placed < required` 가 보장된다. |
| `SubmitInvalid` | `{ kind: 'invalid'; conflicts: QueenSet }` | `conflicts` 는 항상 원소 2개 이상. |
| `SubmitSolved` | `{ kind: 'solved' }` | 판별자만 갖는 종결 상태. |
| `SubmitResult` | `SubmitIncomplete \| SubmitInvalid \| SubmitSolved` | `kind` 판별 유니온. 호출부에서 exhaustive 분기한다. |

### 3.3 순수 함수

| 시그니처 | 역할 | 불변식 / 경계 동작 |
| --- | --- | --- |
| `toCellKey(position: Position): CellKey` | 좌표를 `"row,col"` 문자열로 직렬화 | `fromCellKey` 와 왕복 동형. |
| `fromCellKey(key: CellKey): Position` | 셀 키를 좌표로 역직렬화 | `split` 대신 **첫 `,` 위치**를 기준으로 잘라 음수 좌표(`"-1,2"`)도 안전하게 파싱한다. |
| `isBoardSize(value: number): value is BoardSize` | 지원 범위 판별 타입 가드 | `Number.isInteger(value) && MIN_N ≤ value ≤ MAX_N`. 소수·NaN·범위 밖은 `false`. `<select>` 의 string 값을 승격할 때 반드시 통과시킨다. |
| `isWithinBoard(position: Position, size: BoardSize): boolean` | 좌표의 보드 내 포함 여부 | `0 ≤ row < size && 0 ≤ col < size`. |
| `isAttacking(a: Position, b: Position): boolean` | 두 퀸의 상호 공격 가능 여부 | **동일 좌표는 `false`**(자기 자신은 공격하지 않는다). 그 외는 4조건 OR. |
| `findConflicts(queens: QueenSet): QueenSet` | 충돌에 연루된 퀸들의 부분집합 산출 | 충돌 쌍의 **양쪽 모두** 포함. 충돌 없으면 빈 집합. 입력을 변형하지 않고 **새 `Set`** 을 반환한다. |
| `isSolved(queens: QueenSet, size: BoardSize): boolean` | 완전한 해 여부 | `queens.size === size` **그리고** `findConflicts(queens).size === 0`. 개수가 다르면 즉시 `false`. |
| `validateSubmission(queens: QueenSet, size: BoardSize): SubmitResult` | 제출 검증 진입점 | `incomplete → invalid → solved` 순 단락 평가. |
| `resolveTileStatus(position, queens, conflicts, submitStatus): TileStatus` | 타일 1칸의 시각 상태 도출 | View 에서 색상 규칙을 재구현하지 않게 하는 헬퍼. 아래 3.4 표 참조. |
| `formatIncompleteMessage(size: BoardSize): string` | 미달 경고 문구 생성 | `MSG_INCOMPLETE_TEMPLATE` 의 `{n}` 치환. 예: `'8개의 퀸을 모두 배치해주세요'`. |

> `isSolved` 는 도메인 API 로 노출되어 있고 테스트도 존재하지만, `validateSubmission` 이 자체적으로
> `findConflicts` 를 호출하므로 현재 프로덕션 경로(`useNQueens`)에서는 호출되지 않습니다.

### 3.4 `resolveTileStatus` 판정표

| 조건 | 결과 |
| --- | --- |
| 해당 칸에 퀸이 없음 | `'default'` |
| 퀸 있음 + `submitStatus === 'idle'` | `'default'` |
| 퀸 있음 + `submitStatus === 'solved'` | `'solved'` |
| 퀸 있음 + `submitStatus === 'invalid'` + `conflicts` 에 포함 | `'conflict'` |
| 퀸 있음 + `submitStatus === 'invalid'` + 충돌 무관 | `'default'` |

마지막 행이 핵심입니다. 오답이어도 **충돌에 연루되지 않은 퀸은 빨간색이 되지 않습니다**(요구사항 §2.3).

### 3.5 왜 `Position[]` 이 아니라 `ReadonlySet<CellKey>` 인가

계약 §2 가 명시한 설계 선택이며 구현도 이를 따릅니다.

1. **조회 성능** — 보드는 매 렌더마다 N²(최대 64) 타일을 그리고 각 타일이 "내 자리에 퀸이 있는가"를 묻습니다. `Set.has` 는 O(1), 배열 탐색은 O(N) 이라 전체 비용이 O(N²) 대 O(N³) 로 갈립니다.
2. **토글의 단순성** — 좌클릭 토글은 "있으면 삭제, 없으면 추가"라는 집합 연산 그 자체입니다.
3. **참조 동일성 회피** — `Set<Position>` 은 객체 참조 동등성을 쓰므로 값이 같아도 중복 배치가 발생합니다. 문자열 키는 값 동등성이 곧 집합 동등성입니다.
4. **집합 연산 친화** — `findConflicts` 결과와 배치 집합의 비교/차집합 연산이 자연스럽습니다.

트레이드오프는 순회 순서가 배치 순서로 고정되고 좌표 사용 시 파싱이 필요하다는 점인데,
본 게임은 순서에 의미가 없고 파싱 대상이 최대 64개이므로 무시 가능합니다.

## 4. 검증 알고리즘

### 4.1 공격 판정 — `isAttacking`

두 퀸 `a`, `b` 가 서로 공격 가능한 조건은 아래 4가지 중 **하나라도** 성립할 때입니다.

| # | 방향 | 판정식 | 기하학적 의미 |
| --- | --- | --- | --- |
| 1 | 같은 행 (↔) | `a.row === b.row` | 가로선 공유 |
| 2 | 같은 열 (↕) | `a.col === b.col` | 세로선 공유 |
| 3 | 주대각선 (↘↖) | `a.row - a.col === b.row - b.col` | `row - col` 이 같은 칸은 하나의 ↘ 대각선 위에 있다 |
| 4 | 반대각선 (↙↗) | `a.row + a.col === b.row + b.col` | `row + col` 이 같은 칸은 하나의 ↗ 대각선 위에 있다 |

단, **동일 좌표는 `false`** 로 단락 처리합니다. 집합 자료구조상 중복 좌표는 발생하지 않지만
방어적으로 "자기 자신은 공격하지 않는다"를 보장합니다.

대각선 판정에 `Math.abs(rowDiff) === Math.abs(colDiff)` 대신 **대각선 상수(`row∓col`) 비교**를 쓰면
절댓값 계산 없이 두 대각선을 각각 독립된 등식으로 표현할 수 있습니다.

```text
   row - col (주대각선 상수, ↘)        row + col (반대각선 상수, ↗)
     0  1  2  3                          0  1  2  3
   ┌──┬──┬──┬──┐                      ┌──┬──┬──┬──┐
 0 │ 0│-1│-2│-3│                    0 │ 0│ 1│ 2│ 3│
 1 │ 1│ 0│-1│-2│                    1 │ 1│ 2│ 3│ 4│
 2 │ 2│ 1│ 0│-1│                    2 │ 2│ 3│ 4│ 5│
 3 │ 3│ 2│ 1│ 0│                    3 │ 3│ 4│ 5│ 6│
   └──┴──┴──┴──┘                      └──┴──┴──┴──┘
   같은 값 = 같은 ↘ 대각선              같은 값 = 같은 ↗ 대각선
```

### 4.2 충돌 집합 산출 — `findConflicts`

```text
keys      = Array.from(queens)          // CellKey[]
positions = keys.map(fromCellKey)       // Position[]  (1회만 파싱)
conflicts = new Set<CellKey>()

for i in 0..K-1:
  for j in i+1..K-1:                    // 상삼각 순회 — 각 쌍을 정확히 1번만 검사
    if isAttacking(positions[i], positions[j]):
      conflicts.add(keys[i])
      conflicts.add(keys[j])            // 양쪽 모두 추가
```

- 시간 복잡도 **O(K²)**, K = 배치된 퀸 수 ≤ 8 → 최대 28쌍. 사용자 입력마다 재계산해도 비용이 없습니다.
- `j = i + 1` 상삼각 순회로 같은 쌍을 두 번 검사하지 않으며, 자기 자신과의 비교도 발생하지 않습니다.
- 좌표 파싱을 루프 밖에서 1회만 수행합니다(내부 이중 루프에서 재파싱하지 않음).
- 반환값은 항상 새 `Set` 이며 입력 `queens` 는 변형되지 않습니다.

> 참고: N-Queens 를 "푸는" 것이 목적이라면 열/대각선 점유 비트마스크로 O(K) 판정이 가능하지만,
> 이 애플리케이션은 사용자가 배치한 임의 배치에 대해 **어느 퀸이 충돌에 연루되었는지**를
> 모두 식별해야 하므로(빨간색 대상 산출) 쌍 단위 순회가 요구사항에 더 직접적으로 대응합니다.

### 4.3 제출 판정 — `validateSubmission`

```text
if queens.size < size          → { kind: 'incomplete', placed: queens.size, required: size }
conflicts = findConflicts(queens)
if conflicts.size > 0          → { kind: 'invalid', conflicts }
otherwise                      → { kind: 'solved' }
```

단락 평가 순서가 곧 요구사항 §2.3 의 판정 순서입니다. `incomplete` 단계에서 즉시 반환하므로
**미달 제출은 충돌 계산 자체를 수행하지 않습니다.**
`queens.size > size` 는 훅이 배치 시점에 차단하므로 도달할 수 없는 상태입니다.

## 5. State 계층 — `useNQueens`

### 5.1 상태 모델

훅 내부는 **하나의 불변 객체 `InternalState`** 를 `useState` 로 보관합니다.

```ts
interface InternalState {
  readonly size: BoardSize;
  readonly queens: QueenSet;
  readonly submitStatus: SubmitStatus;
  readonly conflicts: QueenSet;
}
```

4개의 `useState` 로 쪼개지 않은 이유는, "토글하면 `submitStatus` 를 `idle` 로 되돌린다" 같은
**다중 필드 전이를 단일 커밋으로 원자화**하여 렌더 스냅샷의 일관성을 보장하기 위해서입니다.

훅이 외부로 노출하는 `UseNQueensResult` 는 `NQueensState` + `NQueensActions` 입니다.

| 필드 | 타입 | 비고 |
| --- | --- | --- |
| `size` | `BoardSize` | 초기값은 `options.initialSize ?? DEFAULT_BOARD_SIZE`. |
| `queens` | `QueenSet` | `queens.size ≤ size` 가 항상 성립한다. |
| `submitStatus` | `SubmitStatus` | 보드를 바꾸는 모든 액션이 즉시 `'idle'` 로 되돌린다. |
| `conflicts` | `QueenSet` | `submitStatus !== 'invalid'` 인 동안 항상 빈 집합. |
| `placedCount` | `number` | `state.queens.size` 로 **파생**한다. 중복 저장하지 않는다(단일 진실 공급원). |

빈 집합은 모듈 상수 `EMPTY_QUEENS` 인스턴스를 재사용합니다. 불변이므로 공유가 안전하고,
참조 동일성이 유지되어 하위 컴포넌트의 메모이제이션이 불필요하게 깨지지 않습니다.

### 5.2 액션과 상태 전이

| 액션 | 시그니처 | 전이 |
| --- | --- | --- |
| `toggleQueen` | `(position: Position) => void` | ① `isWithinBoard` 실패 → **무시** ② 빈 칸인데 `queens.size >= size` → **무시**(초과 배치 불가) ③ 그 외 → `queens` 토글 + `submitStatus='idle'` + `conflicts=∅` |
| `changeSize` | `(size: BoardSize) => void` | 무조건 `createInitialState(size)` 로 교체. **동일 N 이어도 초기화**(명시적 리셋 의도로 간주). |
| `reset` | `() => void` | `createInitialState(현재 size)` 로 교체. **`size` 는 유지**. |
| `submit` | `() => SubmitResult` | `validateSubmission` 결과에 따라: `incomplete` → 상태 **불변** / `invalid` → `submitStatus='invalid'`, `conflicts=result.conflicts` / `solved` → `submitStatus='solved'`, `conflicts=∅`. 결과를 **동기 반환**한다. |

```text
                       toggleQueen / changeSize / reset
              ┌──────────────────────────────────────────────┐
              │                                              │
              ▼                                              │
         ┌─────────┐   submit() → invalid            ┌───────────────┐
         │  idle   │────────────────────────────────▶│    invalid     │
         │conflicts│                                 │conflicts = C   │
         │   = ∅   │────────────────────────────────▶│               │
         └─────────┘   submit() → solved             └───────────────┘
              │                                              ▲
              │                                     ┌────────────────┐
              │        submit() → incomplete        │     solved     │
              └──────── (상태 변화 없음, Toast만) ───│ conflicts = ∅  │
                                                    └────────────────┘
                       invalid / solved 에서 보드를 바꾸면 즉시 idle 로 복귀
```

모든 액션은 `useCallback` 으로 감싸여 있고 의존성이 `[commit]` 뿐이며, `commit` 의 의존성은 `[]` 입니다.
따라서 **액션 4종의 참조는 훅 생애 동안 영구히 동일**합니다. 이 참조 안정성이 `Tile` 의 `memo` 얕은
비교를 성립시키는 전제입니다(§6.2).

### 5.3 `stateRef` 동기 미러 — 설계 의도

```ts
const [state, setState] = useState<InternalState>(...);
const stateRef = useRef<InternalState>(state);

const commit = useCallback((next: InternalState): void => {
  stateRef.current = next;   // ① 동기 미러 갱신
  setState(next);            // ② 렌더 스케줄
}, []);
```

`stateRef` 를 둔 이유는 세 가지입니다.

1. **`submit()` 의 동기 반환 요구** — 계약 §5 는 `submit(): SubmitResult` 를 규정합니다. 호출부는 반환값으로 Toast 노출 여부를 즉시 결정해야 하는데, `useState` 값은 다음 렌더 전까지 갱신되지 않으므로 최신 스냅샷을 읽을 경로가 필요합니다.
2. **같은 tick 내 연속 호출의 무결성** — `useEffect` 로 ref 를 동기화하면 같은 tick 안에서 액션을 연속 호출할 때 stale 값을 읽습니다. `commit()` 안에서 즉시 쓰면 이 문제가 발생하지 않습니다.
3. **액션의 영구 참조 안정성** — 모든 액션이 `state` 대신 `stateRef.current` 만 참조하므로 `useCallback` 의존성 배열에 상태가 들어가지 않습니다.

ref 쓰기는 **오직 `commit()`(= 이벤트 핸들러 경로) 안에서만** 일어납니다. 렌더 단계에서는 ref 를
읽지도 쓰지도 않으므로 React 의 순수 렌더 규칙을 위반하지 않습니다.
렌더에 사용되는 값은 전부 `state`(= `useState` 스냅샷)이고, `stateRef` 는 이벤트 핸들러 전용입니다.

### 5.4 React Concurrent 모드 제약 (기술 부채)

`stateRef` 는 **React 외부에 존재하는 가변 저장소**이므로, Concurrent 기능과 결합하면 다음 전제가 깨집니다.

| 기능 | 위험 |
| --- | --- |
| `useTransition` / `startTransition` | 전이 렌더가 중단·폐기되어도 `stateRef.current` 는 되돌아가지 않습니다. ref 는 커밋 시점이 아니라 **핸들러 실행 시점**에 이미 갱신되었기 때문입니다. |
| `useDeferredValue` | 렌더가 옛 값으로 진행되는 동안 `stateRef.current` 는 최신 값이므로 두 소스가 서로 다른 시점을 가리킵니다. |
| Offscreen / Activity(사전 렌더 후 파기) | 파기된 렌더 경로에서 발생한 커밋이 ref 에 남을 수 있습니다. |
| `<StrictMode>` 이중 호출 | 현재 `commit` 은 멱등한 대입만 하므로 **안전합니다.** 다만 이후 `stateRef.current` 를 읽어 증분 갱신하는 코드가 추가되면 즉시 깨집니다. |
| Server Components / SSR | 훅 전체가 `'use client'` 경계 안이며 `useSyncExternalStore` 없이 외부 저장소를 읽지 않으므로, 현재 형태에서는 하이드레이션 불일치를 유발하지 않습니다. |

**현재 코드베이스는 위 기능을 전혀 사용하지 않으므로 실제 결함은 없습니다.**
이 제약이 코드 주석에 명시되어 있지 않다는 점이 리뷰 게이트가 기록한 기술 부채입니다.
상세와 권장 조치는 [TECH-DEBT.md](TECH-DEBT.md) §2 를 참고하십시오.

**향후 전이 기능을 도입한다면** `useState` + `stateRef` 조합을 `useReducer` 로 대체하거나,
상태를 외부 스토어로 옮기고 `useSyncExternalStore` 로 구독하는 방향이 정공법입니다.

## 6. View 계층

### 6.1 컴포넌트 계층도

```text
app/layout.tsx  (RootLayout — 서버 컴포넌트)
├─ metadata: title "N-Queens Problem" / viewport: width=device-width, initialScale=1
├─ <html lang="ko"> + Geist 폰트 변수 + globals.css
├─ Header                       (layout/Header.tsx — 서버 컴포넌트)
│     └─ <h1> "N-Queens Problem"
├─ <main>
│  └─ app/page.tsx  (Home — 서버 컴포넌트)
│     └─ NQueensGame                       ◀── 'use client' 경계 시작, 유일한 상태 소유자
│        ├─ useNQueens()                   ── State 계층 호출 지점
│        ├─ useState<ToastState>           ── Toast 표시 전용 로컬 UI 상태
│        ├─ SizeSelector  (value, options, onChange)
│        ├─ Board         (size, queens, conflicts, submitStatus, onTileClick)
│        │   └─ Tile × N²  (position, hasQueen, status, onClick)   [memo]
│        ├─ SubmitButton  (onClick, disabled)
│        ├─ ResetButton   (onClick, disabled, ariaLabel)
│        └─ Toast         (open, message, durationMs, onClose)  [key = nonce]
└─ Footer                       (layout/Footer.tsx — 서버 컴포넌트)
      └─ "Copyright © nyj001012"
```

- **클라이언트 경계는 `NQueensGame` 에서 시작**합니다. `page.tsx` 와 `layout.tsx`, `Header`, `Footer` 는 서버 컴포넌트로 유지되어 번들에 포함되지 않습니다.
- Header/Footer 는 `layout.tsx` 가 렌더하므로 `NQueensGame` 이 다시 만들지 않습니다.

### 6.2 Props 명세 (계약 §6 — 7종)

| 컴포넌트 | 파일 | Props |
| --- | --- | --- |
| `Board` | `src/components/board/Board.tsx` | `size: BoardSize`, `queens: QueenSet`, `conflicts: QueenSet`, `submitStatus: SubmitStatus`, `onTileClick: (position: Position) => void` |
| `Tile` | `src/components/board/Tile.tsx` | `position: Position`, `hasQueen: boolean`, `status: TileStatus`, `onClick: (position: Position) => void` |
| `SizeSelector` | `src/components/controls/SizeSelector.tsx` | `value: BoardSize`, `options: readonly BoardSize[]`, `onChange: (size: BoardSize) => void` |
| `SubmitButton` | `src/components/controls/SubmitButton.tsx` | `onClick: () => void`, `disabled: boolean` |
| `ResetButton` | `src/components/controls/ResetButton.tsx` | `onClick: () => void`, `disabled: boolean`, `ariaLabel: string` |
| `Toast` | `src/components/feedback/Toast.tsx` | `open: boolean`, `message: string`, `durationMs: number`, `onClose: () => void` |

모든 필드는 `readonly` 이며, 7번째인 `BoardProps`/`TileProps`/`SizeSelectorProps`/`SubmitButtonProps`/
`ResetButtonProps`/`ToastProps` 를 포함해 계약 §6 이 정의한 인터페이스 전부가 구현되어 있습니다.
`Header`/`Footer` 는 계약 §6 대상이 아니며 props 를 받지 않습니다.

#### Props 타입이 컴포넌트 파일에 코로케이션된 이유

계약 §6 의 View Props 타입들은 도메인 모듈(`src/lib/nqueens.ts`)이 아니라 **각 컴포넌트 파일에
`export interface` 로 선언**되어 있습니다. 각 파일의 주석이 그 사유를 명시합니다.

> 계약 서문의 단방향 의존 규약: **Domain 은 View 를 알아서는 안 된다.**

만약 `BoardProps` 를 `src/lib/nqueens.ts` 에 두면 도메인 모듈이 View 계층의 관심사(`onTileClick`
콜백 시그니처 등)를 알게 되어 `View → State → Domain` 단방향이 깨집니다. 부수 효과로,
도메인 모듈을 import 하는 모든 코드가 UI 타입까지 함께 끌고 오게 됩니다.
따라서 Props 는 그 타입을 소비하는 컴포넌트 옆에 두고, 컴포넌트가 도메인 타입
(`BoardSize`, `Position`, `QueenSet`, `SubmitStatus`, `TileStatus`)만 아래에서 import 합니다.

### 6.3 컴포넌트별 핵심 설계

#### `NQueensGame` — 컨테이너

- 훅을 호출하는 **유일한** 컴포넌트입니다. 하위는 전부 프레젠테이션 컴포넌트입니다.
- `disabled` 정책:
  - **제출** — `submitStatus === 'solved'` 일 때만 비활성화. 퀸이 부족한 상태에서는 **비활성화하지 않습니다.** 미달 시 Toast 안내가 요구사항이므로 버튼을 막으면 그 피드백 경로가 사라집니다.
  - **초기화** — `placedCount === 0` 일 때 비활성화. 지울 것이 없으면 "고장난 버튼"으로 보입니다.
- Toast 재발생 처리: `ToastState.nonce` 를 두고, **이미 열려 있을 때만** 증가시켜 `<Toast key={nonce}>` 를 재마운트합니다.
  - 닫힘 → 열림: 키 유지 → 기존 노드가 남아 있어 등장 트랜지션이 정상 재생됩니다.
  - 열림 → 재발생: 키 변경 → 자동 소멸 타이머가 처음부터 다시 시작합니다.
  - `nonce` 는 `ToastProps` 에 넘기지 않고 React 예약 어트리뷰트 `key` 로만 소비하므로 계약 §6 의 4필드 고정을 위반하지 않습니다.
- Toast 를 닫을 때 `message` 는 지우지 않습니다. 퇴장 트랜지션 동안 글자만 먼저 사라지지 않게 하기 위해서입니다.

#### `Board` — 그리드와 반응형

- `width: var(--board-size)` + `aspect-ratio: 1 / 1` 로 정사각을 강제하고, `--board-size` 는 `clamp(16rem, min(88vw, 60dvh), 44rem)` 입니다. **미디어 쿼리 없이** 모바일부터 2440×1440 까지 대응합니다.
- `gridTemplateColumns/Rows: repeat(N, 1fr)` 로 타일 크기를 계산하고, 자식 폰트 크기 파생을 위해 `--tile-size: calc(var(--board-size) / N)` 을 커스텀 프로퍼티로 내려줍니다.
- **좌표 행렬을 `useMemo([size])` 로 캐싱**합니다. 매 렌더마다 `{ row, col }` 을 새로 만들면 `Tile` 의 memo 얕은 비교가 항상 실패해 N²개 타일이 전부 리렌더됩니다.
- 접근성: `role="group"` + `aria-label="N×N 체스 보드"`.

#### `Tile` — 단일 칸

- `memo` 로 감쌉니다. 얕은 비교가 유효한 근거는 **`position` 참조 안정성(Board 의 `useMemo`)** 과 **`onClick` 참조 안정성(훅의 액션)** 두 가지입니다.
- 색상 **판정**은 도메인(`resolveTileStatus`)이 끝냈고, 여기서는 `TileStatus` → CSS 클래스 매핑만 합니다. View 에서 충돌/정답 규칙을 재구현하지 않습니다.
- 체스판 명암은 `(row + col) % 2` 로 교차시킵니다. `'default'` 만 좌표 의존이므로 `STATUS_CLASS` 맵에서 제외하고 별도 계산합니다.
- 퀸 글리프(`♛`)는 **항상 DOM 에 존재**하고 `opacity`/`transform: scale()` 만 전환합니다. 그래야 배치/취소가 양방향 모두 부드럽게 이어지고 keyframes 가 불필요합니다.
- hover 는 배경색 교체가 아니라 `::after` 오버레이(`--hover` 를 낮은 불투명도로)로 처리합니다. 밝은 칸/어두운 칸에서 같은 세기의 반응이 나오고, Tailwind 의 `hover:` 변형은 `(hover: hover)` 환경에만 적용되어 터치 기기에 잔상이 남지 않습니다.
- 접근성: `aria-pressed={hasQueen}`, `aria-label`은 `"{row+1}행 {col+1}열, 퀸 있음/없음[, 충돌|, 정답]"` — **색상 정보를 문구로도 전달**합니다.
- **포커스 링 클리핑 대응(리뷰 게이트 Major 결함 해소)** — `Board` 의 `overflow-hidden` 이 타일 바깥으로 그려지는 outline 을 잘라내 WCAG 2.4.7/2.4.11 을 위반했습니다. `z-index` 로는 overflow 클리핑을 탈출할 수 없으므로 `focus-visible:[outline-offset:-2px]!` 로 **링을 border-box 안쪽에 그려** 해결했습니다. `!` 가 필수인 이유는, `globals.css` 의 `:focus-visible { outline-offset: 2px }` 가 **레이어 밖(unlayered)** 선언이고 Tailwind 유틸리티는 `@layer utilities` 안에 생성되어, CSS 캐스케이드상 unlayered 일반 선언이 명시도와 무관하게 이기기 때문입니다.

#### `SizeSelector` — 버튼 그룹이 아니라 `<select>`

1. **의미론** — 4~8 중 정확히 하나를 고르는 단일 선택 값이며, 네이티브 `<select>` 가 그 시맨틱 자체입니다. 버튼 그룹은 `role="radiogroup"` + roving tabindex 를 직접 구현해야 같은 접근성에 도달합니다.
2. **접근성** — 키보드 조작(↑↓/타이핑 점프), 스크린 리더 대응, 모바일 네이티브 피커를 브라우저가 무료로 제공합니다.
3. **반응형** — 모바일 하한 뷰포트에서 버튼 5개는 줄바꿈되어 상단 컨트롤 높이가 흔들립니다. `<select>` 는 폭이 일정해 레이아웃이 안정적입니다.

`<select>` 값은 string 이므로 `isBoardSize` 타입 가드를 통과한 뒤에만 `onChange(next)` 를 호출합니다.
"크기를 변경하면 보드가 즉시 초기화됩니다." 보조 문구를 `aria-describedby` 로 연결해 시각/비시각
사용자 모두에게 사전 고지합니다. `id` 충돌 방지를 위해 `useId()` 를 사용합니다.

#### `ResetButton`

요구사항 §2.4 의 디자인 제약(원형 화살표 아이콘이 중앙에 있는 정사각형 버튼)을 `aspect-square` +
인라인 SVG(`currentColor`)로 구현합니다. 텍스트 라벨이 없으므로 `ariaLabel` prop 을 `aria-label` 로
반드시 소비합니다(컨테이너가 `"보드 초기화"` 를 주입).

#### `Toast`

- **열림 여부와 무관하게 항상 마운트**되어 있고 `open` 은 스타일만 바꿉니다. 덕분에 (1) 라이브 리전이 DOM 에 상주해 스크린 리더가 갱신을 놓치지 않고, (2) 요소가 이미 존재하므로 `opacity`/`transform` 변경이 곧바로 CSS transition 을 발동시켜 rAF 지연이나 추가 상태가 필요 없습니다. 결과적으로 이 컴포넌트는 `useState` 없이 순수 props 로만 동작합니다.
- 라이브 리전(`role="status" aria-live="polite" .sr-only`)과 시각적 말풍선을 **분리**했습니다. 리전은 열릴 때만 문구를 담아야 낭독이 트리거되고, 말풍선은 퇴장 트랜지션 동안 문구를 유지해야 글자가 툭 사라지지 않기 때문입니다. 말풍선은 `aria-hidden` 이라 중복 낭독이 없습니다.
- 컨테이너는 `pointer-events-none` 이라 닫힌 동안 아래 요소의 클릭을 막지 않습니다.
- `durationMs` 뒤 자동 소멸하며, `setTimeout` 은 cleanup 에서 반드시 `clearTimeout` 합니다.

## 7. 스타일 시스템 — `src/app/globals.css`

Tailwind v4 의 `@theme inline` 으로 CSS 커스텀 프로퍼티를 유틸리티 색상에 매핑합니다
(`--color-surface` → `bg-surface` 등).

| 토큰 그룹 | 토큰 |
| --- | --- |
| Surfaces & text | `--bg`, `--surface`, `--surface-muted`, `--border`, `--border-strong`, `--fg`, `--fg-muted`, `--fg-inverted` |
| Board tiles | `--tile-light`, `--tile-dark`, `--tile-light-fg`, `--tile-dark-fg` |
| Interaction | `--hover`, `--focus-ring` |
| State colors | `--conflict`, `--conflict-soft`, `--conflict-fg`, `--solved`, `--solved-soft`, `--solved-fg` |
| Motion | `--dur-fast: 120ms`, `--dur-base: 220ms`, `--ease-standard: cubic-bezier(0.4, 0, 0.2, 1)` |
| Shape | `--radius-sm`, `--radius-md`, `--radius-lg` |
| Board sizing | `--board-min: 16rem`, `--board-max: 44rem`, `--board-size` |

- 다크 모드는 `@media (prefers-color-scheme: dark)` 에서 같은 토큰을 재정의하는 방식이라 컴포넌트 코드는 테마를 알지 못합니다.
- 상태 색상(`--conflict`, `--solved`)은 모노톤 팔레트 안에 앉도록 채도를 낮춘 값입니다.
- **모션 토큰이 "일관된 속도와 easing"(요구사항 §3)의 단일 진실 공급원**입니다. 모든 컴포넌트가 인라인 `transition` 에서 이 변수만 참조합니다.
- `@media (prefers-reduced-motion: reduce)` 에서 전역으로 애니메이션/트랜지션을 1ms 로 축소합니다.
- 현재 어떤 컴포넌트도 사용하지 않는 토큰이 4종 있습니다(`--conflict-soft`, `--solved-soft`, `--radius-sm`, `--radius-lg`). 리뷰 게이트에서 **유지 승인**된 항목이며 사유는 [TECH-DEBT.md](TECH-DEBT.md) §4 를 참고하십시오.

## 8. 테스트 구조

| 파일 | 개수 | 대상 계층 | describe 블록 |
| --- | --- | --- | --- |
| `tests/nqueens.spec.ts` | 71 | Domain | 상수, `toCellKey`/`fromCellKey`, `isBoardSize`, `isWithinBoard`, `isAttacking`, `findConflicts`, `isSolved`, `validateSubmission`, `resolveTileStatus`, `formatIncompleteMessage` |
| `tests/useNQueens.spec.tsx` | 39 | State | 초기 상태, `toggleQueen`(토글 배치), `toggleQueen` 방어 로직, `changeSize`, `reset`, `submit`(미달/오답/정답), 제출 결과 무효화, 액션 참조 안정성 |
| **합계** | **110** | | |

- 러너: Vitest 4.1.10 / 환경: `jsdom` / `globals: true` / setup: `vitest.setup.ts`(jest-dom 매처 + `afterEach(cleanup)`).
- 경로 별칭 `@` → `./src` 는 `vitest.config.mts` 의 `resolve.alias` 로 해결합니다(`tsconfig.json` 의 `paths` 와 동일).
- **View 계층(`src/components/**`, `src/app/**`)에 대한 테스트는 존재하지 않습니다.** [TECH-DEBT.md](TECH-DEBT.md) §1 참고.

## 9. 구현이 계약을 확장한 지점

계약을 **위반하지 않으면서** 구현 단계에서 추가된 결정들입니다.

| 항목 | 내용 | 근거 |
| --- | --- | --- |
| `ToastState.nonce` | 컨테이너 로컬 상태. `ToastProps` 가 아니라 React `key` 로만 소비 | 계약 §6 의 `ToastProps` 4필드 고정을 유지하면서 Toast 재발생 타이머를 리셋 |
| `Tile` 의 `memo` | 계약에 없는 최적화 | N²(최대 64) 타일의 전면 리렌더 방지. 계약 §5 의 액션 참조 안정성이 전제 |
| `Board` 의 좌표 `useMemo` | 계약에 없는 최적화 | 위 `memo` 의 얕은 비교를 성립시키기 위해 필수 |
| `aria-*` 속성 전반 | 계약이 요구한 것은 `ResetButtonProps.ariaLabel` 뿐 | 아이콘/색상 전용 정보를 비시각 사용자에게 전달 |
| `focus-visible:[outline-offset:-2px]!` | 계약에 없음 | 리뷰 게이트 Major 결함(포커스 링 클리핑) 해소 |
| 도메인 타입 재선언 | `src/lib/nqueens.ts` 가 계약 §1~§3 의 타입을 다시 선언 | 계약 파일은 `declare` 전용 산출물이라 런타임 import 대상이 아님. 다만 컴파일 타임 연결이 없어 드리프트 위험이 있음([TECH-DEBT.md](TECH-DEBT.md) §7 참고) |

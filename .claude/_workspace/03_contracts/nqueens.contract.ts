/**
 * =============================================================================
 * N-Queens Puzzle — 시스템 계약 (Contract)
 * =============================================================================
 *
 * 본 파일은 FE-only(100% 클라이언트 사이드) N-Queens 웹 게임의 **단일 진실 공급원**이다.
 * 백엔드/DB/API 가 존재하지 않으므로 전통적인 Controller / Service / Repository 3계층 대신
 * 아래 3계층으로 치환하여 계약을 정의한다.
 *
 *   1) 도메인 로직 계층 (Domain)  — 순수 함수. React/DOM 비의존. 부수효과 없음.
 *   2) 상태 훅 계층   (State)    — `useNQueens` 커스텀 훅. 도메인 로직을 오케스트레이션.
 *   3) UI Props 계층  (View)     — 프레젠테이션 컴포넌트의 Props. 상태를 소유하지 않음.
 *
 * 의존 방향은 단방향이다:  View  ──▶  State  ──▶  Domain
 * (Domain 은 State 를 모르고, State 는 View 를 모른다.)
 *
 * 규칙
 * - 본 파일은 **선언(declaration)만** 포함한다. 구현 코드는 일절 포함하지 않는다.
 *   (순수 함수는 `export declare function` 으로 시그니처만 노출한다.)
 * - `any` / `Record<string, unknown>` 사용을 금지한다. 모든 값은 엄격하게 타이핑한다.
 * - 원본 요구사항: `.claude/_workspace/requirements.md`
 *
 * @packageDocumentation
 */

/* =============================================================================
 * 1. 상수 및 범위 (Constants & Ranges)
 * ========================================================================== */

/**
 * 지원하는 보드 크기(N)의 최솟값.
 * @see requirements.md §2.1 — "보드 크기(N)는 최소 4x4에서 최대 8x8까지 지원한다."
 *
 * 참고: N=2, N=3 은 해가 존재하지 않으므로 게임으로 성립하지 않는다.
 *       요구사항이 하한을 4로 정한 것과 수학적 사실이 일치한다.
 */
export const MIN_N = 4;

/**
 * 지원하는 보드 크기(N)의 최댓값.
 * @see requirements.md §2.1
 */
export const MAX_N = 8;

/**
 * 보드 한 변의 길이(N).
 *
 * `number` 가 아닌 **리터럴 유니온**으로 좁힌 이유:
 * 범위를 벗어난 N(예: 3, 12)이 훅/컴포넌트 경계를 통과하는 것을 런타임 검사가 아닌
 * **컴파일 타임에** 차단하기 위함이다. 외부 입력(`<select>` 의 string 값 등)은
 * 반드시 {@link isBoardSize} 타입 가드를 통과시킨 뒤 이 타입으로 승격해야 한다.
 */
export type BoardSize = 4 | 5 | 6 | 7 | 8;

/**
 * 사용자가 선택할 수 있는 보드 크기 목록. 오름차순 정렬이 보장된다.
 * `SizeSelectorProps.options` 의 기본 데이터 소스로 사용한다.
 */
export const BOARD_SIZES: readonly BoardSize[] = [4, 5, 6, 7, 8];

/**
 * 최초 마운트 시 적용되는 기본 보드 크기.
 * 고전 8-Queens 문제를 첫 화면으로 제시한다.
 */
export const DEFAULT_BOARD_SIZE: BoardSize = 8;

/**
 * 좌표(행/열) 인덱스로 사용 가능한 값의 범위. **0-based** 이다.
 * 유효 범위는 `0 .. size - 1` 이며, `size` 는 {@link BoardSize} 이다.
 * (즉 최대 인덱스는 `MAX_N - 1 === 7`.)
 */
export const MIN_INDEX = 0;

/**
 * 미달 제출 시 노출할 경고 문구의 템플릿.
 * `{n}` 플레이스홀더는 {@link formatIncompleteMessage} 가 실제 N 으로 치환한다.
 *
 * @see requirements.md §2.3 — "N개의 퀸을 모두 배치해주세요"
 * @example formatIncompleteMessage(8) === '8개의 퀸을 모두 배치해주세요'
 */
export const MSG_INCOMPLETE_TEMPLATE = '{n}개의 퀸을 모두 배치해주세요';

/**
 * 경고 Toast 의 기본 자동 소멸 시간(ms).
 * {@link ToastProps.durationMs} 의 기본값으로 사용한다.
 */
export const TOAST_DURATION_MS = 2000;

/* =============================================================================
 * 2. 도메인 타입 (Domain Types)
 * ========================================================================== */

/**
 * 보드 위의 단일 좌표. **0-based, 좌상단 원점.**
 *
 * - `row`: 위에서 아래로 증가 (0 ≤ row < size)
 * - `col`: 왼쪽에서 오른쪽으로 증가 (0 ≤ col < size)
 *
 * 불변(immutable) 값 객체이므로 모든 필드는 `readonly` 이다.
 */
export interface Position {
  readonly row: number;
  readonly col: number;
}

/**
 * 좌표를 문자열로 직렬화한 셀 키. 형식은 `` `${row},${col}` `` 이다.
 * 예) `"0,0"`, `"3,7"`
 *
 * 생성은 반드시 {@link toCellKey} 를, 역변환은 {@link fromCellKey} 를 사용한다.
 * (문자열 리터럴을 직접 조립하지 말 것 — 포맷 변경 시 전 코드베이스가 깨진다.)
 */
export type CellKey = `${number},${number}`;

/**
 * 보드에 배치된 퀸 전체의 집합.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 【설계 선택 이유】 `Position[]` 이 아니라 **셀 키 문자열 집합(`ReadonlySet<CellKey>`)**
 * 을 채택한다.
 *
 *  (1) 조회 성능: 보드는 매 렌더마다 N² 개(최대 64개) 타일을 그리며, 각 타일은
 *      "내 자리에 퀸이 있는가?"를 물어야 한다. Set 은 O(1), 배열은 O(N) 이므로
 *      전체 비용이 O(N²) 대 O(N³) 로 갈린다.
 *  (2) 토글 구현의 단순성: 요구사항 §2.2 의 좌클릭 토글은 "있으면 삭제, 없으면 추가"
 *      라는 집합 연산 그 자체다. 배열이라면 `findIndex` + `splice` 조합이 필요하다.
 *  (3) 참조 동일성 문제 회피: `Position` 은 객체이므로 `Set<Position>` 을 쓰면
 *      값이 같아도 참조가 다르면 별개 원소로 취급되어 중복 배치가 발생한다.
 *      문자열 키는 값 동등성(value equality)을 그대로 집합 동등성으로 쓴다.
 *  (4) 충돌 집합 연산: {@link findConflicts} 의 결과와 배치 집합을 비교/차집합하는
 *      연산이 자연스럽다.
 *
 *  트레이드오프: 순회 순서가 "배치 순서"로 고정되고 좌표를 쓰려면 파싱이 필요하다.
 *  본 게임은 배치 순서에 의미가 없고 파싱 대상이 최대 64개이므로 무시 가능하다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type QueenSet = ReadonlySet<CellKey>;

/**
 * 개별 타일의 시각적 상태.
 *
 * - `'default'` — 기본(모노톤). 미제출 상태이거나 초기화 직후.
 * - `'conflict'` — **빨간색**. 제출 결과 오답이며, 이 칸의 퀸이 충돌에 연루됨.
 * - `'solved'`  — **초록색**. 제출 결과 정답이며, 모든 퀸이 이 상태가 됨.
 *
 * @see requirements.md §2.3
 */
export type TileStatus = 'default' | 'conflict' | 'solved';

/**
 * 보드 전체의 제출 단계 상태.
 *
 * - `'idle'`    — 아직 제출하지 않았거나, 제출 후 보드를 변경하여 결과가 무효화된 상태.
 * - `'invalid'` — 제출했고 충돌이 존재하는 상태(오답). {@link UseNQueensResult.conflicts} 가 비어있지 않다.
 * - `'solved'`  — 제출했고 정답인 상태.
 *
 * 미달 제출(`incomplete`)은 **여기에 포함되지 않는다.** 미달은 Toast 경고만 띄우고
 * 검증을 진행하지 않으므로(요구사항 §2.3) 보드 상태를 바꾸지 않는다.
 */
export type SubmitStatus = 'idle' | 'invalid' | 'solved';

/* =============================================================================
 * 3. 제출 검증 결과 — 판별 유니온 (Discriminated Union)
 * ========================================================================== */

/**
 * 퀸 수가 N 에 미달하여 검증을 수행하지 않은 결과.
 * 호출부는 {@link formatIncompleteMessage} 로 Toast 문구를 만들어 노출한다.
 */
export interface SubmitIncomplete {
  readonly kind: 'incomplete';
  /** 현재 보드에 배치된 퀸의 개수. `0 ≤ placed < required` 가 보장된다. */
  readonly placed: number;
  /** 요구되는 퀸의 개수. 현재 보드 크기 N 과 같다. */
  readonly required: BoardSize;
}

/**
 * N 개를 모두 배치했으나 서로 공격 가능한 퀸이 존재하는 오답 결과.
 */
export interface SubmitInvalid {
  readonly kind: 'invalid';
  /**
   * 충돌에 **연루된 퀸들만** 담은 집합. 항상 원소가 2개 이상이다.
   * 충돌하지 않은 퀸은 포함되지 않는다.
   * @see requirements.md §2.3 — "충돌이 발생한 퀸들의 칸 색상을 빨간색으로 변경한다."
   */
  readonly conflicts: QueenSet;
}

/**
 * N 개를 모두 배치했고 어떤 두 퀸도 서로 공격할 수 없는 정답 결과.
 */
export interface SubmitSolved {
  readonly kind: 'solved';
}

/**
 * {@link validateSubmission} 의 반환 타입.
 * `kind` 필드를 판별자(discriminant)로 사용하여 호출부에서 exhaustive 분기한다.
 */
export type SubmitResult = SubmitIncomplete | SubmitInvalid | SubmitSolved;

/* =============================================================================
 * 4. 도메인 로직 계층 — 순수 함수 시그니처 (선언 전용)
 * -----------------------------------------------------------------------------
 * 아래 함수는 모두 다음을 만족해야 한다:
 *   · 부수효과 없음(no side effect)  · 입력 인자 변형 금지(no mutation)
 *   · 동일 입력 → 동일 출력          · React / DOM / 브라우저 API 비의존
 * ========================================================================== */

/**
 * 좌표를 {@link CellKey} 문자열로 직렬화한다.
 *
 * @param position 직렬화할 좌표.
 * @returns `` `${row},${col}` `` 형식의 셀 키.
 */
export declare function toCellKey(position: Position): CellKey;

/**
 * {@link CellKey} 문자열을 좌표로 역직렬화한다.
 * {@link toCellKey} 와 왕복(round-trip) 동형이어야 한다.
 *
 * @param key 역직렬화할 셀 키.
 * @returns 파싱된 좌표.
 */
export declare function fromCellKey(key: CellKey): Position;

/**
 * 임의의 숫자가 지원 범위 내의 보드 크기인지 판별하는 타입 가드.
 * `<select>` 의 문자열 값 등 신뢰할 수 없는 입력을 {@link BoardSize} 로 승격할 때 사용한다.
 *
 * @param value 검사할 값.
 * @returns `MIN_N ≤ value ≤ MAX_N` 이고 정수이면 `true`.
 */
export declare function isBoardSize(value: number): value is BoardSize;

/**
 * 좌표가 주어진 보드 범위 안에 있는지 판별한다.
 *
 * @param position 검사할 좌표.
 * @param size 보드 한 변의 길이.
 * @returns `0 ≤ row < size && 0 ≤ col < size` 이면 `true`.
 */
export declare function isWithinBoard(position: Position, size: BoardSize): boolean;

/**
 * **두 퀸이 서로 공격 가능한지** 판정한다. N-Queens 규칙의 최소 단위이다.
 *
 * 공격 조건(하나라도 만족 시 `true`):
 *  1. 같은 행       — `a.row === b.row`
 *  2. 같은 열       — `a.col === b.col`
 *  3. 대각선(↘↖)   — `a.row - a.col === b.row - b.col`
 *  4. 반대각선(↙↗) — `a.row + a.col === b.row + b.col`
 *
 * 동일한 좌표를 두 번 넘기는 것은 호출부의 계약 위반이다(집합이므로 발생하지 않음).
 * 그럼에도 방어적으로 **같은 좌표는 `false`(자기 자신은 공격하지 않음)** 를 반환한다.
 *
 * @param a 첫 번째 퀸의 좌표.
 * @param b 두 번째 퀸의 좌표.
 * @returns 서로의 공격 경로에 있으면 `true`.
 */
export declare function isAttacking(a: Position, b: Position): boolean;

/**
 * 배치된 퀸 전체를 검사하여 **충돌에 연루된 퀸들의 집합**을 산출한다.
 *
 * 어떤 퀸이 다른 퀸 하나와라도 {@link isAttacking} 관계이면 결과에 포함된다.
 * 서로 공격하는 두 퀸은 **양쪽 모두** 포함된다(한쪽만 빨간색이 되면 안 됨).
 * 충돌이 전혀 없으면 빈 집합을 반환한다.
 *
 * @param queens 현재 배치된 퀸 집합.
 * @returns 충돌에 연루된 퀸들만 담은 부분집합. `queens` 를 변형하지 않는다.
 * @see requirements.md §2.3 — 오답(Red) 판정 대상
 */
export declare function findConflicts(queens: QueenSet): QueenSet;

/**
 * 배치가 완전한 해(solution)인지 판별한다.
 * `queens.size === size` 이면서 충돌이 하나도 없을 때만 `true`.
 *
 * @param queens 현재 배치된 퀸 집합.
 * @param size 보드 한 변의 길이 = 필요한 퀸의 개수.
 */
export declare function isSolved(queens: QueenSet, size: BoardSize): boolean;

/**
 * [제출] 검증의 진입점. 요구사항 §2.3 의 판정 순서를 그대로 따른다.
 *
 * 판정 순서(단락 평가):
 *  1. `queens.size < size`  → `{ kind: 'incomplete', placed, required }`
 *     — Toast 경고만 노출하고 **색상 검증을 진행하지 않는다.**
 *  2. 충돌 존재            → `{ kind: 'invalid', conflicts }` — 해당 칸을 빨간색으로.
 *  3. 그 외                → `{ kind: 'solved' }` — 모든 칸을 초록색으로.
 *
 * `queens.size > size` 는 훅이 배치 시점에 차단하므로 발생하지 않는 상태이다.
 *
 * @param queens 현재 배치된 퀸 집합.
 * @param size 현재 보드 크기 N.
 * @returns 판별 유니온 {@link SubmitResult}.
 */
export declare function validateSubmission(queens: QueenSet, size: BoardSize): SubmitResult;

/**
 * 개별 타일이 렌더링될 시각 상태를 도출한다. View 계층의 분기 로직을 제거하기 위한 헬퍼.
 *
 * 판정 규칙:
 *  · 퀸이 없는 칸                      → `'default'`
 *  · `submitStatus === 'idle'`         → `'default'`
 *  · `submitStatus === 'solved'`       → `'solved'`
 *  · `submitStatus === 'invalid'` 이고 `conflicts` 에 포함 → `'conflict'`
 *  · `submitStatus === 'invalid'` 이지만 충돌 무관한 퀸    → `'default'`
 *
 * @param position 대상 타일의 좌표.
 * @param queens 현재 배치된 퀸 집합.
 * @param conflicts 마지막 검증에서 산출된 충돌 퀸 집합.
 * @param submitStatus 현재 제출 상태.
 * @returns 해당 타일에 적용할 {@link TileStatus}.
 */
export declare function resolveTileStatus(
  position: Position,
  queens: QueenSet,
  conflicts: QueenSet,
  submitStatus: SubmitStatus,
): TileStatus;

/**
 * 미달 제출 경고 문구를 생성한다.
 * {@link MSG_INCOMPLETE_TEMPLATE} 의 `{n}` 을 실제 N 으로 치환한다.
 *
 * @param size 요구되는 퀸의 개수(= 보드 크기 N).
 * @returns 예: `'8개의 퀸을 모두 배치해주세요'`
 * @see requirements.md §2.3
 */
export declare function formatIncompleteMessage(size: BoardSize): string;

/* =============================================================================
 * 5. 상태 훅 계층 — `useNQueens` 계약
 * ========================================================================== */

/**
 * 훅이 노출하는 **읽기 전용 상태**.
 * 모든 필드는 파생 여부와 무관하게 렌더 시점의 일관된 스냅샷이어야 한다.
 */
export interface NQueensState {
  /** 현재 보드 크기 N. 초기값은 {@link DEFAULT_BOARD_SIZE}. */
  readonly size: BoardSize;
  /** 현재 배치된 퀸 집합. 이 집합의 크기는 항상 `size` 이하이다. */
  readonly queens: QueenSet;
  /**
   * 현재 제출 상태.
   * 보드를 변경하는 모든 액션(`toggleQueen` / `changeSize` / `reset`)은
   * 이 값을 즉시 `'idle'` 로 되돌린다 — 오래된 색상 결과가 남아 사용자를 오도하면 안 된다.
   */
  readonly submitStatus: SubmitStatus;
  /**
   * 마지막 제출에서 산출된 충돌 퀸 집합.
   * `submitStatus !== 'invalid'` 인 동안에는 항상 빈 집합이다.
   */
  readonly conflicts: QueenSet;
  /** 배치된 퀸의 개수. `queens.size` 와 동일하며 UI 편의를 위해 노출한다. */
  readonly placedCount: number;
}

/**
 * 훅이 노출하는 **액션**. 모두 참조 안정성(referential stability)을 유지해야 한다
 * (`useCallback` 등으로 감싸 매 렌더마다 새 함수가 생성되지 않게 할 것).
 */
export interface NQueensActions {
  /**
   * 좌클릭 토글. 요구사항 §2.2 를 그대로 구현한다.
   *
   * 규칙:
   *  · **빈 칸 클릭**          → 해당 칸에 퀸을 배치한다.
   *  · **퀸이 있는 칸 클릭**   → 해당 칸의 퀸 배치를 취소한다.
   *  · 모바일 터치를 고려해 **우클릭(contextmenu)은 사용하지 않는다.** 좌클릭/탭으로 통일.
   *  · 이미 `placedCount === size` 인 상태에서 **빈 칸**을 클릭하면 **무시**한다
   *    (N 개 초과 배치 불가). 단, 이 경우에도 기존 퀸의 취소는 정상 동작한다.
   *  · 보드 범위를 벗어난 좌표는 무시한다({@link isWithinBoard}).
   *  · 상태를 변경한 경우 `submitStatus` 를 `'idle'` 로, `conflicts` 를 빈 집합으로 되돌린다.
   *
   * @param position 클릭된 타일의 좌표.
   */
  readonly toggleQueen: (position: Position) => void;

  /**
   * 보드 크기(N)를 변경한다.
   *
   * 규칙:
   *  · **N 변경 시 보드는 즉시 초기화된다** — `queens`/`conflicts` 는 빈 집합,
   *    `submitStatus` 는 `'idle'` 이 된다. (요구사항 §2.1)
   *  · 현재와 동일한 N 을 넘겨도 초기화를 수행한다(사용자의 명시적 리셋 의도로 간주).
   *
   * @param size 새 보드 크기.
   */
  readonly changeSize: (size: BoardSize) => void;

  /**
   * [초기화] 버튼 동작. 배치된 모든 퀸을 제거하고 타일 색상을 기본값으로 되돌린다.
   * `size` 는 유지된다. (요구사항 §2.4)
   */
  readonly reset: () => void;

  /**
   * [제출] 버튼 동작. {@link validateSubmission} 을 실행하고 그 결과를 상태에 반영한다.
   *
   * 상태 반영 규칙:
   *  · `'incomplete'` → 상태를 **변경하지 않는다.** 호출부가 Toast 를 띄운다.
   *  · `'invalid'`    → `submitStatus = 'invalid'`, `conflicts = result.conflicts`.
   *  · `'solved'`     → `submitStatus = 'solved'`, `conflicts = 빈 집합`.
   *
   * @returns 판정 결과. 호출부는 이 값으로 Toast 노출 여부를 결정한다.
   */
  readonly submit: () => SubmitResult;
}

/**
 * `useNQueens` 훅의 반환 타입.
 * 상태(읽기)와 액션(쓰기)을 합성한 형태로, 두 관심사는 위 두 인터페이스로 분리되어 있다.
 */
export interface UseNQueensResult extends NQueensState, NQueensActions {}

/**
 * `useNQueens` 훅의 선택적 초기화 옵션.
 */
export interface UseNQueensOptions {
  /** 초기 보드 크기. 생략 시 {@link DEFAULT_BOARD_SIZE}. */
  readonly initialSize?: BoardSize;
}

/**
 * N-Queens 게임의 전체 상태와 액션을 소유하는 커스텀 훅.
 * 이 훅은 클라이언트 컴포넌트에서만 호출 가능하다(`'use client'`).
 *
 * @param options 초기화 옵션.
 * @returns {@link UseNQueensResult}
 */
export declare function useNQueens(options?: UseNQueensOptions): UseNQueensResult;

/* =============================================================================
 * 6. UI Props 계층 (View)
 * -----------------------------------------------------------------------------
 * 아래 컴포넌트는 모두 **상태를 소유하지 않는 프레젠테이션 컴포넌트**이다.
 * 모든 데이터는 props 로 주입받고, 모든 변경은 콜백으로 위임한다.
 * ========================================================================== */

/**
 * 체스 보드 그리드. `size × size` 개의 {@link TileProps} 타일을 렌더링한다.
 * 반응형 요구사항(모바일 ~ 2440×1440)에 따라 정사각 비율을 유지해야 한다.
 */
export interface BoardProps {
  /** 보드 한 변의 길이 N. */
  readonly size: BoardSize;
  /** 현재 배치된 퀸 집합. */
  readonly queens: QueenSet;
  /** 충돌 퀸 집합. `submitStatus !== 'invalid'` 이면 빈 집합. */
  readonly conflicts: QueenSet;
  /** 현재 제출 상태. 타일 색상 도출에 사용한다. */
  readonly submitStatus: SubmitStatus;
  /** 타일 클릭(또는 탭) 시 호출. 좌표를 그대로 전달한다. */
  readonly onTileClick: (position: Position) => void;
}

/**
 * 보드의 단일 칸.
 * 색상 전환은 일관된 속도/easing 의 CSS transition 으로 처리한다(요구사항 §3).
 */
export interface TileProps {
  /** 이 타일의 좌표. */
  readonly position: Position;
  /** 이 칸에 퀸이 있는지 여부. */
  readonly hasQueen: boolean;
  /** 이 칸에 적용할 시각 상태. {@link resolveTileStatus} 의 결과. */
  readonly status: TileStatus;
  /** 클릭/탭 핸들러. 자신의 좌표를 인자로 넘긴다. */
  readonly onClick: (position: Position) => void;
}

/**
 * 화면 상단의 보드 크기 선택 UI(Select Box 또는 버튼 그룹).
 */
export interface SizeSelectorProps {
  /** 현재 선택된 보드 크기. */
  readonly value: BoardSize;
  /** 선택 가능한 크기 목록. 기본값은 {@link BOARD_SIZES}. */
  readonly options: readonly BoardSize[];
  /**
   * 선택 변경 시 호출. **호출 즉시 보드가 초기화됨**을 사용자에게 인지시킬 책임은
   * 상위 컨테이너에 있다(요구사항 §2.1).
   */
  readonly onChange: (size: BoardSize) => void;
}

/**
 * 화면 하단의 [제출] 버튼.
 */
export interface SubmitButtonProps {
  /** 클릭 핸들러. 컨테이너가 `submit()` 을 호출하고 결과에 따라 Toast 를 띄운다. */
  readonly onClick: () => void;
  /** 비활성화 여부. 정답(`solved`) 이후 재제출을 막는 용도 등으로 사용한다. */
  readonly disabled: boolean;
}

/**
 * [초기화] 버튼.
 * 디자인 제약: **원형 화살표 아이콘이 중앙에 놓인 정사각형 버튼**(요구사항 §2.4).
 */
export interface ResetButtonProps {
  /** 클릭 핸들러. 컨테이너가 `reset()` 을 호출한다. */
  readonly onClick: () => void;
  /** 비활성화 여부. 배치된 퀸이 0개일 때 `true` 로 두는 것을 권장한다. */
  readonly disabled: boolean;
  /** 스크린 리더용 접근성 레이블. 아이콘 전용 버튼이므로 필수이다. */
  readonly ariaLabel: string;
}

/**
 * 미달 제출 경고용 Toast.
 * 현재 요구사항에서 Toast 가 사용되는 유일한 경로는 `SubmitIncomplete` 이다.
 */
export interface ToastProps {
  /** 노출 여부. */
  readonly open: boolean;
  /** 노출할 문구. {@link formatIncompleteMessage} 의 결과를 주입한다. */
  readonly message: string;
  /** 자동 소멸 시간(ms). 기본값 {@link TOAST_DURATION_MS}. */
  readonly durationMs: number;
  /** 자동 소멸 또는 사용자 닫기 시 호출. */
  readonly onClose: () => void;
}

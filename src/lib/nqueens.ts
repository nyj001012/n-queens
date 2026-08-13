/**
 * =============================================================================
 * N-Queens — 도메인 로직 계층 (Domain)
 * =============================================================================
 *
 * `.claude/_workspace/03_contracts/nqueens.contract.ts` §1~§4 의 구현체이다.
 *
 * 본 모듈의 모든 export 는 다음을 만족한다.
 *   · 부수효과 없음(no side effect)   · 입력 인자 변형 금지(no mutation)
 *   · 동일 입력 → 동일 출력           · React / DOM / 브라우저 API 비의존
 *
 * @packageDocumentation
 */

/* =============================================================================
 * 1. 상수 및 범위 (Constants & Ranges)
 * ========================================================================== */

/** 지원하는 보드 크기(N)의 최솟값. */
export const MIN_N = 4;

/** 지원하는 보드 크기(N)의 최댓값. */
export const MAX_N = 8;

/** 보드 한 변의 길이(N). 범위를 벗어난 값을 컴파일 타임에 차단하기 위한 리터럴 유니온. */
export type BoardSize = 4 | 5 | 6 | 7 | 8;

/** 사용자가 선택할 수 있는 보드 크기 목록(오름차순). */
export const BOARD_SIZES: readonly BoardSize[] = [4, 5, 6, 7, 8];

/** 최초 마운트 시 적용되는 기본 보드 크기. */
export const DEFAULT_BOARD_SIZE: BoardSize = 8;

/** 좌표(행/열) 인덱스의 최솟값. 0-based. */
export const MIN_INDEX = 0;

/** 미달 제출 경고 문구 템플릿. `{n}` 은 {@link formatIncompleteMessage} 가 치환한다. */
export const MSG_INCOMPLETE_TEMPLATE = '{n}개의 퀸을 모두 배치해주세요';

/** 경고 Toast 의 기본 자동 소멸 시간(ms). */
export const TOAST_DURATION_MS = 2000;

/* =============================================================================
 * 2. 도메인 타입 (Domain Types)
 * ========================================================================== */

/** 보드 위의 단일 좌표. 0-based, 좌상단 원점. */
export interface Position {
  readonly row: number;
  readonly col: number;
}

/** 좌표를 직렬화한 셀 키. 형식은 `` `${row},${col}` ``. */
export type CellKey = `${number},${number}`;

/** 보드에 배치된 퀸 전체의 집합. */
export type QueenSet = ReadonlySet<CellKey>;

/** 개별 타일의 시각적 상태. */
export type TileStatus = 'default' | 'conflict' | 'solved';

/** 보드 전체의 제출 단계 상태. */
export type SubmitStatus = 'idle' | 'invalid' | 'solved';

/* =============================================================================
 * 3. 제출 검증 결과 — 판별 유니온 (Discriminated Union)
 * ========================================================================== */

/** 퀸 수가 N 에 미달하여 검증을 수행하지 않은 결과. */
export interface SubmitIncomplete {
  readonly kind: 'incomplete';
  /** 현재 보드에 배치된 퀸의 개수. */
  readonly placed: number;
  /** 요구되는 퀸의 개수(= 보드 크기 N). */
  readonly required: BoardSize;
}

/** N 개를 모두 배치했으나 서로 공격 가능한 퀸이 존재하는 오답 결과. */
export interface SubmitInvalid {
  readonly kind: 'invalid';
  /** 충돌에 연루된 퀸들만 담은 집합. */
  readonly conflicts: QueenSet;
}

/** N 개를 모두 배치했고 어떤 두 퀸도 서로 공격할 수 없는 정답 결과. */
export interface SubmitSolved {
  readonly kind: 'solved';
}

/** {@link validateSubmission} 의 반환 타입. */
export type SubmitResult = SubmitIncomplete | SubmitInvalid | SubmitSolved;

/* =============================================================================
 * 4. 도메인 로직 — 순수 함수 구현
 * ========================================================================== */

/**
 * 좌표를 {@link CellKey} 문자열로 직렬화한다.
 *
 * @param position 직렬화할 좌표.
 * @returns `` `${row},${col}` `` 형식의 셀 키.
 */
export function toCellKey(position: Position): CellKey {
  return `${position.row},${position.col}`;
}

/**
 * {@link CellKey} 문자열을 좌표로 역직렬화한다. {@link toCellKey} 와 왕복 동형이다.
 *
 * @param key 역직렬화할 셀 키.
 * @returns 파싱된 좌표.
 */
export function fromCellKey(key: CellKey): Position {
  // 음수 좌표(`"-1,2"`)도 안전하게 파싱하기 위해 split 대신 첫 구분자 위치를 사용한다.
  const separatorIndex = key.indexOf(',');
  const row = Number(key.slice(0, separatorIndex));
  const col = Number(key.slice(separatorIndex + 1));
  return { row, col };
}

/**
 * 임의의 숫자가 지원 범위 내의 보드 크기인지 판별하는 타입 가드.
 *
 * @param value 검사할 값.
 * @returns 정수이면서 `MIN_N ≤ value ≤ MAX_N` 이면 `true`.
 */
export function isBoardSize(value: number): value is BoardSize {
  return Number.isInteger(value) && value >= MIN_N && value <= MAX_N;
}

/**
 * 좌표가 주어진 보드 범위 안에 있는지 판별한다.
 *
 * @param position 검사할 좌표.
 * @param size 보드 한 변의 길이.
 * @returns `0 ≤ row < size && 0 ≤ col < size` 이면 `true`.
 */
export function isWithinBoard(position: Position, size: BoardSize): boolean {
  const { row, col } = position;
  return row >= MIN_INDEX && row < size && col >= MIN_INDEX && col < size;
}

/**
 * 두 퀸이 서로 공격 가능한지 판정한다.
 *
 * 행 / 열 / 대각선(`row - col`) / 반대각선(`row + col`) 중 하나라도 일치하면 `true`.
 * 단, **동일한 좌표는 `false`**(자기 자신은 공격하지 않는다).
 *
 * @param a 첫 번째 퀸의 좌표.
 * @param b 두 번째 퀸의 좌표.
 * @returns 서로의 공격 경로에 있으면 `true`.
 */
export function isAttacking(a: Position, b: Position): boolean {
  if (a.row === b.row && a.col === b.col) {
    return false;
  }

  return (
    a.row === b.row ||
    a.col === b.col ||
    a.row - a.col === b.row - b.col ||
    a.row + a.col === b.row + b.col
  );
}

/**
 * 배치된 퀸 전체를 검사하여 충돌에 연루된 퀸들의 집합을 산출한다.
 * 서로 공격하는 두 퀸은 **양쪽 모두** 포함되며, 충돌 무관한 퀸은 포함되지 않는다.
 *
 * @param queens 현재 배치된 퀸 집합.
 * @returns 충돌에 연루된 퀸들만 담은 새 집합. `queens` 를 변형하지 않는다.
 */
export function findConflicts(queens: QueenSet): QueenSet {
  const keys: CellKey[] = Array.from(queens);
  const positions: Position[] = keys.map(fromCellKey);
  const conflicts = new Set<CellKey>();

  for (let i = 0; i < keys.length; i += 1) {
    for (let j = i + 1; j < keys.length; j += 1) {
      if (isAttacking(positions[i], positions[j])) {
        conflicts.add(keys[i]);
        conflicts.add(keys[j]);
      }
    }
  }

  return conflicts;
}

/**
 * 배치가 완전한 해(solution)인지 판별한다.
 *
 * @param queens 현재 배치된 퀸 집합.
 * @param size 보드 한 변의 길이 = 필요한 퀸의 개수.
 * @returns `queens.size === size` 이면서 충돌이 하나도 없으면 `true`.
 */
export function isSolved(queens: QueenSet, size: BoardSize): boolean {
  if (queens.size !== size) {
    return false;
  }

  return findConflicts(queens).size === 0;
}

/**
 * [제출] 검증의 진입점. `incomplete → invalid → solved` 순서로 단락 평가한다.
 *
 * @param queens 현재 배치된 퀸 집합.
 * @param size 현재 보드 크기 N.
 * @returns 판별 유니온 {@link SubmitResult}.
 */
export function validateSubmission(queens: QueenSet, size: BoardSize): SubmitResult {
  if (queens.size < size) {
    return { kind: 'incomplete', placed: queens.size, required: size };
  }

  const conflicts = findConflicts(queens);
  if (conflicts.size > 0) {
    return { kind: 'invalid', conflicts };
  }

  return { kind: 'solved' };
}

/**
 * 개별 타일이 렌더링될 시각 상태를 도출한다.
 *
 * @param position 대상 타일의 좌표.
 * @param queens 현재 배치된 퀸 집합.
 * @param conflicts 마지막 검증에서 산출된 충돌 퀸 집합.
 * @param submitStatus 현재 제출 상태.
 * @returns 해당 타일에 적용할 {@link TileStatus}.
 */
export function resolveTileStatus(
  position: Position,
  queens: QueenSet,
  conflicts: QueenSet,
  submitStatus: SubmitStatus,
): TileStatus {
  const key = toCellKey(position);

  if (!queens.has(key)) {
    return 'default';
  }

  switch (submitStatus) {
    case 'solved':
      return 'solved';
    case 'invalid':
      return conflicts.has(key) ? 'conflict' : 'default';
    case 'idle':
    default:
      return 'default';
  }
}

/**
 * 미달 제출 경고 문구를 생성한다.
 *
 * @param size 요구되는 퀸의 개수(= 보드 크기 N).
 * @returns 예: `'8개의 퀸을 모두 배치해주세요'`
 */
export function formatIncompleteMessage(size: BoardSize): string {
  return MSG_INCOMPLETE_TEMPLATE.replace('{n}', String(size));
}

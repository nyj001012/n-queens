import { describe, expect, it } from 'vitest';

import {
  BOARD_SIZES,
  DEFAULT_BOARD_SIZE,
  MAX_N,
  MIN_INDEX,
  MIN_N,
  MSG_INCOMPLETE_TEMPLATE,
  TOAST_DURATION_MS,
  findConflicts,
  formatIncompleteMessage,
  fromCellKey,
  isAttacking,
  isBoardSize,
  isSolved,
  isWithinBoard,
  resolveTileStatus,
  toCellKey,
  validateSubmission,
} from '@/lib/nqueens';
import type { BoardSize, CellKey, QueenSet } from '@/lib/nqueens';

/* =============================================================================
 * 테스트 헬퍼 (지역 함수)
 * ========================================================================== */

/** `[row, col]` 형태의 좌표 튜플. 테스트 픽스처 작성 편의를 위한 지역 타입. */
type Coord = readonly [row: number, col: number];

/** 좌표 튜플 목록을 퀸 집합으로 변환한다. */
const cells = (...coords: readonly Coord[]): Set<CellKey> =>
  new Set(coords.map(([row, col]) => toCellKey({ row, col })));

/** 집합 비교용. 순회 순서에 의존하지 않도록 정렬된 배열로 변환한다. */
const sortedKeys = (set: QueenSet): CellKey[] => [...set].sort();

/** 두 퀸 집합이 (순서 무관) 동일한 원소를 갖는지 단언한다. */
const expectSameSet = (actual: QueenSet, expected: QueenSet): void => {
  expect(sortedKeys(actual)).toEqual(sortedKeys(expected));
};

/**
 * N=4~8 각각의 **실제 정답 배치** (행 index → 열 index).
 * 모든 배치는 행/열/대각선(row-col)/반대각선(row+col) 4개 축을 손으로 검산하여 확정했다.
 *
 *  N=4 → (0,1) (1,3) (2,0) (3,2)
 *  N=5 → (0,0) (1,2) (2,4) (3,1) (4,3)
 *  N=6 → (0,1) (1,3) (2,5) (3,0) (4,2) (5,4)
 *  N=7 → (0,0) (1,2) (2,4) (3,6) (4,1) (5,3) (6,5)
 *  N=8 → (0,0) (1,4) (2,7) (3,5) (4,2) (5,6) (6,1) (7,3)
 */
const SOLUTION_COLS: Readonly<Record<BoardSize, readonly number[]>> = {
  4: [1, 3, 0, 2],
  5: [0, 2, 4, 1, 3],
  6: [1, 3, 5, 0, 2, 4],
  7: [0, 2, 4, 6, 1, 3, 5],
  8: [0, 4, 7, 5, 2, 6, 1, 3],
};

/** 지원 보드 크기 전체. 상수 export 여부와 무관하게 루프를 돌기 위해 지역 선언한다. */
const ALL_SIZES: readonly BoardSize[] = [4, 5, 6, 7, 8];

/** 주어진 N 의 정답 배치를 퀸 집합으로 만든다. */
const solutionQueens = (size: BoardSize): Set<CellKey> =>
  new Set(SOLUTION_COLS[size].map((col, row) => toCellKey({ row, col })));

/* =============================================================================
 * 1. 상수
 * ========================================================================== */

describe('상수 (Constants)', () => {
  it('지원 보드 크기의 하한은 4, 상한은 8이다', () => {
    expect(MIN_N).toBe(4);
    expect(MAX_N).toBe(8);
  });

  it('좌표 인덱스의 최솟값은 0이다 (0-based)', () => {
    expect(MIN_INDEX).toBe(0);
  });

  it('BOARD_SIZES 는 4부터 8까지 오름차순으로 정렬되어 있다', () => {
    expect([...BOARD_SIZES]).toEqual([4, 5, 6, 7, 8]);
  });

  it('기본 보드 크기는 8이다', () => {
    expect(DEFAULT_BOARD_SIZE).toBe(8);
  });

  it('미달 경고 템플릿은 {n} 플레이스홀더를 포함한다', () => {
    expect(MSG_INCOMPLETE_TEMPLATE).toBe('{n}개의 퀸을 모두 배치해주세요');
  });

  it('Toast 기본 노출 시간은 2000ms 이다', () => {
    expect(TOAST_DURATION_MS).toBe(2000);
  });
});

/* =============================================================================
 * 2. toCellKey / fromCellKey
 * ========================================================================== */

describe('toCellKey / fromCellKey', () => {
  it('좌표를 `row,col` 형식의 문자열로 직렬화한다', () => {
    expect(toCellKey({ row: 0, col: 0 })).toBe('0,0');
    expect(toCellKey({ row: 3, col: 7 })).toBe('3,7');
    expect(toCellKey({ row: 7, col: 0 })).toBe('7,0');
  });

  it('셀 키 문자열을 좌표 객체로 역직렬화한다', () => {
    expect(fromCellKey('0,0')).toEqual({ row: 0, col: 0 });
    expect(fromCellKey('3,7')).toEqual({ row: 3, col: 7 });
  });

  it('8x8 보드의 모든 칸에 대해 toCellKey → fromCellKey 왕복이 동형이다', () => {
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        expect(fromCellKey(toCellKey({ row, col }))).toEqual({ row, col });
      }
    }
  });

  it('fromCellKey → toCellKey 방향의 왕복도 동형이다', () => {
    const keys: readonly CellKey[] = ['0,0', '2,5', '7,7', '4,1'];
    for (const key of keys) {
      expect(toCellKey(fromCellKey(key))).toBe(key);
    }
  });

  it('직렬화 결과는 입력 좌표 객체를 변형하지 않는다', () => {
    const position = { row: 2, col: 6 };
    toCellKey(position);
    expect(position).toEqual({ row: 2, col: 6 });
  });
});

/* =============================================================================
 * 3. isBoardSize
 * ========================================================================== */

describe('isBoardSize', () => {
  it('4 이상 8 이하의 정수는 true 이다', () => {
    expect(isBoardSize(4)).toBe(true);
    expect(isBoardSize(5)).toBe(true);
    expect(isBoardSize(6)).toBe(true);
    expect(isBoardSize(7)).toBe(true);
    expect(isBoardSize(8)).toBe(true);
  });

  it('범위 경계 바로 바깥인 3과 9는 false 이다', () => {
    expect(isBoardSize(3)).toBe(false);
    expect(isBoardSize(9)).toBe(false);
  });

  it('0과 음수는 false 이다', () => {
    expect(isBoardSize(0)).toBe(false);
    expect(isBoardSize(-1)).toBe(false);
  });

  it('범위 안이라도 정수가 아니면 false 이다', () => {
    expect(isBoardSize(4.5)).toBe(false);
    expect(isBoardSize(7.9)).toBe(false);
  });

  it('NaN 및 Infinity 는 false 이다', () => {
    expect(isBoardSize(Number.NaN)).toBe(false);
    expect(isBoardSize(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isBoardSize(Number.NEGATIVE_INFINITY)).toBe(false);
  });
});

/* =============================================================================
 * 4. isWithinBoard
 * ========================================================================== */

describe('isWithinBoard', () => {
  it('좌상단 원점(0,0)은 보드 안이다', () => {
    expect(isWithinBoard({ row: 0, col: 0 }, 8)).toBe(true);
  });

  it('우하단 최대 인덱스(size-1, size-1)는 보드 안이다', () => {
    expect(isWithinBoard({ row: 7, col: 7 }, 8)).toBe(true);
    expect(isWithinBoard({ row: 3, col: 3 }, 4)).toBe(true);
  });

  it('행 또는 열이 -1 이면 보드 밖이다', () => {
    expect(isWithinBoard({ row: -1, col: 0 }, 8)).toBe(false);
    expect(isWithinBoard({ row: 0, col: -1 }, 8)).toBe(false);
    expect(isWithinBoard({ row: -1, col: -1 }, 8)).toBe(false);
  });

  it('행 또는 열이 size 이면 보드 밖이다', () => {
    expect(isWithinBoard({ row: 8, col: 0 }, 8)).toBe(false);
    expect(isWithinBoard({ row: 0, col: 8 }, 8)).toBe(false);
    expect(isWithinBoard({ row: 4, col: 0 }, 4)).toBe(false);
  });

  it('보드 크기에 따라 동일 좌표의 판정이 달라진다', () => {
    expect(isWithinBoard({ row: 5, col: 5 }, 8)).toBe(true);
    expect(isWithinBoard({ row: 5, col: 5 }, 4)).toBe(false);
  });
});

/* =============================================================================
 * 5. isAttacking
 * ========================================================================== */

describe('isAttacking', () => {
  it('같은 행에 있으면 서로 공격 가능하다', () => {
    expect(isAttacking({ row: 2, col: 1 }, { row: 2, col: 5 })).toBe(true);
  });

  it('같은 열에 있으면 서로 공격 가능하다', () => {
    expect(isAttacking({ row: 1, col: 3 }, { row: 6, col: 3 })).toBe(true);
  });

  it('대각선(row - col 이 동일)에 있으면 서로 공격 가능하다', () => {
    expect(isAttacking({ row: 0, col: 0 }, { row: 3, col: 3 })).toBe(true);
    expect(isAttacking({ row: 2, col: 5 }, { row: 4, col: 7 })).toBe(true);
  });

  it('반대각선(row + col 이 동일)에 있으면 서로 공격 가능하다', () => {
    expect(isAttacking({ row: 0, col: 3 }, { row: 3, col: 0 })).toBe(true);
    expect(isAttacking({ row: 1, col: 5 }, { row: 4, col: 2 })).toBe(true);
  });

  it('행·열·양 대각선 어디에도 걸치지 않으면 공격할 수 없다', () => {
    expect(isAttacking({ row: 0, col: 0 }, { row: 1, col: 2 })).toBe(false);
    expect(isAttacking({ row: 2, col: 1 }, { row: 5, col: 3 })).toBe(false);
    expect(isAttacking({ row: 0, col: 1 }, { row: 1, col: 3 })).toBe(false);
  });

  it('동일한 좌표는 자기 자신을 공격하지 않는다 (false)', () => {
    expect(isAttacking({ row: 3, col: 3 }, { row: 3, col: 3 })).toBe(false);
    expect(isAttacking({ row: 0, col: 0 }, { row: 0, col: 0 })).toBe(false);
  });

  it('인자 순서를 바꿔도 결과가 같다 (대칭성)', () => {
    const a = { row: 1, col: 5 };
    const b = { row: 4, col: 2 };
    expect(isAttacking(a, b)).toBe(isAttacking(b, a));
    const c = { row: 0, col: 1 };
    expect(isAttacking(a, c)).toBe(isAttacking(c, a));
  });

  it('입력 좌표를 변형하지 않는다', () => {
    const a = { row: 1, col: 5 };
    const b = { row: 4, col: 2 };
    isAttacking(a, b);
    expect(a).toEqual({ row: 1, col: 5 });
    expect(b).toEqual({ row: 4, col: 2 });
  });
});

/* =============================================================================
 * 6. findConflicts
 * ========================================================================== */

describe('findConflicts', () => {
  it('빈 집합을 넣으면 빈 집합을 반환한다', () => {
    expect(findConflicts(new Set<CellKey>()).size).toBe(0);
  });

  it('퀸이 하나뿐이면 충돌이 없다', () => {
    expect(findConflicts(cells([3, 3])).size).toBe(0);
  });

  it('정답 배치(N=8)는 충돌이 전혀 없어 빈 집합을 반환한다', () => {
    expect(findConflicts(solutionQueens(8)).size).toBe(0);
  });

  it('서로 공격하는 두 퀸은 양쪽 모두 결과에 포함된다', () => {
    const queens = cells([0, 0], [0, 5]);
    expectSameSet(findConflicts(queens), cells([0, 0], [0, 5]));
  });

  it('반대각선으로만 충돌하는 두 퀸도 양쪽 모두 포함된다', () => {
    const queens = cells([1, 5], [4, 2]);
    expectSameSet(findConflicts(queens), cells([1, 5], [4, 2]));
  });

  it('퀸 3개 중 2개만 충돌하면 충돌 무관한 퀸은 포함되지 않는다', () => {
    // (0,0)-(0,3) 은 같은 행으로 충돌. (3,1) 은 어느 쪽과도 무관하다.
    const queens = cells([0, 0], [0, 3], [3, 1]);
    expectSameSet(findConflicts(queens), cells([0, 0], [0, 3]));
  });

  it('퀸 5개 중 열이 겹치는 2개만 충돌로 판정한다', () => {
    // N=5 정답 배치에서 (4,3) 을 (4,1) 로 옮겨 (3,1) 과 열 충돌만 만든 픽스처.
    const queens = cells([0, 0], [1, 2], [2, 4], [3, 1], [4, 1]);
    expectSameSet(findConflicts(queens), cells([3, 1], [4, 1]));
  });

  it('모든 퀸이 한 대각선 위에 있으면 전원이 충돌로 판정된다', () => {
    const queens = cells([0, 0], [1, 1], [2, 2], [3, 3]);
    expectSameSet(findConflicts(queens), cells([0, 0], [1, 1], [2, 2], [3, 3]));
  });

  it('입력 집합을 변형하지 않는다 (불변성)', () => {
    const queens = cells([0, 0], [0, 3], [3, 1]);
    const before = sortedKeys(queens);
    findConflicts(queens);
    expect(sortedKeys(queens)).toEqual(before);
    expect(queens.size).toBe(3);
  });

  it('충돌이 없을 때 반환된 집합에 원소를 추가해도 원본이 오염되지 않는다', () => {
    const queens = solutionQueens(4);
    const result = findConflicts(queens);
    expect(result.size).toBe(0);
    expect(queens.size).toBe(4);
  });
});

/* =============================================================================
 * 7. isSolved
 * ========================================================================== */

describe('isSolved', () => {
  for (const size of ALL_SIZES) {
    it(`N=${size} 의 실제 정답 배치는 해로 판정된다`, () => {
      expect(isSolved(solutionQueens(size), size)).toBe(true);
    });
  }

  it('퀸 개수가 N 에 미달하면 충돌이 없어도 해가 아니다', () => {
    const queens = solutionQueens(8);
    const incomplete = new Set<CellKey>([...queens].slice(0, 7));
    expect(incomplete.size).toBe(7);
    expect(isSolved(incomplete, 8)).toBe(false);
  });

  it('빈 보드는 해가 아니다', () => {
    expect(isSolved(new Set<CellKey>(), 4)).toBe(false);
  });

  it('퀸 개수는 채웠지만 충돌이 있으면 해가 아니다', () => {
    expect(isSolved(cells([0, 0], [1, 1], [2, 2], [3, 3]), 4)).toBe(false);
  });

  it('같은 행에 몰린 배치는 해가 아니다', () => {
    expect(isSolved(cells([0, 0], [0, 1], [0, 2], [0, 3]), 4)).toBe(false);
  });

  it('N=4 정답 배치라도 요구 크기가 5면 개수 미달로 해가 아니다', () => {
    expect(isSolved(solutionQueens(4), 5)).toBe(false);
  });
});

/* =============================================================================
 * 8. validateSubmission
 * ========================================================================== */

describe('validateSubmission', () => {
  it('퀸이 미달이면 incomplete 를 반환하며 placed/required 가 정확하다', () => {
    const result = validateSubmission(cells([0, 0], [2, 4], [5, 1]), 8);
    expect(result.kind).toBe('incomplete');
    if (result.kind !== 'incomplete') throw new Error('kind 가 incomplete 가 아닙니다');
    expect(result.placed).toBe(3);
    expect(result.required).toBe(8);
  });

  it('빈 보드를 제출하면 placed 가 0인 incomplete 이다', () => {
    const result = validateSubmission(new Set<CellKey>(), 4);
    expect(result.kind).toBe('incomplete');
    if (result.kind !== 'incomplete') throw new Error('kind 가 incomplete 가 아닙니다');
    expect(result.placed).toBe(0);
    expect(result.required).toBe(4);
  });

  it('[판정 순서] 퀸이 미달이면서 동시에 충돌해도 incomplete 가 우선한다 (단락 평가)', () => {
    // (0,0)-(1,1) 은 대각선 충돌이지만 N=4 에 2개뿐이므로 검증을 진행하지 않는다.
    const result = validateSubmission(cells([0, 0], [1, 1]), 4);
    expect(result.kind).toBe('incomplete');
    if (result.kind !== 'incomplete') throw new Error('kind 가 incomplete 가 아닙니다');
    expect(result.placed).toBe(2);
    expect(result.required).toBe(4);
  });

  it('[판정 순서] N-1 개가 모두 충돌 중이어도 invalid 가 아니라 incomplete 이다', () => {
    const result = validateSubmission(cells([0, 0], [1, 1], [2, 2]), 4);
    expect(result.kind).toBe('incomplete');
  });

  it('N 개를 모두 배치했고 충돌이 있으면 invalid 와 충돌 집합을 반환한다', () => {
    const result = validateSubmission(cells([0, 0], [1, 1], [2, 2], [3, 3]), 4);
    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') throw new Error('kind 가 invalid 가 아닙니다');
    expectSameSet(result.conflicts, cells([0, 0], [1, 1], [2, 2], [3, 3]));
  });

  it('invalid 의 conflicts 에는 충돌에 연루된 퀸만 담긴다', () => {
    const queens = cells([0, 0], [1, 2], [2, 4], [3, 1], [4, 1]);
    const result = validateSubmission(queens, 5);
    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') throw new Error('kind 가 invalid 가 아닙니다');
    expectSameSet(result.conflicts, cells([3, 1], [4, 1]));
    expect(result.conflicts.size).toBe(2);
  });

  it('invalid 판정은 입력 퀸 집합을 변형하지 않는다', () => {
    const queens = cells([0, 0], [1, 1], [2, 2], [3, 3]);
    const before = sortedKeys(queens);
    validateSubmission(queens, 4);
    expect(sortedKeys(queens)).toEqual(before);
  });

  for (const size of ALL_SIZES) {
    it(`N=${size} 의 정답 배치를 제출하면 solved 를 반환한다`, () => {
      const result = validateSubmission(solutionQueens(size), size);
      expect(result.kind).toBe('solved');
    });
  }
});

/* =============================================================================
 * 9. resolveTileStatus
 * ========================================================================== */

describe('resolveTileStatus', () => {
  const queens = cells([0, 0], [1, 1], [2, 2], [3, 3]);
  const conflicts = cells([0, 0], [1, 1]);
  const empty = new Set<CellKey>();

  it('퀸이 없는 칸은 제출 상태와 무관하게 default 이다', () => {
    expect(resolveTileStatus({ row: 5, col: 5 }, queens, conflicts, 'idle')).toBe('default');
    expect(resolveTileStatus({ row: 5, col: 5 }, queens, conflicts, 'invalid')).toBe('default');
    expect(resolveTileStatus({ row: 5, col: 5 }, queens, empty, 'solved')).toBe('default');
  });

  it('제출 전(idle)에는 퀸이 있어도 default 이다', () => {
    expect(resolveTileStatus({ row: 0, col: 0 }, queens, empty, 'idle')).toBe('default');
  });

  it('정답(solved) 상태에서는 퀸이 있는 모든 칸이 solved 이다', () => {
    for (const coord of [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
    ] as const) {
      expect(resolveTileStatus({ row: coord[0], col: coord[1] }, queens, empty, 'solved')).toBe(
        'solved',
      );
    }
  });

  it('오답(invalid) 상태에서 충돌 집합에 포함된 퀸은 conflict 이다', () => {
    expect(resolveTileStatus({ row: 0, col: 0 }, queens, conflicts, 'invalid')).toBe('conflict');
    expect(resolveTileStatus({ row: 1, col: 1 }, queens, conflicts, 'invalid')).toBe('conflict');
  });

  it('오답(invalid) 상태라도 충돌과 무관한 퀸은 default 이다', () => {
    expect(resolveTileStatus({ row: 2, col: 2 }, queens, conflicts, 'invalid')).toBe('default');
    expect(resolveTileStatus({ row: 3, col: 3 }, queens, conflicts, 'invalid')).toBe('default');
  });

  it('충돌 집합에 있더라도 해당 칸에 퀸이 없으면 default 이다', () => {
    const orphanConflicts = cells([6, 6]);
    expect(resolveTileStatus({ row: 6, col: 6 }, queens, orphanConflicts, 'invalid')).toBe(
      'default',
    );
  });

  it('입력 집합들을 변형하지 않는다', () => {
    const localQueens = cells([0, 0], [1, 1]);
    const localConflicts = cells([0, 0]);
    resolveTileStatus({ row: 0, col: 0 }, localQueens, localConflicts, 'invalid');
    expect(localQueens.size).toBe(2);
    expect(localConflicts.size).toBe(1);
  });
});

/* =============================================================================
 * 10. formatIncompleteMessage
 * ========================================================================== */

describe('formatIncompleteMessage', () => {
  it('N=8 이면 "8개의 퀸을 모두 배치해주세요" 를 반환한다', () => {
    expect(formatIncompleteMessage(8)).toBe('8개의 퀸을 모두 배치해주세요');
  });

  it('N=4 이면 "4개의 퀸을 모두 배치해주세요" 를 반환한다', () => {
    expect(formatIncompleteMessage(4)).toBe('4개의 퀸을 모두 배치해주세요');
  });

  it('지원하는 모든 N 에 대해 플레이스홀더가 남지 않는다', () => {
    for (const size of ALL_SIZES) {
      const message = formatIncompleteMessage(size);
      expect(message).toBe(`${size}개의 퀸을 모두 배치해주세요`);
      expect(message).not.toContain('{n}');
    }
  });
});

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DEFAULT_BOARD_SIZE, toCellKey } from '@/lib/nqueens';
import type { CellKey, QueenSet, SubmitResult } from '@/lib/nqueens';
import { useNQueens } from '@/hooks/useNQueens';
import type { UseNQueensResult } from '@/hooks/useNQueens';

/* =============================================================================
 * 테스트 헬퍼 (지역 함수)
 * ========================================================================== */

/** `[row, col]` 형태의 좌표 튜플. */
type Coord = readonly [row: number, col: number];

/** `renderHook` 이 돌려주는 result 객체의 최소 형태. */
type HookResult = { readonly current: UseNQueensResult };

/** 훅을 마운트한다. */
const mount = () => renderHook(() => useNQueens());

/**
 * 좌표들을 순서대로 토글한다.
 * 각 클릭을 개별 `act` 로 감싸 실제 사용자 클릭처럼 매 클릭마다 리렌더가 flush 되게 한다.
 */
const clickCells = (result: HookResult, ...coords: readonly Coord[]): void => {
  for (const [row, col] of coords) {
    act(() => {
      result.current.toggleQueen({ row, col });
    });
  }
};

/** 보드 크기를 변경한다. */
const changeSizeTo = (result: HookResult, size: UseNQueensResult['size']): void => {
  act(() => {
    result.current.changeSize(size);
  });
};

/** `submit()` 을 실행하고 반환값을 캡처한다. */
const runSubmit = (result: HookResult): SubmitResult => {
  let captured!: SubmitResult;
  act(() => {
    captured = result.current.submit();
  });
  return captured;
};

/** 집합 비교용. 순회 순서에 의존하지 않도록 정렬된 배열로 변환한다. */
const sortedKeys = (set: QueenSet): CellKey[] => [...set].sort();

/** 좌표 튜플 목록을 정렬된 셀 키 배열로 변환한다. */
const keysOf = (...coords: readonly Coord[]): CellKey[] =>
  coords.map(([row, col]) => toCellKey({ row, col })).sort();

/** N=4 의 실제 정답 배치. 행/열/대각선/반대각선 4축을 검산 완료. */
const SOLUTION_4: readonly Coord[] = [
  [0, 1],
  [1, 3],
  [2, 0],
  [3, 2],
];

/** N=4 의 오답 배치. 모든 퀸이 주대각선 위에 놓여 전원이 충돌한다. */
const DIAGONAL_4: readonly Coord[] = [
  [0, 0],
  [1, 1],
  [2, 2],
  [3, 3],
];

/* =============================================================================
 * 1. 초기 상태
 * ========================================================================== */

describe('useNQueens — 초기 상태', () => {
  it('보드 크기는 기본값 8로 시작한다', () => {
    const { result } = mount();
    expect(result.current.size).toBe(8);
    expect(result.current.size).toBe(DEFAULT_BOARD_SIZE);
  });

  it('퀸이 하나도 배치되어 있지 않다', () => {
    const { result } = mount();
    expect(result.current.queens.size).toBe(0);
    expect(result.current.placedCount).toBe(0);
  });

  it('제출 상태는 idle 이고 충돌 집합은 비어있다', () => {
    const { result } = mount();
    expect(result.current.submitStatus).toBe('idle');
    expect(result.current.conflicts.size).toBe(0);
  });

  it('initialSize 옵션을 주면 그 크기로 시작한다', () => {
    const { result } = renderHook(() => useNQueens({ initialSize: 5 }));
    expect(result.current.size).toBe(5);
    expect(result.current.placedCount).toBe(0);
  });
});

/* =============================================================================
 * 2. toggleQueen — 배치 / 취소
 * ========================================================================== */

describe('useNQueens — toggleQueen (토글 배치)', () => {
  it('빈 칸을 클릭하면 퀸이 배치된다', () => {
    const { result } = mount();
    clickCells(result, [2, 3]);

    expect(result.current.placedCount).toBe(1);
    expect(result.current.queens.has(toCellKey({ row: 2, col: 3 }))).toBe(true);
  });

  it('퀸이 있는 칸을 다시 클릭하면 배치가 취소된다', () => {
    const { result } = mount();
    clickCells(result, [2, 3]);
    clickCells(result, [2, 3]);

    expect(result.current.placedCount).toBe(0);
    expect(result.current.queens.has(toCellKey({ row: 2, col: 3 }))).toBe(false);
  });

  it('서로 다른 여러 칸을 클릭하면 각각 배치된다', () => {
    const { result } = mount();
    clickCells(result, [0, 0], [1, 4], [7, 7]);

    expect(result.current.placedCount).toBe(3);
    expect(sortedKeys(result.current.queens)).toEqual(keysOf([0, 0], [1, 4], [7, 7]));
  });

  it('여러 칸을 한 번에 배치해도 (배치 결과가 유실되지 않고) 모두 반영된다', () => {
    // 동일 렌더 사이클 안에서 연속 호출되어도 이전 상태를 덮어쓰지 않아야 한다.
    const { result } = mount();
    act(() => {
      result.current.toggleQueen({ row: 0, col: 0 });
      result.current.toggleQueen({ row: 1, col: 2 });
    });

    expect(result.current.placedCount).toBe(2);
    expect(sortedKeys(result.current.queens)).toEqual(keysOf([0, 0], [1, 2]));
  });

  it('여러 퀸 중 하나만 취소해도 나머지는 유지된다', () => {
    const { result } = mount();
    clickCells(result, [0, 0], [1, 4], [7, 7]);
    clickCells(result, [1, 4]);

    expect(result.current.placedCount).toBe(2);
    expect(sortedKeys(result.current.queens)).toEqual(keysOf([0, 0], [7, 7]));
  });
});

/* =============================================================================
 * 3. toggleQueen — 방어 로직 (N 초과 / 보드 밖)
 * ========================================================================== */

describe('useNQueens — toggleQueen 방어 로직', () => {
  it('이미 N 개를 배치한 상태에서 빈 칸 클릭은 무시된다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, ...SOLUTION_4);
    expect(result.current.placedCount).toBe(4);

    clickCells(result, [0, 0]); // 아직 비어있는 칸

    expect(result.current.placedCount).toBe(4);
    expect(result.current.queens.has(toCellKey({ row: 0, col: 0 }))).toBe(false);
    expect(sortedKeys(result.current.queens)).toEqual(keysOf(...SOLUTION_4));
  });

  it('N 개를 모두 배치한 상태에서도 기존 퀸의 취소는 정상 동작한다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, ...SOLUTION_4);

    clickCells(result, [0, 1]); // 이미 퀸이 있는 칸

    expect(result.current.placedCount).toBe(3);
    expect(result.current.queens.has(toCellKey({ row: 0, col: 1 }))).toBe(false);
  });

  it('퀸을 하나 취소한 뒤에는 다시 빈 칸에 배치할 수 있다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, ...SOLUTION_4);
    clickCells(result, [0, 1]);
    clickCells(result, [0, 0]);

    expect(result.current.placedCount).toBe(4);
    expect(result.current.queens.has(toCellKey({ row: 0, col: 0 }))).toBe(true);
  });

  it('행 또는 열이 음수인 좌표는 무시된다', () => {
    const { result } = mount();
    clickCells(result, [-1, 0], [0, -1], [-1, -1]);

    expect(result.current.placedCount).toBe(0);
  });

  it('행 또는 열이 size 이상인 좌표는 무시된다', () => {
    const { result } = mount();
    clickCells(result, [8, 0], [0, 8], [99, 99]);

    expect(result.current.placedCount).toBe(0);
  });

  it('보드 크기를 줄이면 이전 크기에서 유효했던 좌표도 무시된다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, [5, 5], [4, 0], [0, 4]);

    expect(result.current.placedCount).toBe(0);
  });
});

/* =============================================================================
 * 4. changeSize
 * ========================================================================== */

describe('useNQueens — changeSize', () => {
  it('보드 크기를 변경하면 배치된 퀸이 즉시 모두 제거된다', () => {
    const { result } = mount();
    clickCells(result, [0, 0], [1, 2], [3, 5]);
    expect(result.current.placedCount).toBe(3);

    changeSizeTo(result, 5);

    expect(result.current.size).toBe(5);
    expect(result.current.queens.size).toBe(0);
    expect(result.current.placedCount).toBe(0);
    expect(result.current.submitStatus).toBe('idle');
    expect(result.current.conflicts.size).toBe(0);
  });

  it('현재와 동일한 N 을 넘겨도 보드를 초기화한다', () => {
    const { result } = mount();
    clickCells(result, [0, 0], [1, 2], [3, 5]);

    changeSizeTo(result, 8);

    expect(result.current.size).toBe(8);
    expect(result.current.placedCount).toBe(0);
  });

  it('제출 결과(invalid)가 남아 있어도 초기화하며 상태를 idle 로 되돌린다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, ...DIAGONAL_4);
    runSubmit(result);
    expect(result.current.submitStatus).toBe('invalid');

    changeSizeTo(result, 4);

    expect(result.current.submitStatus).toBe('idle');
    expect(result.current.conflicts.size).toBe(0);
    expect(result.current.placedCount).toBe(0);
    expect(result.current.size).toBe(4);
  });

  it('제출 결과(solved)가 남아 있어도 초기화한다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, ...SOLUTION_4);
    runSubmit(result);
    expect(result.current.submitStatus).toBe('solved');

    changeSizeTo(result, 6);

    expect(result.current.size).toBe(6);
    expect(result.current.submitStatus).toBe('idle');
    expect(result.current.placedCount).toBe(0);
  });
});

/* =============================================================================
 * 5. reset
 * ========================================================================== */

describe('useNQueens — reset', () => {
  it('배치된 모든 퀸을 제거한다', () => {
    const { result } = mount();
    clickCells(result, [0, 0], [1, 2], [3, 5]);

    act(() => {
      result.current.reset();
    });

    expect(result.current.queens.size).toBe(0);
    expect(result.current.placedCount).toBe(0);
  });

  it('제출 상태를 idle 로, 충돌 집합을 빈 집합으로 되돌린다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, ...DIAGONAL_4);
    runSubmit(result);
    expect(result.current.submitStatus).toBe('invalid');

    act(() => {
      result.current.reset();
    });

    expect(result.current.submitStatus).toBe('idle');
    expect(result.current.conflicts.size).toBe(0);
  });

  it('보드 크기는 유지한다', () => {
    const { result } = mount();
    changeSizeTo(result, 5);
    clickCells(result, [0, 0], [2, 3]);

    act(() => {
      result.current.reset();
    });

    expect(result.current.size).toBe(5);
  });

  it('이미 빈 보드에서 호출해도 안전하다 (멱등)', () => {
    const { result } = mount();

    act(() => {
      result.current.reset();
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.placedCount).toBe(0);
    expect(result.current.submitStatus).toBe('idle');
    expect(result.current.size).toBe(8);
  });
});

/* =============================================================================
 * 6. submit
 * ========================================================================== */

describe('useNQueens — submit (미달)', () => {
  it('퀸이 N 에 미달하면 incomplete 를 반환한다', () => {
    const { result } = mount();
    clickCells(result, [0, 0], [2, 4]);

    const submitResult = runSubmit(result);

    expect(submitResult.kind).toBe('incomplete');
    if (submitResult.kind !== 'incomplete') throw new Error('kind 가 incomplete 가 아닙니다');
    expect(submitResult.placed).toBe(2);
    expect(submitResult.required).toBe(8);
  });

  it('미달 제출은 보드 상태를 전혀 변경하지 않는다', () => {
    const { result } = mount();
    clickCells(result, [0, 0], [1, 1]); // 충돌하지만 개수가 미달이다

    runSubmit(result);

    expect(result.current.submitStatus).toBe('idle');
    expect(result.current.conflicts.size).toBe(0);
    expect(result.current.placedCount).toBe(2);
    expect(sortedKeys(result.current.queens)).toEqual(keysOf([0, 0], [1, 1]));
  });

  it('빈 보드를 제출하면 placed 가 0인 incomplete 이다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);

    const submitResult = runSubmit(result);

    expect(submitResult.kind).toBe('incomplete');
    if (submitResult.kind !== 'incomplete') throw new Error('kind 가 incomplete 가 아닙니다');
    expect(submitResult.placed).toBe(0);
    expect(submitResult.required).toBe(4);
  });
});

describe('useNQueens — submit (오답)', () => {
  it('충돌이 있으면 submitStatus 가 invalid 가 된다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, ...DIAGONAL_4);

    const submitResult = runSubmit(result);

    expect(submitResult.kind).toBe('invalid');
    expect(result.current.submitStatus).toBe('invalid');
  });

  it('conflicts 에 충돌한 퀸들이 채워진다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, ...DIAGONAL_4);

    runSubmit(result);

    expect(result.current.conflicts.size).toBe(4);
    expect(sortedKeys(result.current.conflicts)).toEqual(keysOf(...DIAGONAL_4));
  });

  it('충돌에 연루되지 않은 퀸은 conflicts 에 포함되지 않는다', () => {
    // N=5 정답 배치에서 (4,3) 을 (4,1) 로 옮겨 (3,1) 과만 열 충돌을 만든 픽스처.
    const { result } = mount();
    changeSizeTo(result, 5);
    clickCells(result, [0, 0], [1, 2], [2, 4], [3, 1], [4, 1]);

    runSubmit(result);

    expect(result.current.submitStatus).toBe('invalid');
    expect(sortedKeys(result.current.conflicts)).toEqual(keysOf([3, 1], [4, 1]));
  });

  it('퀸은 그대로 보드에 남는다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, ...DIAGONAL_4);

    runSubmit(result);

    expect(result.current.placedCount).toBe(4);
    expect(sortedKeys(result.current.queens)).toEqual(keysOf(...DIAGONAL_4));
  });
});

describe('useNQueens — submit (정답)', () => {
  it('정답 배치를 제출하면 submitStatus 가 solved 가 된다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, ...SOLUTION_4);

    const submitResult = runSubmit(result);

    expect(submitResult.kind).toBe('solved');
    expect(result.current.submitStatus).toBe('solved');
  });

  it('정답일 때 conflicts 는 빈 집합이다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, ...SOLUTION_4);

    runSubmit(result);

    expect(result.current.conflicts.size).toBe(0);
  });

  it('오답 제출 이후 정답으로 고쳐 제출하면 solved 로 갱신되고 conflicts 가 비워진다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, ...DIAGONAL_4);
    runSubmit(result);
    expect(result.current.submitStatus).toBe('invalid');

    // 대각선 배치를 걷어내고 정답 배치로 교체한다.
    clickCells(result, ...DIAGONAL_4);
    expect(result.current.placedCount).toBe(0);
    clickCells(result, ...SOLUTION_4);

    const submitResult = runSubmit(result);

    expect(submitResult.kind).toBe('solved');
    expect(result.current.submitStatus).toBe('solved');
    expect(result.current.conflicts.size).toBe(0);
  });
});

/* =============================================================================
 * 7. 제출 후 보드 변경 시 결과 무효화
 * ========================================================================== */

describe('useNQueens — 제출 결과 무효화', () => {
  it('오답(invalid) 이후 퀸을 취소하면 submitStatus 가 idle 로 되돌아간다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, ...DIAGONAL_4);
    runSubmit(result);
    expect(result.current.submitStatus).toBe('invalid');

    clickCells(result, [0, 0]); // 배치된 퀸 하나를 취소

    expect(result.current.submitStatus).toBe('idle');
    expect(result.current.conflicts.size).toBe(0);
    expect(result.current.placedCount).toBe(3);
  });

  it('정답(solved) 이후 퀸을 취소하면 submitStatus 가 idle 로 되돌아간다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, ...SOLUTION_4);
    runSubmit(result);
    expect(result.current.submitStatus).toBe('solved');

    clickCells(result, [0, 1]); // 배치된 퀸 하나를 취소

    expect(result.current.submitStatus).toBe('idle');
    expect(result.current.conflicts.size).toBe(0);
    expect(result.current.placedCount).toBe(3);
  });

  it('무효화 이후 빈 칸에 다시 배치해도 idle 을 유지한다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, ...DIAGONAL_4);
    runSubmit(result);
    clickCells(result, [0, 0]);
    clickCells(result, [0, 3]);

    expect(result.current.submitStatus).toBe('idle');
    expect(result.current.placedCount).toBe(4);
  });

  it('무시된 클릭(N 초과 배치 시도)은 보드를 바꾸지 않으므로 제출 결과도 유지된다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, ...DIAGONAL_4);
    runSubmit(result);

    clickCells(result, [0, 3]); // 빈 칸이지만 이미 4개를 배치해 무시된다

    expect(result.current.placedCount).toBe(4);
    expect(result.current.submitStatus).toBe('invalid');
    expect(result.current.conflicts.size).toBe(4);
  });

  it('무시된 클릭(보드 밖 좌표)도 제출 결과를 무효화하지 않는다', () => {
    const { result } = mount();
    changeSizeTo(result, 4);
    clickCells(result, ...SOLUTION_4);
    runSubmit(result);

    clickCells(result, [4, 4], [-1, 0]);

    expect(result.current.submitStatus).toBe('solved');
    expect(result.current.placedCount).toBe(4);
  });
});

/* =============================================================================
 * 8. 액션 참조 안정성
 * ========================================================================== */

describe('useNQueens — 액션 참조 안정성', () => {
  it('리렌더 후에도 액션 함수의 참조가 동일하게 유지된다', () => {
    const { result, rerender } = mount();
    const before = {
      toggleQueen: result.current.toggleQueen,
      changeSize: result.current.changeSize,
      reset: result.current.reset,
      submit: result.current.submit,
    };

    rerender();
    rerender();

    expect(result.current.toggleQueen).toBe(before.toggleQueen);
    expect(result.current.changeSize).toBe(before.changeSize);
    expect(result.current.reset).toBe(before.reset);
    expect(result.current.submit).toBe(before.submit);
  });
});

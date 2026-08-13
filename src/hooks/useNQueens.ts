'use client';

/**
 * =============================================================================
 * N-Queens — 상태 훅 계층 (State)
 * =============================================================================
 *
 * `.claude/_workspace/03_contracts/nqueens.contract.ts` §5 의 구현체이다.
 * 도메인 순수 함수(`@/lib/nqueens`)를 오케스트레이션하며, View 계층은 알지 못한다.
 *
 * @packageDocumentation
 */

import { useCallback, useRef, useState } from 'react';

import {
  DEFAULT_BOARD_SIZE,
  isWithinBoard,
  toCellKey,
  validateSubmission,
  type BoardSize,
  type CellKey,
  type Position,
  type QueenSet,
  type SubmitResult,
  type SubmitStatus,
} from '@/lib/nqueens';

/**
 * 훅이 노출하는 읽기 전용 상태. 모든 필드는 렌더 시점의 일관된 스냅샷이다.
 */
export interface NQueensState {
  /** 현재 보드 크기 N. */
  readonly size: BoardSize;
  /** 현재 배치된 퀸 집합. 크기는 항상 `size` 이하이다. */
  readonly queens: QueenSet;
  /** 현재 제출 상태. 보드를 변경하는 모든 액션은 이 값을 `'idle'` 로 되돌린다. */
  readonly submitStatus: SubmitStatus;
  /** 마지막 제출에서 산출된 충돌 퀸 집합. `submitStatus !== 'invalid'` 이면 빈 집합. */
  readonly conflicts: QueenSet;
  /** 배치된 퀸의 개수(`queens.size` 와 동일). */
  readonly placedCount: number;
}

/**
 * 훅이 노출하는 액션. 모두 참조 안정성(referential stability)을 유지한다.
 */
export interface NQueensActions {
  /** 좌클릭 토글. 퀸이 있으면 취소, 없으면 배치한다. */
  readonly toggleQueen: (position: Position) => void;
  /** 보드 크기(N)를 변경한다. 동일 N 이어도 보드를 즉시 초기화한다. */
  readonly changeSize: (size: BoardSize) => void;
  /** [초기화] 버튼 동작. `size` 는 유지한 채 배치와 색상을 되돌린다. */
  readonly reset: () => void;
  /** [제출] 버튼 동작. 검증 결과를 상태에 반영하고 그 결과를 반환한다. */
  readonly submit: () => SubmitResult;
}

/** `useNQueens` 훅의 반환 타입. */
export interface UseNQueensResult extends NQueensState, NQueensActions {}

/** `useNQueens` 훅의 선택적 초기화 옵션. */
export interface UseNQueensOptions {
  /** 초기 보드 크기. 생략 시 {@link DEFAULT_BOARD_SIZE}. */
  readonly initialSize?: BoardSize;
}

/**
 * 훅 내부에서 관리하는 원자적 상태 스냅샷.
 * `placedCount` 는 `queens.size` 로 파생되므로 중복 저장하지 않는다(단일 진실 공급원).
 */
interface InternalState {
  readonly size: BoardSize;
  readonly queens: QueenSet;
  readonly submitStatus: SubmitStatus;
  readonly conflicts: QueenSet;
}

/**
 * 빈 퀸 집합의 공유 인스턴스.
 * 불변(`ReadonlySet`)이므로 인스턴스를 재사용해도 안전하며, 참조 동일성이 유지되어
 * 하위 컴포넌트의 메모이제이션이 불필요하게 깨지지 않는다.
 */
const EMPTY_QUEENS: QueenSet = new Set<CellKey>();

/** 지정된 보드 크기로 완전히 초기화된 상태를 만든다. */
function createInitialState(size: BoardSize): InternalState {
  return {
    size,
    queens: EMPTY_QUEENS,
    submitStatus: 'idle',
    conflicts: EMPTY_QUEENS,
  };
}

/**
 * N-Queens 게임의 전체 상태와 액션을 소유하는 커스텀 훅.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 【상태 관리 전략】
 * 상태를 4개의 `useState` 로 쪼개지 않고 **하나의 `InternalState` 객체**로 묶어
 * `useState` 로 보관한다. 이렇게 하면 "토글 시 submitStatus 를 idle 로 되돌린다" 같은
 * 다중 필드 전이가 단일 커밋으로 원자화되어, 렌더 스냅샷의 일관성이 보장된다.
 *
 * 여기에 `stateRef` 를 **동기 미러(synchronous mirror)** 로 둔다.
 *  · `submit()` 은 최신 상태를 읽어 `SubmitResult` 를 **동기 반환**해야 하는데,
 *    `useState` 값은 다음 렌더 전까지 갱신되지 않으므로 ref 스냅샷이 필요하다.
 *  · ref 쓰기는 오직 `commit()`(= 이벤트 핸들러 경로) 안에서만 일어난다.
 *    렌더 단계에서 ref 를 읽거나 쓰지 않으므로 React 의 순수 렌더 규칙을 위반하지 않으며,
 *    `useEffect` 동기화 방식과 달리 같은 tick 안에서 연속 호출해도 절대 stale 하지 않다.
 *  · 모든 액션이 `stateRef.current` 만 참조하므로 `useCallback` 의존성은 `[commit]`
 *    (영구 고정) 뿐이며, 상태가 아무리 바뀌어도 액션의 **참조는 영구히 동일**하다.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @param options 초기화 옵션.
 * @returns {@link UseNQueensResult}
 */
export function useNQueens(options?: UseNQueensOptions): UseNQueensResult {
  const [state, setState] = useState<InternalState>(() =>
    createInitialState(options?.initialSize ?? DEFAULT_BOARD_SIZE),
  );

  const stateRef = useRef<InternalState>(state);

  /** 다음 상태를 ref(동기)와 React 상태(렌더)에 동시에 반영한다. */
  const commit = useCallback((next: InternalState): void => {
    stateRef.current = next;
    setState(next);
  }, []);

  const toggleQueen = useCallback(
    (position: Position): void => {
      const prev = stateRef.current;

      // 보드 범위를 벗어난 좌표는 무시한다.
      if (!isWithinBoard(position, prev.size)) {
        return;
      }

      const key = toCellKey(position);
      const hasQueen = prev.queens.has(key);

      // N 개를 모두 배치한 상태에서 빈 칸을 클릭하면 무시한다(초과 배치 불가).
      // 단, 기존 퀸의 취소(hasQueen === true)는 정상 동작한다.
      if (!hasQueen && prev.queens.size >= prev.size) {
        return;
      }

      const nextQueens = new Set<CellKey>(prev.queens);
      if (hasQueen) {
        nextQueens.delete(key);
      } else {
        nextQueens.add(key);
      }

      // 보드가 실제로 변경되었으므로 지난 제출 결과(색상)를 무효화한다.
      commit({
        size: prev.size,
        queens: nextQueens,
        submitStatus: 'idle',
        conflicts: EMPTY_QUEENS,
      });
    },
    [commit],
  );

  const changeSize = useCallback(
    (size: BoardSize): void => {
      // 현재와 동일한 N 이어도 사용자의 명시적 리셋 의도로 간주하여 초기화한다.
      commit(createInitialState(size));
    },
    [commit],
  );

  const reset = useCallback((): void => {
    // size 는 유지하고 배치/색상만 되돌린다.
    commit(createInitialState(stateRef.current.size));
  }, [commit]);

  const submit = useCallback((): SubmitResult => {
    const prev = stateRef.current;
    const result = validateSubmission(prev.queens, prev.size);

    switch (result.kind) {
      case 'incomplete':
        // 미달 제출은 상태를 변경하지 않는다. 호출부가 Toast 를 띄운다.
        break;
      case 'invalid':
        commit({ ...prev, submitStatus: 'invalid', conflicts: result.conflicts });
        break;
      case 'solved':
        commit({ ...prev, submitStatus: 'solved', conflicts: EMPTY_QUEENS });
        break;
    }

    return result;
  }, [commit]);

  return {
    size: state.size,
    queens: state.queens,
    submitStatus: state.submitStatus,
    conflicts: state.conflicts,
    placedCount: state.queens.size,
    toggleQueen,
    changeSize,
    reset,
    submit,
  };
}

'use client';

import { useCallback, useState } from 'react';
import {
  BOARD_SIZES,
  TOAST_DURATION_MS,
  formatIncompleteMessage,
} from '@/lib/nqueens';
import { useNQueens } from '@/hooks/useNQueens';
import Board from '@/components/board/Board';
import SizeSelector from '@/components/controls/SizeSelector';
import SubmitButton from '@/components/controls/SubmitButton';
import ResetButton from '@/components/controls/ResetButton';
import Toast from '@/components/feedback/Toast';

interface ToastState {
  readonly open: boolean;
  readonly message: string;
  /**
   * Toast 재마운트용 키. 이미 열려 있는 Toast 가 같은 문구로 재발생할 때만 증가한다.
   * 계약 §6 `ToastProps` 는 4개 필드로 고정되어 있으므로 nonce 를 prop 으로 넘기지
   * 않고 React 예약 어트리뷰트인 `key` 로만 소비한다(계약 위반 아님).
   */
  readonly nonce: number;
}

const CLOSED_TOAST: ToastState = { open: false, message: '', nonce: 0 };

/**
 * N-Queens 게임 컨테이너.
 *
 * 이 컴포넌트만 상태를 소유한다(`useNQueens`). 하위 컴포넌트는 전부 props 로만
 * 데이터를 받고 콜백으로 변경을 위임하는 프레젠테이션 컴포넌트다(계약 §6).
 *
 * 레이아웃: 상단 SizeSelector → 중앙 Board → 하단 [제출]/[초기화].
 * Header/Footer 는 `app/layout.tsx` 가 렌더하므로 여기서 다시 만들지 않는다.
 */
export default function NQueensGame() {
  const {
    size,
    queens,
    conflicts,
    submitStatus,
    placedCount,
    toggleQueen,
    changeSize,
    reset,
    submit,
  } = useNQueens();

  const [toast, setToast] = useState<ToastState>(CLOSED_TOAST);

  /**
   * 제출 흐름(요구사항 §2.3).
   * - `'incomplete'` → Toast 경고만 띄우고 검증은 진행하지 않는다(훅도 상태를 바꾸지 않는다).
   * - `'invalid'` / `'solved'` → 훅이 이미 `submitStatus`/`conflicts` 에 반영했으므로
   *   Toast 없이 보드 색상만 바뀐다.
   */
  const handleSubmit = useCallback(() => {
    const result = submit();
    if (result.kind === 'incomplete') {
      setToast((prev) => ({
        open: true,
        message: formatIncompleteMessage(result.required),
        // 이미 열려 있을 때만 키를 바꿔 Toast 를 재마운트한다.
        //  · 닫힘 → 열림   : 키 유지 → 기존 노드가 남아 있어 opacity 0→1 등장
        //                    트랜지션이 정상 재생된다.
        //  · 열림 → 재발생 : 키 변경 → 자동 소멸 타이머가 처음부터 다시 시작한다.
        //                    (이미 보이던 상태에서 opacity 1 로 재마운트되므로
        //                     시각적 점프는 없다.)
        nonce: prev.open ? prev.nonce + 1 : prev.nonce,
      }));
    }
  }, [submit]);

  /**
   * 닫을 때 `message` 는 그대로 둔다 — Toast 의 퇴장 트랜지션이 끝날 때까지
   * 말풍선에 문구가 남아 있어야 글자만 먼저 사라지지 않는다.
   */
  const handleToastClose = useCallback(
    () => setToast((prev) => ({ ...prev, open: false })),
    [],
  );

  /*
   * disabled 정책
   * ─────────────────────────────────────────────────────────────────────────
   * · 제출: `submitStatus === 'solved'` 일 때 비활성화한다(계약 §6 권장).
   *   정답 화면에서 같은 배치를 다시 제출해봐야 결과가 동일해 의미가 없고,
   *   초록색 결과를 사용자가 "다시 눌러야 하나?" 하고 오해하는 것을 막는다.
   *   퀸이 부족한 상태에서는 **비활성화하지 않는다** — 미달 제출 시 Toast 로
   *   "N개의 퀸을 모두 배치해주세요" 를 안내하는 것이 요구사항이므로,
   *   버튼을 막으면 그 피드백 경로 자체가 사라진다.
   * · 초기화: 배치된 퀸이 0개면 비활성화한다(계약 §6 권장). 지울 것이 없으면
   *   아무 일도 일어나지 않아 사용자에게 "고장난 버튼"으로 보인다.
   *   퀸이 0개이면 보드를 변경하는 액션이 매번 상태를 되돌리므로
   *   `submitStatus` 는 항상 `'idle'` 이고, 남아있는 색상도 없다.
   */
  const submitDisabled = submitStatus === 'solved';
  const resetDisabled = placedCount === 0;

  return (
    <div className="flex w-full flex-col items-center gap-6 sm:gap-8">
      {/* 상단: 보드 크기 선택 */}
      <SizeSelector value={size} options={BOARD_SIZES} onChange={changeSize} />

      {/* 중앙: 보드 (toggleQueen / reset 은 계약 §5 가 참조 안정성을 보장한다) */}
      <Board
        size={size}
        queens={queens}
        conflicts={conflicts}
        submitStatus={submitStatus}
        onTileClick={toggleQueen}
      />

      {/* 하단: 제출 / 초기화 — 좁은 화면에서는 줄바꿈된다 */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <SubmitButton onClick={handleSubmit} disabled={submitDisabled} />
        <ResetButton
          onClick={reset}
          disabled={resetDisabled}
          ariaLabel="보드 초기화"
        />
      </div>

      <Toast
        key={toast.nonce}
        open={toast.open}
        message={toast.message}
        durationMs={TOAST_DURATION_MS}
        onClose={handleToastClose}
      />
    </div>
  );
}

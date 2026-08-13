'use client';

/**
 * 화면 하단의 [제출] 버튼.
 */
// 계약 §6 SubmitButtonProps — View 계층 타입이므로 도메인 모듈이 아닌 컴포넌트에
// 코로케이션 (계약 서문의 단방향 의존 규약: Domain 은 View 를 알아서는 안 된다).
export interface SubmitButtonProps {
  /** 클릭 핸들러. 컨테이너가 `submit()` 을 호출하고 결과에 따라 Toast 를 띄운다. */
  readonly onClick: () => void;
  /** 비활성화 여부. 정답(`solved`) 이후 재제출을 막는 용도 등으로 사용한다. */
  readonly disabled: boolean;
}

/**
 * 화면 하단의 [제출] 버튼.
 * 초기화 버튼과 나란히 놓이므로 높이(h-12)를 맞춰 정렬을 유지한다.
 */
export default function SubmitButton({ onClick, disabled }: SubmitButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-12 min-w-28 bg-fg px-8 text-sm font-semibold text-fg-inverted hover:bg-fg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-fg sm:text-base"
      style={{
        borderRadius: 'var(--radius-md)',
        transition:
          'background-color var(--dur-fast) var(--ease-standard), opacity var(--dur-fast) var(--ease-standard)',
      }}
    >
      제출
    </button>
  );
}

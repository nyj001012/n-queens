'use client';

/**
 * [초기화] 버튼.
 * 디자인 제약: **원형 화살표 아이콘이 중앙에 놓인 정사각형 버튼**(요구사항 §2.4).
 */
// 계약 §6 ResetButtonProps — View 계층 타입이므로 도메인 모듈이 아닌 컴포넌트에
// 코로케이션 (계약 서문의 단방향 의존 규약: Domain 은 View 를 알아서는 안 된다).
export interface ResetButtonProps {
  /** 클릭 핸들러. 컨테이너가 `reset()` 을 호출한다. */
  readonly onClick: () => void;
  /** 비활성화 여부. 배치된 퀸이 0개일 때 `true` 로 두는 것을 권장한다. */
  readonly disabled: boolean;
  /** 스크린 리더용 접근성 레이블. 아이콘 전용 버튼이므로 필수이다. */
  readonly ariaLabel: string;
}

/**
 * [초기화] 버튼.
 *
 * 요구사항 §2.4 의 디자인 제약을 그대로 만족한다:
 * **원형 화살표 아이콘이 중앙에 놓인 정사각형 버튼** — `aspect-square` 로 정사각을
 * 보장하고, 아이콘은 인라인 SVG(`currentColor`)로 그린다. 텍스트 라벨이 없으므로
 * `ariaLabel` prop 을 `aria-label` 로 반드시 소비한다.
 */
export default function ResetButton({
  onClick,
  disabled,
  ariaLabel,
}: ResetButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex h-12 aspect-square items-center justify-center border border-border-strong bg-surface text-fg hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface"
      style={{
        borderRadius: 'var(--radius-md)',
        transition:
          'background-color var(--dur-fast) var(--ease-standard), opacity var(--dur-fast) var(--ease-standard)',
      }}
    >
      {/* 원형 화살표(refresh) 아이콘 */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M20 12a8 8 0 1 1-2.343-5.657" />
        <polyline points="20 3 20 9 14 9" />
      </svg>
    </button>
  );
}

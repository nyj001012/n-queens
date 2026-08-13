'use client';

import { useId } from 'react';
import type { ChangeEvent } from 'react';
import type { BoardSize } from '@/lib/nqueens';
import { isBoardSize } from '@/lib/nqueens';

/**
 * 화면 상단의 보드 크기 선택 UI(Select Box 또는 버튼 그룹).
 */
// 계약 §6 SizeSelectorProps — View 계층 타입이므로 도메인 모듈이 아닌 컴포넌트에
// 코로케이션 (계약 서문의 단방향 의존 규약: Domain 은 View 를 알아서는 안 된다).
export interface SizeSelectorProps {
  /** 현재 선택된 보드 크기. */
  readonly value: BoardSize;
  /** 선택 가능한 크기 목록. 기본값은 `BOARD_SIZES`. */
  readonly options: readonly BoardSize[];
  /**
   * 선택 변경 시 호출. **호출 즉시 보드가 초기화됨**을 사용자에게 인지시킬 책임은
   * 상위 컨테이너에 있다(요구사항 §2.1).
   */
  readonly onChange: (size: BoardSize) => void;
}

/**
 * 화면 상단의 보드 크기(N) 선택 UI.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 【Select Box vs 버튼 그룹 — Select Box 를 택한 이유】
 *  1. 의미론: 4~8 중 "정확히 하나"를 고르는 단일 선택 값이다. 네이티브 `<select>`
 *     가 그대로 표현하는 시맨틱이며, 버튼 그룹은 `role="radiogroup"` + roving
 *     tabindex 를 직접 구현해야 같은 접근성에 도달한다.
 *  2. 접근성: 키보드 조작(↑↓/타이핑 점프), 스크린 리더 대응, 모바일 네이티브
 *     피커를 브라우저가 무료로 제공한다.
 *  3. 반응형: 요구사항의 뷰포트 하한(모바일)에서 버튼 5개는 줄바꿈되어 상단
 *     컨트롤 영역 높이가 흔들린다. `<select>` 는 폭이 일정해 레이아웃이 안정적이다.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 크기 변경은 보드를 즉시 초기화하므로(요구사항 §2.1) 보조 문구를
 * `aria-describedby` 로 연결해 시각/비시각 사용자 모두에게 사전 고지한다.
 */
export default function SizeSelector({
  value,
  options,
  onChange,
}: SizeSelectorProps) {
  const selectId = useId();
  const hintId = useId();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = Number(event.target.value);
    // `<select>` 의 값은 string 이므로 타입 가드를 통과시킨 뒤에만 BoardSize 로 승격한다.
    if (isBoardSize(next)) {
      onChange(next);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-fg sm:text-base"
        >
          보드 크기
        </label>

        <div className="relative">
          <select
            id={selectId}
            aria-describedby={hintId}
            value={value}
            onChange={handleChange}
            className="appearance-none border border-border bg-surface py-2 pl-3 pr-9 text-sm font-medium text-fg sm:text-base"
            style={{
              borderRadius: 'var(--radius-md)',
              transition:
                'background-color var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)',
            }}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option} × {option}
              </option>
            ))}
          </select>

          {/* 커스텀 chevron — appearance-none 으로 제거된 네이티브 화살표를 대체한다. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      <p id={hintId} className="text-xs text-fg-muted">
        크기를 변경하면 보드가 즉시 초기화됩니다.
      </p>
    </div>
  );
}

'use client';

import { useEffect } from 'react';

/**
 * 미달 제출 경고용 Toast.
 * 현재 요구사항에서 Toast 가 사용되는 유일한 경로는 `SubmitIncomplete` 이다.
 */
// 계약 §6 ToastProps — View 계층 타입이므로 도메인 모듈이 아닌 컴포넌트에 코로케이션
// (계약 서문의 단방향 의존 규약: Domain 은 View 를 알아서는 안 된다).
export interface ToastProps {
  /** 노출 여부. */
  readonly open: boolean;
  /** 노출할 문구. `formatIncompleteMessage` 의 결과를 주입한다. */
  readonly message: string;
  /** 자동 소멸 시간(ms). 기본값 `TOAST_DURATION_MS`. */
  readonly durationMs: number;
  /** 자동 소멸 또는 사용자 닫기 시 호출. */
  readonly onClose: () => void;
}

/**
 * 미달 제출 경고용 Toast.
 *
 * 마운트 전략
 * - 컴포넌트는 **열림 여부와 무관하게 항상 마운트**되어 있고 `open` 은 스타일만 바꾼다.
 *   덕분에 (1) 라이브 리전이 DOM 에 상주해 스크린 리더가 갱신을 놓치지 않고,
 *   (2) 요소가 이미 존재하므로 `opacity`/`transform` 변경이 곧바로 CSS transition 을
 *   발동시켜 등장/퇴장 애니메이션에 별도의 상태나 rAF 지연이 필요 없다.
 *   (결과적으로 이 컴포넌트는 `useState` 없이 순수 props 만으로 동작한다.)
 *
 * 접근성
 * - 라이브 리전과 시각적 말풍선을 분리했다. 리전은 열릴 때만 문구를 담아야 낭독이
 *   트리거되는 반면, 말풍선은 퇴장 트랜지션 동안 문구를 유지해야 글자가 툭 사라지지
 *   않는다. 말풍선은 `aria-hidden` 이므로 중복 낭독은 발생하지 않는다.
 * - 컨테이너는 `pointer-events-none` 이라 닫힌 동안 아래 요소의 클릭을 막지 않는다.
 *
 * 생명주기
 * - `durationMs` 뒤 자동 소멸. `setTimeout` 은 반드시 cleanup 에서 `clearTimeout` 하여
 *   언마운트/`open` 전환 시 타이머가 새는 일이 없게 한다.
 */
export default function Toast({
  open,
  message,
  durationMs,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [open, durationMs, onClose]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <span role="status" aria-live="polite" className="sr-only">
        {open ? message : ''}
      </span>

      <div
        aria-hidden="true"
        className="max-w-[90vw] border border-border-strong bg-fg px-4 py-3 text-sm font-medium text-fg-inverted shadow-lg sm:text-base"
        style={{
          borderRadius: 'var(--radius-md)',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0)' : 'translateY(0.75rem)',
          transition:
            'opacity var(--dur-base) var(--ease-standard), transform var(--dur-base) var(--ease-standard)',
        }}
      >
        {message}
      </div>
    </div>
  );
}

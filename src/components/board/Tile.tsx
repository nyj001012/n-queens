'use client';

import { memo } from 'react';
import type { Position, TileStatus } from '@/lib/nqueens';

/**
 * 보드의 단일 칸.
 * 색상 전환은 일관된 속도/easing 의 CSS transition 으로 처리한다(요구사항 §3).
 */
// 계약 §6 TileProps — View 계층 타입이므로 도메인 모듈이 아닌 컴포넌트에 코로케이션
// (계약 서문의 단방향 의존 규약: Domain 은 View 를 알아서는 안 된다).
export interface TileProps {
  /** 이 타일의 좌표. */
  readonly position: Position;
  /** 이 칸에 퀸이 있는지 여부. */
  readonly hasQueen: boolean;
  /** 이 칸에 적용할 시각 상태. `resolveTileStatus` 의 결과. */
  readonly status: TileStatus;
  /** 클릭/탭 핸들러. 자신의 좌표를 인자로 넘긴다. */
  readonly onClick: (position: Position) => void;
}

/**
 * 상태별 배경/전경 색상 클래스.
 *
 * 색상 "판정"은 도메인 계층(`resolveTileStatus`)이 이미 끝냈다. 여기서는 넘겨받은
 * {@link TileStatus} 를 클래스에 매핑하기만 한다 — View 에서 충돌/정답 규칙을
 * 재구현하지 않는다(계약 §4).
 *
 * `'default'` 는 체스판 명암(light/dark)이 좌표에 따라 갈리므로 이 맵에 넣지 않고
 * 아래에서 별도로 계산한다.
 */
const STATUS_CLASS: Record<Exclude<TileStatus, 'default'>, string> = {
  conflict: 'bg-conflict text-conflict-fg',
  solved: 'bg-solved text-solved-fg',
};

/** 스크린 리더에 색상 대신 전달할 상태 문구(색상은 비시각 사용자에게 전달되지 않는다). */
const STATUS_LABEL: Record<TileStatus, string> = {
  default: '',
  conflict: ', 충돌',
  solved: ', 정답',
};

/**
 * 보드의 단일 칸.
 *
 * - 배경색/퀸 등장은 모두 공통 모션 토큰(`--dur-*` + `--ease-standard`)으로 트랜지션한다.
 * - `hover` 는 pseudo-element 오버레이로 처리한다. 밝은 칸/어두운 칸 어느 쪽에서도
 *   같은 세기의 반응이 되도록 배경색을 통째로 바꾸지 않고 `--hover` 를 낮은 불투명도로 덮는다.
 * - 퀸 글리프는 항상 DOM 에 존재하고 opacity/scale 만 전환한다. 그래야 배치/취소가
 *   양방향 모두 부드럽게 이어진다(keyframes 불필요).
 */
function TileComponent({ position, hasQueen, status, onClick }: TileProps) {
  const { row, col } = position;

  // 체스판 패턴: (row + col) 의 홀짝으로 밝은 칸/어두운 칸을 교차시킨다.
  const isLightSquare = (row + col) % 2 === 0;

  const surfaceClass =
    status === 'default'
      ? isLightSquare
        ? 'bg-tile-light text-tile-light-fg'
        : 'bg-tile-dark text-tile-dark-fg'
      : STATUS_CLASS[status];

  return (
    <button
      type="button"
      onClick={() => onClick(position)}
      aria-pressed={hasQueen}
      aria-label={`${row + 1}행 ${col + 1}열, ${
        hasQueen ? '퀸 있음' : '퀸 없음'
      }${STATUS_LABEL[status]}`}
      className={[
        'relative flex h-full w-full items-center justify-center',
        // 포커스 링이 이웃 타일에 가리지 않도록 쌓임 순서를 올린다.
        'focus-visible:z-10',
        // 포커스 링을 border-box 안쪽에 그려 Board 의 overflow-hidden 클리핑을 회피한다.
        // (z-index 로는 overflow 클리핑을 탈출할 수 없다.)
        //
        // `!` 가 반드시 필요하다: globals.css 의 `:focus-visible { outline-offset: 2px }`
        // 는 **레이어 밖(unlayered)** 에 선언되어 있고, Tailwind 유틸리티는
        // `@layer utilities` 안에 생성된다. CSS 캐스케이드에서 unlayered 일반 선언은
        // 레이어에 속한 일반 선언을 **명시도와 무관하게** 이긴다. 따라서 important
        // 없이는 이 유틸리티가 무시된다(빌드 산출물 CSS 로 확인함).
        'focus-visible:[outline-offset:-2px]!',
        surfaceClass,
        // hover 오버레이. Tailwind 의 hover 변형은 (hover: hover) 환경에만 적용되므로
        // 터치 기기에서 잔상이 남지 않는다.
        'after:pointer-events-none after:absolute after:inset-0 after:bg-hover after:opacity-0',
        'after:transition-opacity after:duration-[var(--dur-fast)] after:ease-[var(--ease-standard)]',
        'hover:after:opacity-30',
      ].join(' ')}
      style={{
        transition:
          'background-color var(--dur-base) var(--ease-standard), color var(--dur-base) var(--ease-standard)',
      }}
    >
      <span
        aria-hidden="true"
        className="relative z-[1] select-none leading-none"
        style={{
          // 타일 크기는 Board 가 --tile-size 로 내려준다(보드 폭 / N).
          fontSize: 'calc(var(--tile-size, 2.5rem) * 0.66)',
          opacity: hasQueen ? 1 : 0,
          transform: hasQueen ? 'scale(1)' : 'scale(0.4)',
          transition:
            'opacity var(--dur-base) var(--ease-standard), transform var(--dur-base) var(--ease-standard)',
        }}
      >
        ♛
      </span>
    </button>
  );
}

/**
 * N² 개(최대 64개) 타일이 매 클릭마다 전부 리렌더되지 않도록 memo 로 감싼다.
 *
 * 얕은 비교가 유효하려면 `position` 객체와 `onClick` 함수의 참조가 안정적이어야 한다.
 * - `position`: Board 가 size 별로 좌표 행렬을 useMemo 로 캐싱한다.
 * - `onClick`:  컨테이너가 참조 안정적인 핸들러를 내려준다(계약 §5 액션 안정성).
 */
const Tile = memo(TileComponent);
Tile.displayName = 'Tile';

export default Tile;

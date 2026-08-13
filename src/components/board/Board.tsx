'use client';

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type {
  BoardSize,
  Position,
  QueenSet,
  SubmitStatus,
} from '@/lib/nqueens';
import { resolveTileStatus, toCellKey } from '@/lib/nqueens';
import Tile from './Tile';

/**
 * 체스 보드 그리드. `size × size` 개의 `TileProps` 타일을 렌더링한다.
 * 반응형 요구사항(모바일 ~ 2440×1440)에 따라 정사각 비율을 유지해야 한다.
 */
// 계약 §6 BoardProps — View 계층 타입이므로 도메인 모듈이 아닌 컴포넌트에 코로케이션
// (계약 서문의 단방향 의존 규약: Domain 은 View 를 알아서는 안 된다).
export interface BoardProps {
  /** 보드 한 변의 길이 N. */
  readonly size: BoardSize;
  /** 현재 배치된 퀸 집합. */
  readonly queens: QueenSet;
  /** 충돌 퀸 집합. `submitStatus !== 'invalid'` 이면 빈 집합. */
  readonly conflicts: QueenSet;
  /** 현재 제출 상태. 타일 색상 도출에 사용한다. */
  readonly submitStatus: SubmitStatus;
  /** 타일 클릭(또는 탭) 시 호출. 좌표를 그대로 전달한다. */
  readonly onTileClick: (position: Position) => void;
}

/**
 * 체스 보드 그리드.
 *
 * 반응형: 폭을 `--board-size` (= clamp(16rem, min(88vw, 60dvh), 44rem)) 로 잡고
 * `aspect-ratio: 1 / 1` 로 정사각을 강제한다. 모바일부터 2440×1440 까지 별도
 * 미디어 쿼리 없이 화면 중앙에 적정 비율로 유지된다.
 *
 * 타일 크기는 `repeat(N, 1fr)` 그리드가 계산하고, 폰트 크기 파생을 위해
 * `--tile-size = var(--board-size) / N` 를 커스텀 프로퍼티로 자식에게 내려준다.
 */
export default function Board({
  size,
  queens,
  conflicts,
  submitStatus,
  onTileClick,
}: BoardProps) {
  /**
   * 좌표 객체를 size 별로 한 번만 생성한다.
   * 매 렌더마다 `{ row, col }` 을 새로 만들면 `Tile` 의 memo 얕은 비교가 항상
   * 실패해 N² 개 타일이 전부 리렌더된다.
   */
  const positions = useMemo<readonly (readonly Position[])[]>(
    () =>
      Array.from({ length: size }, (_, row) =>
        Array.from({ length: size }, (_, col): Position => ({ row, col })),
      ),
    [size],
  );

  const boardStyle = {
    width: 'var(--board-size)',
    aspectRatio: '1 / 1',
    gridTemplateColumns: `repeat(${size}, 1fr)`,
    gridTemplateRows: `repeat(${size}, 1fr)`,
    '--tile-size': `calc(var(--board-size) / ${size})`,
    borderRadius: 'var(--radius-md)',
  } as CSSProperties;

  return (
    <div
      role="group"
      aria-label={`${size}×${size} 체스 보드`}
      className="mx-auto grid overflow-hidden border border-border-strong"
      style={boardStyle}
    >
      {positions.map((rowPositions) =>
        rowPositions.map((position) => {
          const key = toCellKey(position);
          return (
            <Tile
              key={key}
              position={position}
              hasQueen={queens.has(key)}
              status={resolveTileStatus(
                position,
                queens,
                conflicts,
                submitStatus,
              )}
              onClick={onTileClick}
            />
          );
        }),
      )}
    </div>
  );
}

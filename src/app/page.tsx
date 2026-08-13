import NQueensGame from '@/components/NQueensGame';

/**
 * 홈 화면. 서버 컴포넌트로 유지하고 클라이언트 경계는 `NQueensGame` 에서 시작한다.
 * Header/Footer 및 `<main>` 래퍼는 `app/layout.tsx` 가 담당한다.
 */
export default function Home() {
  return <NQueensGame />;
}

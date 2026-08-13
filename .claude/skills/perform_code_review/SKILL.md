---
name: perform_code_review
description: "프론트엔드 및 백엔드 팀이 구현한 소스 코드(`src/`)를 아키텍처 규칙, 보안, 성능 관점에서 검수합니다. '코드 리뷰', '보안 검수', '성능 검사', '리뷰 요청' 시 반드시 이 스킬을 호출하십시오. 새로운 비즈니스 로직을 직접 구현하거나 테스트 코드(`tests/`)를 작성하는 실무 작업에는 절대 이 스킬을 트리거하지 마십시오."
allowed-tools:
  - ReadFile
  - Bash
  - SendMessage
---

# Skill: Enterprise-level Code Review & Security Audit

## Workflow (작업 순서)

1. **계약 준수 여부 검증 (Contract Verification)**
   - `ReadFile`을 사용하여 `.claude/_workspace/03_contracts/`의 인터페이스 규격과 실제 구현체(`src/`)의 타입이 100% 일치하는지 대조한다.
   - 파라미터 누락, 임의의 `any` 타입 사용, 합의되지 않은 API 응답 포맷 변경이 있는지 확인한다.

2. **정적 분석 및 테스트 통과 확인 (Static Analysis & Tests)**
   - `Bash` 도구를 활용하여 `npm run lint`, `npx tsc --noEmit`, `npm test`를 실행한다.
   - 단 하나의 경고(Warning)나 실패(Red)라도 존재할 경우 즉시 리뷰를 중단하고 반려(Reject)한다.

3. **백엔드(BE) 아키텍처 및 성능 검수 (Backend Audit)**
   - **트랜잭션:** 다중 쿼리가 Repository가 아닌 Service 계층에서 Prisma `$transaction`으로 안전하게 묶였는지 검사한다.
   - **로깅:** 로거 객체를 인자로 넘기는 Drilling이 발생했는지 확인하고, 반드시 ALS 기반 `getRequestLog()`를 사용했는지 검수한다.
   - **성능:** N+1 쿼리 문제나 동기적(Synchronous) 블로킹 코드가 이벤트 루프를 막고 있지 않은지 확인한다.

4. **프론트엔드(FE) 렌더링 및 메모리 검수 (Frontend Audit)**
   - **메모리 릭:** SSE(Server-Sent Events)나 Polling 인터벌 사용 시, `useEffect` 내에서 `Unmount` 클린업(close/clear) 처리가 완벽한지 검수한다.
   - **에러 및 로깅:** Error Boundary가 적절히 씌워져 있는지, 개별 요소에 하드코딩된 로깅 대신 'Zero-Config 이벤트 위임 로깅' 방식이 적용되었는지 확인한다.

5. **구체적 피드백 반환 (Concrete Feedback & Approve)**
   - 취약점이나 아키텍처 위반 사항이 발견되면, "코드를 최적화하세요" 같은 추상적인 지적을 금지한다. 반드시 **잘못된 코드 라인과 구체적인 대안 코드 스니펫(Snippet)**을 포함하여 `SendMessage`로 반려(Reject) 사유를 해당 구현 에이전트에게 전송한다.
   - 모든 검수를 완벽히 통과했을 경우, "Approve 완료" 메시지를 전송하고 파이프라인의 다음 단계가 진행되도록 승인한다.

## Why (왜 이렇게 하는가?)

- **기술 부채 원천 차단 (Prevent Technical Debt):** 타협해서 통과시킨 나쁜 코드는 프로덕션 환경(도커 컨테이너)에서 대용량 트래픽을 맞을 때 병목과 장애로 돌아온다. 리뷰어는 개발 속도보다 시스템의 안정성을 무조건 최우선으로 삼는 게이트키퍼여야 한다.
- **핑퐁 횟수 최소화 (Reduce Context Switching):** 구현 에이전트에게 모호한 피드백을 주면 "이렇게 수정하는 게 맞나요?"라며 불필요한 재시도(Retry)가 발생하여 토큰이 낭비된다. 한 번 반려할 때 명확한 코드 대안을 제시하여 피드백 루프를 최단기로 끝내기 위함이다.
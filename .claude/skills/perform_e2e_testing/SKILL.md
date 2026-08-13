---
name: perform_e2e_testing
description: 프론트엔드와 백엔드 구현이 완료된 후, Playwright를 사용하여 실제 브라우저 환경에서 사용자 시나리오(E2E) 테스트를 작성하고 실행합니다. 'E2E 테스트', '통합 테스트', '브라우저 테스트' 요청 시 반드시 이 스킬을 호출하십시오. 테스트가 깨진다고 해서 애플리케이션 소스 코드(`src/`)를 직접 수정하는 꼼수 작업에는 절대 이 스킬을 트리거하지 마십시오.
allowed-tools:
  - Read
  - Write
  - Bash
  - SendMessage
---

# Skill: Playwright E2E Scenario Testing

## Workflow (작업 순서)

1. **시나리오 및 DoD 분석 (Scenario Review)**
   - `Read`를 사용하여 `.claude/_workspace/02_issues/` 하위의 완료된 이슈 명세서와 기획서(`design.md`)를 분석한다.
   - 🚨 **주의:** 내부 구현 코드(`src/`)를 훔쳐보고 테스트를 맞추려 하지 말고, 오직 '사용자의 시각적 행동(Click, Type, View)' 관점에서만 시나리오를 기획한다.

2. **E2E 테스트 스크립트 작성 (Test Implementation)**
   - `tests/e2e/` 디렉터리에 `[기능명].spec.ts` 형태로 Playwright 테스트 코드를 작성한다.
   - 단순 API 응답 코드가 아니라, DOM 요소의 텍스트, 색상 변경(예: Red/Green 타일), 버튼 상태 등 **UI의 실제 변경(Assertion)**을 깐깐하게 검증하도록 짠다.

3. **프로덕션 환경 빌드 및 실행 (Build & Run)**
   - `Bash` 도구를 사용하여 애플리케이션을 프로덕션 모드로 빌드(`npm run build`)한다.
   - 빌드가 완료되면 Playwright가 프로덕션 서버를 바라보도록 설정(`playwright.config.ts`의 `webServer` 옵션 활용)한 뒤, `npx playwright test`를 실행한다.

4. **결과 판독 및 피드백 (Validation & Routing)**
   - **실패(Red) 시:** 에러가 발생한 지점의 로그와 화면 상황을 캡처하여, `SendMessage`로 프론트엔드/백엔드 개발자에게 원인(예: "제출 버튼 클릭 시 알림이 뜨지 않음")을 통보하고 즉시 작업을 멈춘다. 절대 `src/` 코드를 스스로 고치지 않는다.
   - **성공(Green) 시:** 모든 시나리오가 통과하면 콘솔에 `[E2E TEST PASSED]`를 출력하고, 마스터 오케스트레이터에게 통제권을 넘겨 Phase 4 커밋을 진행하도록 유도한다.

## Why (왜 이렇게 하는가?)

- **진짜 유저 경험(UX) 검증:** 함수 단위의 Unit Test(Phase 3)가 모두 통과했더라도, 실제 브라우저에서는 팝업이 뒤에 숨거나(z-index 버그) API 연동 시 CORS가 터질 수 있다. 이를 릴리즈(MR) 직전에 완벽히 차단하기 위함이다.
- **책임의 분리 (Separation of Concerns):** 테스터가 코드를 직접 고치게 두면 원칙이 무너진다. E2E 테스터는 오직 '발견'만 하고, 수정은 철저하게 Track A의 개발자들(FE/BE)이 책임지도록 강제하기 위함이다.

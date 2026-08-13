---
name: design_frontend_tdd_cases
description: "TypeScript 계약(Contract)을 바탕으로 React UI, DOM 렌더링, 사용자 이벤트에 대한 TDD 기반 블랙박스 테스트 코드를 작성합니다. `src/` 코드를 직접 보거나 백엔드 API 연동 테스트를 짜는 작업에는 절대 이 스킬을 트리거하지 마십시오."
allowed-tools:
  - Read
  - Write
  - Bash
  - SendMessage
---

# Skill: Frontend UI & DOM TDD Case Design

## Workflow (작업 순서)

1. **계약 분석 및 클린 룸 준수 (Contract Review)**
   - `Read` 도구로 `03_contracts/`의 UI Props 및 State 인터페이스를 파악한다. 절대 `src/components/`를 열어보지 않는다.

2. **사용자 관점 시나리오 기획 (User-Centric Planning)**
   - React Testing Library(RTL)와 Vitest 문법을 사용하여 시나리오를 짠다.
   - 내부 State 값이 아니라, 실제 화면에 보이는 **DOM 노드(Role, Text, Placeholder)**를 기준으로 Assertion(`expect`)을 작성한다.

3. **이벤트 및 에러 모킹 (Event & Error Mocking)**
   - `user-event`를 사용하여 실제 사용자의 클릭, 타이핑 흐름을 시뮬레이션한다.
   - MSW(Mock Service Worker)를 사용하여 백엔드 API 500 에러 상황이나 SSE 연결 단절 상황을 모킹하고, 이때 **Error Boundary의 Fallback UI**가 정상 노출되는지 검증한다.

4. **산출물 적재 및 알림 (Notify)**
   - 코드를 `tests/frontend/` 디렉터리에 저장한다.
   - `SendMessage`로 프론트엔드 담당 에이전트(`frontend-developer`)에게 "UI 실패하는(Red) 테스트 준비 완료"를 통보한다.

## Why (왜 이렇게 하는가?)

- **UX 중심의 품질 보장:** 프론트엔드는 함수가 도는지가 중요한 게 아니라 '사용자의 눈에 화면이 제대로 보이고 눌리는가'가 핵심이다. 철저하게 DOM과 사용자 이벤트 관점에서만 테스트를 강제하기 위함이다.

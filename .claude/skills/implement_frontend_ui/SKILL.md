---
name: implement_frontend_ui
description: "프론트엔드 QA가 넘겨준 테스트 코드를 통과시키기 위해 Next.js 16 및 React 19 기반의 UI 컴포넌트와 클라이언트 상태 관리 로직을 구현합니다. 백엔드 API(`src/app/api/`)를 건드리거나 테스트 코드(`tests/`) 자체를 수정하는 꼼수에는 절대 이 스킬을 트리거하지 마십시오."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - SendMessage
---

# Skill: Frontend UI & Real-time State Implementation

## Workflow (작업 순서)

1. **테스트 및 계약 분석 (Test & Contract Review)**
   - `Read`를 사용하여 `tests/frontend/`의 실패하는(Red) 테스트 코드와 `03_contracts/`를 파악한다.
   - 🚨 **주의:** 테스트를 통과시키기 위해 `tests/` 안의 코드를 수정하는 행위는 엄격히 금지된다.

2. **컴포넌트 설계 및 구현 (Component Implementation)**
   - Next.js App Router 환경에 맞춰 서버 컴포넌트와 클라이언트 컴포넌트(`"use client"`)를 명확히 분리하여 `src/components/`와 `src/app/`에 구현한다.

3. **상태 및 메모리 관리 강제 (State & Memory Control)**
   - 대용량 센서 데이터를 위한 SSE(Server-Sent Events) 구현 시, 반드시 `useEffect`의 return 함수(Unmount)에 `EventSource.close()` 등의 **클린업(Cleanup) 로직**을 강제하여 브라우저 메모리 릭을 방지한다.

4. **관측성 및 예외 처리 (Observability & Error Boundary)**
   - 최상위 이벤트 위임(Event Delegation)을 활용한 **'Zero-Config 클릭 로깅'** 방식을 UI에 적용한다.
   - API 통신 실패에 대비해 주요 컴포넌트를 `Error Boundary`와 Suspense로 감싼다.

5. **테스트 통과 및 리뷰 요청 (Green & Peer Review)**
   - `Bash` 도구를 사용하여 `npm run test:fe` 및 `npm run lint`를 실행해 정적 분석과 테스트가 통과(Green)하는지 확인한다.
   - 성공 시 `SendMessage`로 `code-reviewer` 에이전트에게 리뷰를 요청한다.

## Why (왜 이렇게 하는가?)

- **브라우저 뻗음(Freezing) 방지:** 1초에도 수십 번 업데이트되는 센서 데이터를 다룰 때 클린업이 누락되면 즉각적인 메모리 누수가 발생한다. 이를 원천 차단하기 위함이다.
- **TDD 클린 룸 방어:** 개발자가 스펙을 자의적으로 변경하거나 테스트를 무력화하는 것을 막고, 오직 QA가 정의한 DOM과 이벤트 요구사항(DoD)만을 충실히 구현하게 강제하기 위함이다.

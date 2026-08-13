---
name: implement_frontend_ui
description: "Next.js 16 (App Router) 및 React 19 기반의 프론트엔드 UI 컴포넌트, 클라이언트 상태 관리, 실시간 센서 데이터(SSE) 연동 로직을 구현합니다. '프론트엔드 구현', 'UI 컴포넌트 개발', '화면 연동', '클라이언트 개발' 요청 시 반드시 이 스킬을 호출하십시오. 백엔드 API 로직(`src/app/api/`), 인프라 설정, 테스트 코드(`tests/`) 등 다른 계층의 작업에는 절대 이 스킬을 트리거하지 마십시오."
allowed-tools:
  - ReadFile
  - WriteFile
  - EditFile
  - Bash
---

# Skill: Frontend UI & Real-time State Implementation

## Workflow (작업 순서)

1. **계약 및 기획 분석 (Contract & Design Review)**
   - `.claude/_workspace/03_contracts/` 경로의 인터페이스 파일과 `design.md`의 UI 요구사항을 읽어 API 응답 규격과 화면 구성을 파악한다.
   - 🚨 **주의:** 절대 `src/app/api/`나 `src/services/`의 백엔드 구현 코드를 직접 수정하지 않는다.

2. **컴포넌트 설계 및 구현 (Component Implementation)**
   - Next.js App Router 환경에 맞게 서버 컴포넌트(Server Component)와 클라이언트 컴포넌트(`"use client"`)를 명확히 분리하여 구현한다.
   - 컴포넌트는 `src/components/`, 페이지는 `src/app/` 하위에 배치한다.

3. **실시간 상태 연동 및 메모리 관리 (Real-time State & Memory)**
   - 대용량 센서 데이터를 화면에 그리기 위해 SSE(Server-Sent Events) 또는 React Query/SWR을 활용한 커스텀 훅(`src/hooks/`)을 작성한다.
   - 🚨 **주의:** 무거운 전역 상태(Redux/Zustand 등)에 모든 센서 데이터를 밀어 넣는 것을 지양하고, 반드시 Unmount 시 `EventSource.close()` 및 클린업(Cleanup) 처리를 구현하여 브라우저 메모리 누수를 방지한다.

4. **관측성 및 예외 처리 적용 (Observability & Error Boundary)**
   - 버튼 클릭 등 사용자 액션에는 개별적으로 이벤트를 달지 않고, 최상위 이벤트 위임(Event Delegation)을 활용한 **'Zero-Config 클릭 로깅'** 방식을 적용한다.
   - 백엔드 500 에러나 런타임 렌더링 에러가 화면 전체를 백지(White Screen)로 만들지 않도록, 주요 컴포넌트를 `Error Boundary`로 감싸고 우아한 Fallback UI를 제공한다.

5. **정적 분석 및 린트 검증 (Static Checking)**
   - `Bash` 도구를 사용하여 `npm run lint` 및 `npx tsc --noEmit`을 실행해, React 19 문법과 TypeScript 인터페이스 규격에 어긋나는 부분이 없는지 완벽하게 검증한다.

## Why (왜 이렇게 하는가?)

- **브라우저 프리징 방지 (Performance):** 1초에도 수십 번씩 업데이트되는 하드웨어 센서 데이터를 처리할 때, 잘못된 상태 관리나 클린업 누락은 즉각적인 브라우저 메모리 릭(Leak)과 프리징(멈춤) 현상을 유발하기 때문이다.
- **유지보수성 극대화 (Zero-config Logging):** UI 개발자가 디자인을 구현할 때마다 로깅 코드를 수동으로 박아 넣는 행위는 노가다일 뿐만 아니라 휴먼 에러를 유발하므로, 인프라 차원에서 자동화(Zero-config)하여 UI 코드의 순수성을 지키기 위함이다.
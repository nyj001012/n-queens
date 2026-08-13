---
name: implement_nextjs_api
description: "Next.js 16 App Router 및 Prisma 7 기반의 백엔드 API 라우트와 비즈니스 로직(Controller, Service, Repository)을 구현합니다. '백엔드 구현', 'API 개발', 'DB 연동 로직 작성' 요청 시 반드시 이 스킬을 호출하십시오. 프론트엔드 UI를 수정하거나 인프라를 세팅하는 작업, 그리고 QA가 작성한 테스트 코드(`tests/`) 자체를 직접 수정하는 꼼수 작업에는 절대 이 스킬을 트리거하지 마십시오."
allowed-tools:
  - ReadFile
  - WriteFile
  - EditFile
  - Bash
  - SendMessage
---

# Skill: Next.js API & Business Logic Implementation

## Workflow (작업 순서)

1. **계약 및 테스트 명세 확인 (Contract & Test Review)**
   - `ReadFile`을 사용하여 `.claude/_workspace/03_contracts/`의 인터페이스 파일과 QA가 작성한 `tests/`의 실패하는(Red) 테스트 코드를 읽고 목표를 파악한다.
   - 🚨 **주의:** 테스트 코드가 실패한다고 해서 `tests/` 디렉터리의 코드를 임의로 수정하는 행위는 절대 금지된다. 오직 `src/`의 구현 코드로만 해결해야 한다.

2. **3계층 구조 기반 로직 작성 (3-Layer Implementation)**
   - 단일 책임 원칙에 따라 `src/` 하위에 코드를 물리적으로 분리하여 작성한다.
   - **Controller (`route.ts`):** HTTP 요청 파싱 및 공통 에러 래퍼(Error Wrapper) 적용
   - **Service:** 핵심 비즈니스 로직 수행
   - **Repository:** Prisma를 활용한 순수 DB 입출력(CRUD)

3. **트랜잭션 및 비동기 제어 (Transaction & Async Control)**
   - 2개 이상의 테이블에 대한 다중 CUD(Insert/Update/Delete) 작업은 **반드시 Service 계층에서 Prisma의 `$transaction`으로 묶어 처리**한다. Repository 계층에서 트랜잭션을 열지 않는다.
   - 대용량 데이터 I/O 시 Node.js 이벤트 루프 블로킹이 발생하지 않도록 비동기(`async/await`) 처리를 철저히 한다.

4. **ALS 기반 구조화 로깅 적용 (Zero-Drilling Logging)**
   - 로거(Logger) 객체를 함수의 인자(Parameter)로 끝없이 넘기는 행위(Drilling)를 금지한다.
   - 사내 표준인 AsyncLocalStorage(ALS) 기반의 `getRequestLog()`를 호출하여 `reqId`가 자동 바인딩된 JSON 형태의 Pino 로그를 찍는다. (정상 처리는 `INFO`, 예외는 `WARN`/`ERROR`로 레벨 엄격히 구분)

5. **테스트 통과 및 리뷰 요청 (Green & Request Review)**
   - `Bash` 도구를 사용하여 `npm test` 및 `npm run lint`를 실행해 정적 분석과 단위 테스트가 모두 통과(Green)하는지 확인한다.
   - 성공 시 `SendMessage`를 통해 `code-reviewer` 에이전트에게 코드 리뷰를 요청한다.

## Why (왜 이렇게 하는가?)

- **클린 룸 TDD 보장 (Strict TDD):** 테스트 코드를 수정하지 못하게 강제함으로써, 개발자가 스펙을 자의적으로 해석하거나 꼼수를 부리는 것을 막고 QA가 의도한 엣지 케이스를 완벽히 방어하게 만들기 위함이다.
- **유지보수와 성능 극대화 (Maintainability & Performance):** 계층 분리와 ALS 로깅으로 코드 결합도를 낮추고, 단일 스레드(Single Thread)인 Next.js 백엔드에서 대용량 센서 데이터 I/O 병목으로 인해 서버가 뻗는 것을 방지하기 위함이다.
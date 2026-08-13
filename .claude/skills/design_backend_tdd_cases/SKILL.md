---
name: design_backend_tdd_cases
description: "TypeScript 계약(Contract)을 바탕으로 백엔드 API와 비즈니스 로직에 대한 TDD 기반의 블랙박스 테스트 코드를 작성합니다. 프로덕션 소스 코드(`src/`)를 훔쳐보거나 프론트엔드 UI 테스트를 작성하는 작업에는 절대 이 스킬을 트리거하지 마십시오."
allowed-tools:
  - Read
  - Write
  - Bash
  - SendMessage
---

# Skill: Backend Black-box TDD Case Design

## Workflow (작업 순서)

1. **계약 분석 및 클린 룸 준수 (Contract Review)**
   - `Read`를 통해 `03_contracts/` 내의 타겟 인터페이스만 확인한다.
   - 🚨 **주의:** 절대 `src/app/api/`나 `src/services/` 등의 실제 백엔드 구현 코드를 열어보지 않는다.

2. **백엔드 테스트 시나리오 기획 (BE Scenario Planning)**
   - Jest 및 Supertest 기반으로 3가지 카테고리를 기획한다:
     - **Happy Path:** 200 OK 및 정상 DTO 반환
     - **Edge Case:** 빈 배열, 필수 파라미터 누락(400 Bad Request)
     - **Failure Case:** DB 타임아웃, 트랜잭션 롤백 강제 발생 시나리오(500 Internal Server Error)

3. **모킹 적용 및 테스트 코드 작성 (Mocking & Implementation)**
   - 데이터베이스 연동이 필요한 경우 반드시 `Prisma Mock` 등을 적용하여 독립적으로 실행 가능한 단위 테스트를 짠다.
   - 코드를 `tests/backend/` 디렉터리 내에 `[모듈명].test.ts`로 저장한다.

4. **산출물 적재 및 알림 (Notify)**
   - `SendMessage`로 백엔드 담당 에이전트(`backend-developer`)에게 "실패하는(Red) 테스트 준비 완료"를 통보하여 구현을 유도한다.

## Why (왜 이렇게 하는가?)

- **확증 편향 방지:** 구현된 코드를 보고 테스트를 짜면 구멍(Bug)을 잡을 수 없다. 백엔드 QA는 오직 계약서만 보고 가혹한 DB 타임아웃 등의 악의적인 실패 환경을 조성하여 백엔드의 에러 핸들링을 강제하기 위함이다.

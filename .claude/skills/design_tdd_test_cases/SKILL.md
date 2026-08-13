---
name: design_tdd_test_cases
description: "TypeScript 인터페이스(계약)와 GitLab 이슈 요구사항을 바탕으로 TDD 기반의 블랙박스 테스트 코드를 작성합니다. '테스트 작성', 'QA 시나리오 구성', 'TDD 작성' 요청 시 반드시 이 스킬을 호출하십시오. 프로덕션 소스 코드(`src/`)를 훔쳐보거나 직접 비즈니스 로직을 구현하는 작업에는 절대 이 스킬을 트리거하지 마십시오."
allowed-tools:
  - ReadFile
  - WriteFile
  - SendMessage
---

# Skill: Black-box TDD Case Design

## Workflow (작업 순서)

1. **계약 및 요구사항 분석 (Contract & Issue Review)**
   - `ReadFile`을 통해 `.claude/_workspace/03_contracts/` 내의 타겟 인터페이스 파일과 `.claude/_workspace/02_issues/`의 관련 이슈(DoD 포함)를 확인한다.
   - 🚨 **주의:** 절대 `src/` 디렉터리의 실제 구현 코드를 열어보지 않는다. (클린 룸 원칙 준수)

2. **테스트 시나리오 기획 (Scenario Planning)**
   - 확인한 인터페이스 명세(파라미터, 반환 타입)를 바탕으로 다음 3가지 카테고리의 테스트 케이스를 기획한다:
     - **Happy Path:** 정상적인 입력값이 주어졌을 때의 성공 시나리오
     - **Edge Case:** 경계값, 빈 배열, null/undefined 등 예외적인 입력값 시나리오
     - **Failure/Timeout Case:** 네트워크 단절, 데이터베이스 타임아웃, 중복 데이터 삽입 등 악의적인 장애 시나리오

3. **테스트 코드 작성 (Test Implementation)**
   - Jest 또는 Vitest 등 프로젝트 표준 테스트 프레임워크 문법에 맞춰 시나리오를 코드로 번역한다.
   - 외부 의존성(DB, 외부 API)이 있는 경우, 반드시 Mocking(`jest.mock` 등)을 적용하여 독립적으로 실행 가능한 단위 테스트(Unit Test)를 작성한다.

4. **산출물 적재 및 알림 (Save & Notify)**
   - 작성한 테스트 코드를 `tests/` 디렉터리 내에 `[모듈명].test.ts` 파일로 저장한다.
   - 저장이 완료되면 `SendMessage` 도구를 사용하여 백엔드/프론트엔드 담당 에이전트에게 "Red 상태의 테스트 코드가 준비되었음"을 통보하여 구현을 시작하도록 유도한다.

## Why (왜 이렇게 하는가?)

- **클린 룸 방어선 (Prevent Confirmation Bias):** 구현된 코드를 먼저 보고 테스트를 짜면, 개발자의 논리적 오류를 테스트 코드도 똑같이 따라 하는 '확증 편향'에 빠지게 된다. 오직 계약(Contract)만 보고 테스트를 작성해야 진짜 구멍(Bug)을 잡을 수 있다.
- **TDD 사이클 강제 (Red-Green-Refactor):** QA가 먼저 '실패하는(Red)' 테스트를 `tests/` 폴더에 박아두어야, 구현 팀이 꼼수를 부리지 않고 오직 테스트를 통과(Green)시키기 위해 코딩에 집중할 수 있기 때문이다.
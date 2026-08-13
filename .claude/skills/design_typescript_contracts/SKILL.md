---
name: design_typescript_contracts
description: "기획서와 이슈를 바탕으로 프론트엔드, 백엔드, QA 팀이 병렬로 개발할 수 있도록 TypeScript 인터페이스 및 DTO(Contract)를 설계합니다. '인터페이스 설계', 'API 스펙 정의', '타입 선언', '계약 작성' 요청 시 반드시 이 스킬을 호출하십시오. 실제 API 비즈니스 로직 작성, UI 컴포넌트 구현, 테스트 코드 작성 등 코드를 '구현'하는 실무에는 절대 이 스킬을 트리거하지 마십시오."
allowed-tools:
  - ReadFile
  - WriteFile
  - Bash
---

# Skill: TypeScript Interfaces & DTO Contracts Design

## Workflow (작업 순서)

1. **사전 컨텍스트 분석 (Context Analysis)**
   - `ReadFile`을 사용하여 `.claude/_workspace/01_architecture/design.md`와 `.claude/_workspace/02_issues/issue_report.md`를 교차 검토하여 필요한 데이터 구조를 파악한다.

2. **도메인 모델 및 DTO 정의 (Model & DTO Extraction)**
   - API 요청/응답 페이로드 및 데이터베이스 엔티티에 대응하는 DTO(Data Transfer Object) 타입을 엄격하게 정의한다.
   - 🚨 **주의:** `any` 또는 `Record<string, unknown>` 같은 모호한 타입 사용을 엄격히 금지하며, 복잡한 중첩 객체라도 반드시 명확한 인터페이스로 타이핑한다.

3. **3계층 인터페이스 분리 설계 (Layered Interface Design)**
   - 단일 책임 원칙(SRP)에 따라 하나의 거대한 인터페이스를 피하고, 각 계층의 역할을 명확히 분리한다.
   - **Controller:** HTTP 규격에 맞는 파싱 및 응답 타입 (`IUserController`)
   - **Service:** 비즈니스 로직 및 트랜잭션 처리를 위한 함수 시그니처 (`IUserService`)
   - **Repository:** DB 입출력 전용 함수 시그니처 (`IUserRepository`)

4. **문법 및 타입 정합성 검증 (Static Type Checking)**
   - `Bash` 도구를 사용하여 `npx tsc --noEmit` 명령어를 실행해, 작성된 인터페이스 코드에 문법적/타입적 오류가 없는지 완벽하게 검증한다.

5. **계약 산출물 적재 (Save Contracts)**
   - 검증이 완료된 `*.ts` 파일들을 오직 `.claude/_workspace/03_contracts/` 경로 하위에만 저장한다.
   - 🚨 **주의:** 이 단계에서는 오직 `interface`와 `type` 선언만 포함해야 하며, 실제 로직이 담긴 클래스나 함수 본문은 단 한 줄도 작성하지 않는다.

## Why (왜 이렇게 하는가?)

- **클린 룸 병렬 개발 (Clean Room Parallel Development):** 구현(Implementation) 이전에 설계(Contract)를 먼저 확정하여 `03_contracts/`에 박아두면, QA 팀은 실패하는 테스트 코드를 짜고, FE/BE 팀은 로직을 짜는 작업을 **서로의 코드를 기다릴 필요 없이 동시에(병렬로)** 수행할 수 있기 때문이다.
- **파이프라인 결합도 최소화:** 테크 리드가 인터페이스만 책임지고 빠짐으로써, 구현 담당 에이전트들이 "이 함수 이름이 뭐였지?", "리턴 타입이 배열인가 객체인가?"로 인해 불필요한 P2P 통신(Ping-pong) 토큰을 낭비하는 병목을 원천 차단하기 위함이다.
---
name: design_typescript_contracts
description: "기획서와 이슈를 바탕으로 프론트엔드(UI/State), 백엔드(API/Service/Repo), QA 팀이 병렬로 개발할 수 있도록 풀스택 TypeScript 인터페이스 및 DTO를 설계합니다. 실제 비즈니스 로직 작성이나 UI 컴포넌트 구현 실무에는 절대 이 스킬을 트리거하지 마십시오."
allowed-tools:
  - Read
  - Write
  - Bash
  - SendMessage
---

# Skill: Full-stack TypeScript Contracts Design

## Workflow (작업 순서)

1. **사전 컨텍스트 분석 (Context Analysis)**
   - `Read` 도구를 사용하여 `.claude/_workspace/01_architecture/design.md`와 이슈 리포트를 교차 검토한다.

2. **프론트엔드 계약 설계 (FE Contracts)**
   - UI 컴포넌트의 Props, 전역/지역 상태(State) 타입, SSE 실시간 수신 데이터 구조를 명확히 정의한다.

3. **백엔드 계약 설계 (BE Contracts)**
   - 3계층(Controller, Service, Repository) 각각의 함수 시그니처와 데이터베이스 엔티티 DTO를 정의한다.
   - 🚨 **주의:** `any` 또는 `Record<string, unknown>` 같은 모호한 타입 사용을 엄격히 금지한다.

4. **문법 및 타입 정합성 검증 (Static Type Checking)**
   - `Bash` 도구를 사용하여 `npx tsc --noEmit` 명령어를 실행해, 작성된 인터페이스 코드에 오류가 없는지 완벽하게 검증한다.

5. **계약 산출물 적재 (Save Contracts)**
   - 검증이 완료된 `*.ts` 파일들을 오직 `.claude/_workspace/03_contracts/` 경로 하위에만 저장하고 종료한다.

## Why (왜 이렇게 하는가?)

- **클린 룸 병렬 개발 보장:** FE, BE, QA 팀이 서로의 코드를 기다리지 않고 이 계약서(인터페이스) 하나만 바라보고 즉시 병렬 개발(Scale-out)을 시작할 수 있도록 병목을 차단하기 위함이다.

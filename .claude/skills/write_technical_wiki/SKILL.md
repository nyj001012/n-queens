---
name: write_technical_wiki
description: "승인된 아키텍처 기획서, TypeScript 계약(Contract), 그리고 최종 구현 내역을 바탕으로 프로젝트 위키(Wiki) 및 API 명세서를 갱신합니다. '문서화', '위키 작성', 'API 문서 업데이트', 'README 작성' 요청 시 반드시 이 스킬을 호출하십시오. 소스 코드를 수정하거나, 인프라 배포 스크립트를 작성하는 등의 엔지니어링 실무에는 절대 이 스킬을 트리거하지 마십시오."
allowed-tools:
  - Read
  - Write
  - Bash
---

# Skill: Technical Wiki & API Documentation Generation

## Workflow (작업 순서)

1. **최신 컨텍스트 수집 (Context Gathering)**
   - `Read`을 사용하여 `.claude/_workspace/01_architecture/design.md`와 `.claude/_workspace/03_contracts/` 내의 인터페이스 파일들을 읽어들여 시스템의 최신 스펙을 파악한다.

2. **API 및 데이터 명세서 작성 (API Specification)**
   - TypeScript Contract 파일들을 분석하여 프론트엔드 개발자나 외부 클라이언트가 즉시 참고할 수 있는 형태의 **[REST/SSE API 명세서]**를 마크다운으로 작성한다.
   - 🚨 **주의:** 엔드포인트 URL, HTTP 메서드, 요청 파라미터, 응답 DTO, 발생 가능한 에러 코드(4xx, 5xx)를 누락 없이 테이블 형태로 깔끔하게 구조화한다.

3. **아키텍처 및 시스템 가이드 요약 (Architecture Guide)**
   - 초기 기획서(`design.md`)를 바탕으로, 프로젝트에 새로 합류한 개발자가 시스템을 이해할 수 있도록 **[시스템 아키텍처 개요 및 주요 의사결정(ADR)]** 문서를 작성한다.
   - (예: "왜 TimescaleDB를 썼는가?", "어떻게 ALS 기반 로깅을 구축했는가?", "SSE 클린업은 어떻게 동작하는가?" 등의 핵심 맥락을 포함)

4. **산출물 적재 및 파이프라인 종료 (Save & Terminate)**
   - 작성된 마크다운 문서들을 프로젝트 루트의 `docs/wiki/` 디렉터리 하위에 용도별로 나누어 저장한다. (예: `docs/wiki/api_spec.md`, `docs/wiki/architecture.md`)
   - 🚨 **주의:** 문서 저장이 완료되면 터미널에 `[위키 문서화 완료]` 메시지를 출력하고 백그라운드 작업을 우아하게 종료한다.

## Why (왜 이렇게 하는가?)

- **버스 팩터(Bus Factor) 방어:** 핵심 개발자가 퇴사하거나 팀이 교체되더라도, 시스템의 구조와 API 스펙이 AI에 의해 항상 최신화된 문서로 남아있어 프로젝트의 영속성을 보장하기 위함이다.
- **문서화 부채(Documentation Debt) 해결:** 코드는 바뀌었는데 문서는 과거 버전에 머물러 있어 팀원 간 혼선을 빚는 최악의 상황을 막기 위해, 릴리즈·문서화(Phase 5) 단계의 파이프라인에 문서 동기화를 기계적으로 강제하기 위함이다.

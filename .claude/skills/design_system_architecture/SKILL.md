---
name: design_system_architecture
description: "사용자의 요구사항을 분석하여 전체 시스템 아키텍처(FE/BE/DB/Infra)를 기획하고 명세서를 작성합니다. '새로운 프로젝트 기획', '아키텍처 설계', '시스템 구조 설계', 'DB 스키마 구성' 요청 시 반드시 이 스킬을 호출하십시오. 특정 API의 소스 코드 구현이나 인프라 스크립트 작성 등 세부 실무 작업에는 절대 이 스킬을 트리거하지 마십시오."
allowed-tools:
  - Read
  - Write
  - Bash
  - SendMessage
---

# Skill: System Architecture & Data Flow Design

## Workflow (작업 순서)

1. **요구사항 및 현황 분석 (Context Analysis)**
   - 사용자의 프롬프트 요구사항을 분석하고, `Bash` 도구(`tree`, `ls`)를 통해 현재 프로젝트의 루트 디렉터리 구조와 기존 파일들을 파악한다.

2. **기술 스택 및 물리적 분리 설계 (Tech Stack Definition)**
   - 대용량 데이터 처리와 유지보수성을 위해 프론트엔드(Next.js Client Components)와 백엔드(Next.js API Routes / Node.js)의 물리적/논리적 분리 구조를 확정한다.
   - 데이터 특성에 따라 완충 버퍼(MQTT/Kafka)와 시계열 데이터베이스(TimescaleDB) 및 RDBMS의 사용처를 분리하여 정의한다.

3. **데이터베이스 스키마 설계 (DB Schema Design)**
   - 요구사항에 필요한 핵심 도메인 모델을 도출하고, 각 테이블의 PK/FK, 데이터 타입, 인덱싱 전략을 정의한다.

4. **관측성 및 보안 인프라 기획 (Observability & Security)**
   - 폐쇄망 환경을 고려한 시스템 관측성(Grafana/Loki/Alloy) 파이프라인을 설계한다. (프로덕션 환경에서의 `INFO` 로그 드롭 전략 포함)
   - 보안 강화를 위한 Next.js Standalone 난독화 빌드 및 무중단 배포(Systemd 기반) 전략을 명시한다.

5. **산출물 교차 검증 및 적재 (Documentation & P2P Review)**
   - 팀 모드(System Architect 3인)로 동작 중인 경우, `SendMessage`를 통해 작성된 설계안의 취약점을 서로 공격하고 방어하며 핑퐁(Ping-pong) 검증을 수행한다.
   - 검증이 완료된 최종 설계안을 마크다운 포맷으로 구체화하여 `.claude/_workspace/01_architecture/design.md` 경로에 저장한다.

## Why (왜 이렇게 하는가?)

- **병목 사전 차단 (Scalability):** 초당 수만 건의 센서 데이터가 유입되는 환경에서 DB I/O 지연이나 Node.js 이벤트 루프 블로킹이 발생하지 않도록 초기 단계부터 방어적 분산 아키텍처를 강제하기 위함이다.
- **SSOT(Single Source of Truth) 제공:** 설계 공백이나 모호함으로 인해 하위 에이전트(PM, Tech Lead, 개발자)들이 각자 임의의 코드(Hallucination)를 창작하는 것을 막고, 일관된 목표를 제공하기 위함이다.

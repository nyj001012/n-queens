---
name: create_gitlab_issues
description: "아키텍처 기획서를 분석하여 프론트엔드, 백엔드, 인프라 파트의 GitLab 이슈(티켓)를 생성하고 작업 단위를 분할합니다. '이슈 생성', '티켓팅', '작업 분할', '백로그 작성' 요청 시 반드시 이 스킬을 호출하십시오. 소스 코드 구현, 테스트 코드 작성, 아키텍처 구조의 임의 변경 등 실무 개발 작업에는 절대 이 스킬을 트리거하지 마십시오."
allowed-tools:
  - ReadFile
  - WriteFile
  - Bash
---

# Skill: Agile Task Breakdown & GitLab Issue Creation

## Workflow (작업 순서)

1. **설계 문서 분석 (Architecture Analysis)**
   - `ReadFile`을 사용하여 `.claude/_workspace/01_architecture/design.md` 문서를 심도 있게 읽고, 시스템의 전체 기능 명세와 요구사항을 파악한다.

2. **작업 단위 분할 (Task Breakdown)**
   - 파악한 기능들을 프론트엔드(UI/UX), 백엔드(API/DB), 인프라(도커/CI) 파트로 명확하게 분류한다.
   - 🚨 **주의:** 거대한 기능 덩어리(Epic)를 그대로 티켓으로 만들지 말고, 반드시 개발자가 **1~2일 내에 끝낼 수 있는 가장 작고 명확한 단위(Issue)**로 잘게 쪼갠다.

3. **완료 조건 및 의존성 정의 (DoD & Dependencies)**
   - 각 분할된 티켓마다 개발자가 무엇을 해야 작업이 끝나는지 알 수 있도록 명확한 **'완료 조건(Definition of Done, DoD)'**을 마크다운 체크리스트 형태로 작성한다.
   - 선행되어야 할 작업(예: DB 스키마 생성이 API 개발보다 먼저) 등 티켓 간의 **의존성(Dependencies)**을 명시한다.

4. **GitLab 이슈 일괄 생성 (GitLab CLI Execution)**
   - `Bash` 도구를 사용하여 `glab issue create` 명령어를 호출해 실제 GitLab 리포지토리에 이슈를 생성한다.
   - 🚨 **Fallback 처리:** 만약 네트워크 문제나 권한 오류로 `glab` 명령어 실행에 실패할 경우, 3회 재시도 후 임시로 `.claude/_workspace/02_issues/fallback_issues.json`에 데이터를 백업(Save)한다.

5. **이슈 리포트 산출 (Report Generation)**
   - 생성에 성공한 GitLab 이슈 번호(#)와 각 파트별 작업 목록을 정리하여 `.claude/_workspace/02_issues/issue_report.md` 파일로 저장한다.

## Why (왜 이렇게 하는가?)

- **병목 방지 및 속도 측정 (Velocity):** 작업 단위가 크면 코드 리뷰가 길어지고 개발 중 블로킹이 발생한다. 1~2일 단위의 마이크로 태스크로 쪼개어 애자일(Agile) 스프린트의 진행 속도를 정확히 측정하고 병목을 막기 위함이다.
- **명확한 목표(DoD) 제공:** 개발 에이전트나 인간 개발자가 "이 정도면 다 한 건가?"라고 헷갈리거나 스스로 스펙을 부풀리는 것(Scope Creep)을 방지하고, 정확히 DoD만 충족하면 다음 작업으로 넘어가도록 통제하기 위함이다.
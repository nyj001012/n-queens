---
name: create_agile_issues
description: 기획서를 바탕으로 GitHub/GitLab 이슈를 생성하고, 해당 이슈 번호 기반의 작업 브랜치(feature/issue-*)를 생성합니다. '이슈 생성', '티켓팅', '작업 준비' 시 반드시 호출하십시오. 코드 수정에는 절대 사용하지 마십시오.
allowed-tools:
  - Read
  - Write
  - Bash
---

# Skill: Agile Task Breakdown & Feature Branch Creation

## Workflow (작업 순서)

1. **플랫폼 판별 및 기획 분석 (Context Analysis)**
   - `Bash` 도구로 `git remote -v`를 실행해 GitHub/GitLab 환경을 판별한다.
   - `design.md`를 읽고 1~2일 단위의 태스크와 DoD(완료 조건)를 도출한다.

2. **이슈(티켓) 생성 (Issue Creation)**
   - 판별된 환경에 맞춰 `gh issue create` 또는 `glab issue create`를 실행하여 원격 저장소에 이슈를 등록한다.
   - 🚨 **중요:** 명령어 실행 후 터미널에 반환된 **'생성된 이슈 번호(예: #12)'**를 반드시 파악한다.

3. **작업 브랜치 파생 (Branch Checkout)**
   - `Bash` 도구를 사용하여 파악한 이슈 번호를 바탕으로 **`git checkout -b feature/issue-12`** 명령어를 실행한다.
   - `git branch`를 실행하여 현재 브랜치가 `main`이 아닌 `feature/issue-12`로 정확히 이동되었는지 확인한다.

4. **산출물 적재 (Save Report)**
   - 생성된 이슈 목록과 현재 체크아웃된 브랜치명을 `.claude/_workspace/02_issues/issue_report.md`에 저장하고 종료한다.

## Why (왜 이렇게 하는가?)
- **메인 브랜치 오염 방지:** 이슈 PM이 사전에 브랜치를 따두지 않으면, 하위 에이전트들(FE/BE)이 `main` 브랜치에서 코드를 수정하는 대참사가 발생하기 때문이다. 격리된 환경(Clean Room)을 제공하는 것이 PM의 의무다.

---
name: create_merge_request
description: "코드 리뷰어의 승인(Approve)이 완료된 작업물에 대해 GitLab Merge Request(MR)를 생성합니다. 'MR 생성', '병합 요청', '릴리즈 준비' 시 반드시 이 스킬을 호출하십시오. 소스 코드를 직접 수정하거나 테스트를 돌리는 실무 개발 작업에는 절대 이 스킬을 트리거하지 마십시오."
allowed-tools:
  - ReadFile
  - WriteFile
  - Bash
---

# Skill: Automated GitLab Merge Request (MR) Creation

## Workflow (작업 순서)

1. **작업 컨텍스트 및 Diff 분석 (Context Analysis)**
   - `ReadFile`을 사용하여 `.claude/_workspace/02_issues/issue_report.md`를 읽고, 현재 해결하고자 했던 원래의 이슈 번호(#)와 목표를 파악한다.
   - `Bash` 도구를 사용하여 `git diff main` 또는 최근 커밋 내역을 조회해 실제 변경된 코드의 범위를 요약한다.

2. **사내 표준 MR 템플릿 작성 (Template Generation)**
   - 파악한 내용을 바탕으로 다음 항목이 포함된 MR 본문(Description)을 마크다운으로 작성한다:
     - **[작업 요약]:** 무엇을, 왜 변경했는가?
     - **[관련 이슈]:** `Closes #이슈번호` (GitLab 자동 닫힘 트리거 적용)
     - **[변경 사항]:** 프론트엔드/백엔드/인프라 등 주요 변경 파일 요약
     - **[체크리스트]:** 리뷰어 Approve 여부, TDD 통과 여부 체크박스

3. **GitLab CLI를 통한 MR 발행 (Execute GitLab CLI)**
   - `Bash` 도구를 사용하여 `glab mr create --title "[Feature/Fix] 작업명" --description "작성한템플릿" --yes` 명령어를 실행해 원격 저장소에 MR을 꽂아 넣는다.

4. **Fallback 처리 및 리포트 (Fallback & Report)**
   - 🚨 만약 네트워크 단절, 토큰 만료, 권한 문제 등으로 `glab` 명령어 실행에 3회 이상 실패할 경우, 멈추지 말고 작성했던 MR 제목과 본문을 `.claude/_workspace/02_issues/mr_fallback.md` 파일로 로컬에 백업(Save)한다.
   - 최종적으로 생성된 MR의 웹 링크(URL) 또는 백업 파일 경로를 콘솔에 출력하고 백그라운드 작업을 종료한다.

## Why (왜 이렇게 하는가?)

- **이슈 추적성(Traceability) 강제:** MR 본문에 `Closes #이슈번호`를 반드시 박아넣음으로써, PM이 발행했던 티켓과 개발된 코드가 GitLab 상에서 완벽하게 연결(Link)되도록 강제하기 위함이다.
- **개발자 피로도 최소화:** 코딩을 막 끝낸 개발자가 자신이 수정한 수십 개의 파일을 다시 읽고 요약하는 '행정 업무'의 피로도를 없애고, AI가 Diff를 분석해 객관적이고 깔끔한 리포트를 대신 쓰게 만들기 위함이다.
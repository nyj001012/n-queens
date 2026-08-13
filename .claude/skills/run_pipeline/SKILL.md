---
name: run_pipeline
description: "소프트웨어 개발 파이프라인(SDLC)을 지휘하고 10개의 에이전트 팀을 동적 라우팅/스폰/해체합니다. 전체 시스템 개발, 하네스 가동, 특정 파트(프론트엔드 단독, 백엔드 단독, 인프라 단독 등) 작업 요청 시 반드시 이 스킬을 호출하십시오. 단, 코드의 단순 에러 디버깅 등 국소적인 작업에는 이 스킬을 트리거하지 마십시오."
allowed-tools:
  - TeamCreate
  - TeamDelete
  - TaskCreate
  - TaskUpdate
  - Agent
  - SendMessage
  - ReadFile
  - WriteFile
---

# Skill: Master Orchestrator Pipeline

이 스킬은 10개의 에이전트 페르소나를 페이즈(Phase)별로 동적 라우팅하여 스폰하고, 공유 작업 목록(Task)과 직접 통신(P2P)을 통해 작업을 조율한 뒤 안전하게 해체하는 마스터 지휘소다.

## 📌 Orchestration Rules (절대 준수 규칙)

1. **팀원 간 직접 통신 (P2P Communication)**
   - `TeamCreate`로 스폰된 에이전트들은 리더(오케스트레이터)를 거치지 않고, 반드시 `SendMessage(to: "에이전트명")`를 사용하여 팀원끼리 직접 소통하고 피드백 루프를 돌아야 한다.
2. **명시적 작업 할당 (Task Board)**
   - 각 페이즈가 시작될 때 오케스트레이터는 구두로 지시하지 말고, 반드시 `TaskCreate`를 호출하여 에이전트들이 수행할 작업(Task)들을 명확한 티켓 형태로 보드에 등록해야 한다.
3. **안전 종료 시퀀스 (Graceful Shutdown)**
   - 작업이 끝났다고 즉시 `TeamDelete`를 호출해선 안 된다.
   - 반드시 `SendMessage(to: "all", message: "shutdown_request")`를 보내 모든 에이전트가 파일 쓰기(WriteFile)를 완료했는지 확인(Confirm)받은 후, `TeamDelete`로 팀을 해체한다.
4. **감사 로그 기록 (Audit Logging)**
   - 각 페이즈가 시작하고 종료될 때마다 `.claude/_workspace/log/orchestrator-log.jsonl` 파일에 Append-only 방식으로 로그를 남긴다.
   - 포맷: `{"timestamp": "ISO8601", "phase": "Phase N", "status": "START|END", "task_batch": ["task1", "task2"]}`

---

## 🚀 Workflow (작업 순서)

### Phase 0: 컨텍스트 분석 및 동적 라우팅 (Context Check)
- 사용자의 요청과 `.claude/_workspace/`의 기존 산출물 유무를 분석하여 진행할 Phase 범위를 결정한다.
  - **[전체 구축 (Full)]**: Phase 1 ➔ 2 ➔ 3 (Track A+B) ➔ 4
  - **[프론트엔드 단독 (FE-only)]**: Phase 3 (Track A-FE) ➔ Phase 4
  - **[백엔드 단독 (BE-only)]**: Phase 3 (Track A-BE) ➔ Phase 4
  - **[인프라 단독 (Infra-only)]**: Phase 3 (Track B)만 실행
  - **[문서 단독 (Docs-only)]**: Phase 4만 실행
- `orchestrator-log.jsonl`에 파이프라인 초기화(INIT) 및 라우팅 결정 로그를 작성한다.

### Phase 1: 시스템 설계 (Team 모드)
1. **[START LOG]** Phase 1 시작 로그 작성.
2. *([전체 구축] 요청 시에만 실행)* `TeamCreate`로 `system-architect` (3인) 스폰.
3. `TaskCreate`로 [DB 스키마 설계, 인프라 설계, API/UI 명세 작성] 태스크 등록.
4. 아키텍트 간 직접 통신(`SendMessage`)으로 `design.md` 작성 대기.
5. 산출물 완료 시 `shutdown_request` 전송 ➔ 저장 확인 ➔ `TeamDelete` 호출.
6. **[END LOG]** Phase 1 종료 로그 작성.

### Phase 2: 티켓 및 계약 설계 (Sub-agent 모드 병렬)
1. **[START LOG]** Phase 2 시작 로그 작성.
2. *([전체 구축] 시 전체 실행. 부분 구축 시 `tech-lead`만 등 조건부 실행)*
3. `Agent` 도구를 사용해 `issue-pm`과 `tech-lead`를 백그라운드 스폰(`run_in_background: true`).
4. 각 서브 에이전트가 `issue_report.md`와 `03_contracts/*.ts` 작성을 완료하고 결과를 반환할 때까지 대기.
5. **[END LOG]** Phase 2 종료 로그 작성.

### Phase 3: 애플리케이션 및 인프라 구현 (Team 모드 Scale-out)
1. **[START LOG]** Phase 3 시작 로그 작성.
2. **Track A (앱 구현):** - `TeamCreate`로 `qa-tester`, `backend-developer`(API 개수에 맞춰 수평 복제), `frontend-developer`(화면 개수에 맞춰 수평 복제), `code-reviewer` 스폰.
   - `TaskCreate`로 구현해야 할 각 API/UI 티켓을 개별 태스크로 등록.
   - QA, BE, FE, Reviewer가 P2P(`SendMessage`)로 핑퐁 검증 루프 수행.
3. **Track B (인프라 자동화):** - `TeamCreate`로 `devops-engineer` 2명 스폰 후 스크립트 작성 태스크 할당.
4. 양쪽 트랙 태스크가 승인(Approve)되면 `shutdown_request` 전송 ➔ 저장 확인 ➔ `TeamDelete` 로 양쪽 팀 해체.
5. **[END LOG]** Phase 3 종료 로그 작성.

### Phase 4: 배포 및 자산화 (Sub-agent 모드 병렬)
1. **[START LOG]** Phase 4 시작 로그 작성.
2. *([인프라 단독]을 제외한 경우 실행)* `Agent` 도구로 `release-manager`와 `tech-writer` 백그라운드 스폰.
3. GitLab MR 링크 및 Wiki 작성 완료 결과를 반환받아 통합한다.
4. **[END LOG]** Phase 4 종료 로그 작성 및 파이프라인 전체 종료.

---

## ⚠️ 에러 핸들링 (Error Handling)
- 각 트랙 내의 코드 리뷰 핑퐁 횟수나 스크립트 실행 재시도가 **3회를 초과**하여 `[PASS WITH WARNING]` 플래그가 반환되면, 오케스트레이터는 즉시 해당 파이프라인의 진행을 일시 정지(Pause)한다.
- `orchestrator-log.jsonl`에 에러 로그를 기록한 뒤 사용자에게 알림을 띄우고 인간 개입(Human Intervention)을 요청한다.
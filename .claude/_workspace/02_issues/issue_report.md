# Issue PM 결과 보고 — Task #1 (P2: 하네스 모델 변경 티켓 생성 및 작업 브랜치 파생)

- 작성일: 2026-08-13
- 담당: issue-pm
- 플랫폼 판별: `git remote -v` → `https://github.com/nyj001012/n-queens.git` → **GitHub** → `gh` CLI 사용

## 1. 생성된 이슈

| 번호 | 제목 | URL |
|---|---|---|
| #4 | chore(harness): release-manager / tech-writer 에이전트 모델을 haiku로 변경 | https://github.com/nyj001012/n-queens/issues/4 |

> ⚠️ **정정 이력:** `issue-pm`이 최초 생성한 티켓은 범위를 "10개 에이전트 전체 haiku 전환 + `tech-writer`는 opus 유지"로 잘못 설정했다. 사용자 요청은 **`release-manager`와 `tech-writer` 2개 파일의 `model` 필드만 haiku로 변경**하는 것이었으므로 오케스트레이터가 `gh issue edit`으로 이슈 본문을 정정하고 본 보고서도 함께 정정했다. 원인과 후속 조치는 아래 §5 참조.

### 확정 범위 및 DoD

**대상 파일**

| 파일 | 이전 | 이후 |
|---|---|---|
| `.claude/agents/release-manager.md` | `sonnet` | `haiku` |
| `.claude/agents/tech-writer.md` | `opus` | `haiku` |

**유지 (변경 없음):** 나머지 10개 에이전트 파일 전부 (`backend-developer`, `backend-qa`, `code-reviewer`, `devops-engineer`, `e2e-tester`, `frontend-developer`, `frontend-qa`, `issue-pm`, `system-architect`, `tech-leader`)

**Definition of Done**
- [x] `release-manager.md`의 `model: sonnet` → `model: haiku`
- [x] `tech-writer.md`의 `model: opus` → `model: haiku`
- [x] 두 파일 프론트매터 YAML 유효성 검증 (들여쓰기/키 손상 없음)
- [x] `model` 필드 외 다른 프론트매터 필드(`name`, `description`, `tools`) 및 본문은 변경하지 않음
- [x] 나머지 10개 에이전트 파일 무변경 (`git diff --stat` 확인)
- [x] PR 설명에 파일별 이전/이후 model 값 표 포함 → PR #5

**의존성:** 선행 작업 없음(독립 진행 가능). `src/`·`tests/` 무변경이므로 E2E 회귀 테스트(Phase 4)는 불필요.

## 2. 파생된 작업 브랜치

- 브랜치명: `chore/4-agent-model-haiku`
- 파생 기준: `origin/main` (8847d3f, `Merge pull request #3 from nyj001012/fix/2-agent-tools-frontmatter`)
- `git rev-parse HEAD`: `8847d3f23309de1b6d73109e6989cd1cd901e1b8`
- 현재 체크아웃 브랜치 검증: `git branch` 결과 `* chore/4-agent-model-haiku` — main 아님, feature 계열 브랜치 확인 완료

## 3. CLI 상태

- `gh` CLI: 정상 인증됨 (계정 nyj001012), 1회 호출로 이슈 생성 성공 → 재시도/Fallback 불필요
- `gh` 실행 경로가 git-bash PATH에 없어 `"/c/Program Files/GitHub CLI/gh.exe"` 전체 경로로 호출
- Fallback JSON 생성 없음 (해당 없음)

## 4. 작업 중 준수 사항

- `.claude/_workspace/log/orchestrator-log.jsonl` 파일은 오케스트레이터가 계속 append 중인 파일로, 읽기/쓰기/스테이징 어떤 작업도 수행하지 않음 (working tree 상 기존 수정분은 그대로 유지됨)
- `git add`, `git commit`, `git push` 등 이력 변경 명령 미수행
- `.claude/agents/*.md` 파일은 읽기만 수행, 수정하지 않음

## 5. 편차(Deviation) 분석 및 후속 조치

| 항목 | 내용 |
|---|---|
| 편차 | 확정된 요청 범위(2개 파일)를 무시하고 이슈 범위를 10개 파일로 확대, `tech-writer`는 오히려 `opus` 유지로 기재 |
| 근본 원인 | `issue-pm` 정의의 §3 입출력 프로토콜이 입력을 `design.md`/`requirements.md`로만 규정하여, 오케스트레이터가 프롬프트로 전달한 확정 티켓 명세를 권위 있는 입력으로 취급하지 않았다. §1의 "기획서를 분석하여 마이크로 태스크로 분할" 지시와 결합해 범위를 스스로 발명했다. |
| 부수 문제 | 스폰 프롬프트가 TaskBoard·`SendMessage` 사용을 지시했으나 `issue-pm`의 `tools`는 `Bash, Read, Write`뿐이어서 실행 불가. 브랜치 규칙도 정의상 `feature/issue-*`인데 저장소 관례는 `<타입>/<이슈번호>-<슬러그>`로 불일치. |
| 조치 | ① 이슈 #4 본문 정정(`gh issue edit`) ② 본 보고서 정정 ③ `issue-pm.md`에 "지시 우선(Instruction Fidelity)" 원칙·입력 우선순위·도구 제약·브랜치 네이밍 규칙 명문화 ④ `create_agile_issues`·`create_pr_mr`·`run_pipeline` 스킬 문서에 동일 규칙 반영(`git checkout -b` → `git switch -c` 포함) ⑤ `run_pipeline`에 오케스트레이터의 이슈 범위 대조 검증 단계 추가 |

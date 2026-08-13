---
name: setup_infra_cicd
description: "시스템 아키텍처를 바탕으로 Docker 환경 구성, GitLab CI 배포 스크립트 작성, 폐쇄망 관측성(Loki/Grafana) 설치 스크립트를 구축합니다. '도커 설정', 'CI/CD 구축', '배포 파이프라인', '인프라 스크립트 작성' 요청 시 반드시 이 스킬을 호출하십시오. 백엔드 API 작성이나 프론트엔드 UI 화면 구현 등 애플리케이션 코드 수정에는 절대 이 스킬을 트리거하지 마십시오."
allowed-tools:
  - ReadFile
  - WriteFile
  - Bash
  - SendMessage
---

# Skill: Infrastructure, Docker & CI/CD Pipeline Setup

## Workflow (작업 순서)

1. **인프라 명세 분석 (Architecture Review)**
   - `ReadFile`을 사용하여 `.claude/_workspace/01_architecture/design.md`를 읽고, 서버 구성, DB 스펙, 관측성 스택(Loki, Grafana, Alloy)의 요구사항을 파악한다.

2. **Docker 컨테이너 및 볼륨 설계 (Docker Configuration)**
   - `docker-compose.yml` 및 `Dockerfile`을 작성한다.
   - 🚨 **주의:** PostgreSQL 등 대용량 I/O가 발생하는 DB 컨테이너 설정 시, 호스트 경로를 직접 매핑하는 Bind Mount를 절대 사용하지 말고 반드시 도커 네이티브인 **`Named Volume`**으로 설정하여 디스크 병목을 차단한다.

3. **폐쇄망 설치 쉘 스크립트 작성 (Closed-network Scripting)**
   - 인터넷이 단절된 폐쇄망 환경을 가정하여, 패키지(tar/zip) 압축 해제 및 서비스 등록 쉘 스크립트를 `.claude/_workspace/04_infrastructure/` 하위에 작성한다.
   - 🚨 **주의:** PM2 같은 외부 패키지 관리자 대신 반드시 **OS 네이티브(`Systemd`) 서비스 유닛**으로 등록되도록 짠다. 또한 로그 및 설정 파일의 소유권(`chown`)과 접근 권한(`chmod 750` 또는 `640`)을 스크립트 내에 명시적으로 강제한다.

4. **GitLab CI 배포 파이프라인 구축 (GitLab CI/CD)**
   - 프로젝트 루트에 `.gitlab-ci.yml` 파일을 작성한다.
   - `test` 스테이지가 완전히 통과(Green)한 이후에만 `deploy` 스테이지가 실행되도록 의존성(`needs` 또는 `dependencies`)을 엄격히 설정한다.
   - 배포는 SSH/rsync를 활용하여 소스를 전송하고 Systemd를 재시작하는 무중단 배포 흐름으로 구성한다.

5. **문법 검증 및 교차 검토 (Validation & Peer Review)**
   - `Bash` 도구를 사용하여 작성된 스크립트의 문법 오류(`docker-compose config` 등)를 검증한다.
   - 팀 모드로 동작 중일 경우 `SendMessage`를 통해 다른 DevOps 팀원과 스크립트의 보안/성능 결함을 교차 검증한 후 완료한다.

## Why (왜 이렇게 하는가?)

- **DB I/O 성능 극대화:** 초당 수만 건의 센서 데이터가 쏟아지는 환경에서 Bind Mount를 쓰면 호스트 OS의 파일 시스템 레이어를 거치며 극심한 병목이 발생하므로, 도커가 직접 관리하는 Named Volume을 강제하여 성능을 지킨다.
- **보수적인 폐쇄망 보안 준수:** 고객사 서버에 직접 설치되는 솔루션 특성상, 최소 권한 원칙(`chmod 750`)과 가장 안정적인 리눅스 표준 프로세스 관리자(`Systemd`)를 사용하여 보안 팀의 감사(Audit)를 한 번에 통과하기 위함이다.
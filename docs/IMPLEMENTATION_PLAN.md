# MCM Journey Passport 구현 계획

## 1. 계획 원칙

이 계획은 `docs/SYSTEM_DESIGN_V1.md`, `docs/DATABASE_SCHEMA.md`와 `docs/DESIGN_REVIEW.md`의 검토 결과만을 기준으로 한다. 문서에 없는 기능은 추가하지 않는다.

구현은 다음 원칙을 따른다.

- fallback이 동작하는 규칙 기반 Journey를 먼저 완성한 뒤 AI를 연결한다.
- 각 단계가 독립적으로 실행·검증 가능한 상태에서 다음 단계로 넘어간다.
- 프론트, 백엔드와 DB가 함께 사용하는 계약을 먼저 고정한다.
- Journey 상태 변경은 서버가 소유하고, 핵심 쓰기는 transaction으로 처리한다.
- 새로고침 복구와 AI 실패 흐름을 정상 흐름과 같은 우선순위로 테스트한다.
- SQLite는 단일 Node 서버가 소유하고, 프론트는 DB에 직접 접근하지 않는다.

## 2. 권장 구현 순서 요약

1. 설계 의사결정 및 API 계약 확정
2. monorepo와 실행 기반 구성
3. Prisma 스키마, migration과 시드
4. 공통 타입과 기본 조회 API
5. 동의, 예약, QR 체크인
6. 규칙 기반 Journey와 fallback
7. 새로고침 복구 및 상태 전이 검증
8. AI 어댑터와 응답 검증
9. 고객 온라인 화면
10. 매장 Journey 화면
11. 결과, 공유와 직원 화면
12. 캐릭터 레이어와 시연 안정화

## 3. 단계별 계획

### 0단계. 설계 결정과 계약 고정

#### 목표

`DESIGN_REVIEW.md`의 D1~D20 중 구현을 막는 P0 항목을 확정한다. 특히 예약 생성, Journey 생성, AI/fallback 스키마, 상태 전이와 복구 응답을 문서로 고정한다.

#### 생성 또는 수정 파일

- `docs/API_SPEC.md`
- `docs/AI_FLOW.md`
- 필요 시 `docs/USER_FLOW.md`
- 필요 시 `docs/SCREEN_SPEC.md`
- `docs/DESIGN_REVIEW.md`의 의사결정 결과 기록

#### 완료 조건

- 모든 API의 request, response, 오류 코드와 idempotency가 정의되어 있다.
- Reservation, Journey, JourneyStep 상태 전이의 주체가 하나씩 정해져 있다.
- 정상 AI와 fallback이 같은 내부 타입을 사용한다.
- `GET /api/journeys/:id`만으로 새로고침 화면을 결정할 수 있다.
- 고객, 직원과 공개 공유 API의 접근 범위가 정해져 있다.

#### 테스트 항목

- 문서상 정상 흐름을 API 호출 순서로 끝까지 추적한다.
- 예약 질문 누락, QR 재사용, interaction 중복, next 중복, finish 중복을 문서상 처리할 수 있는지 확인한다.
- AI 단계 및 결과 생성이 모두 실패해도 fallback으로 FINISHED까지 갈 수 있는지 확인한다.

#### 수정하지 말아야 할 범위

- 애플리케이션 코드
- `package.json`
- Prisma schema와 migration
- UI 에셋
- 기존 두 설계 문서의 임의 변경

### 1단계. Monorepo 실행 기반 구성

#### 목표

프론트, 백엔드와 공유 타입 패키지가 각각 독립적으로 빌드되고 루트 명령으로 함께 실행되는 최소 monorepo를 만든다.

#### 생성 파일

- 루트 `package.json`
- workspace 설정 파일
- `.gitignore`
- `.env.example`
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/web/vite.config.ts`
- `apps/web/index.html`
- `apps/web/src/main.tsx`
- `apps/server/package.json`
- `apps/server/tsconfig.json`
- `apps/server/src/app.ts`
- `apps/server/src/index.ts`
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts`

#### 완료 조건

- 프론트와 서버가 별도 포트에서 실행된다.
- 서버 health endpoint가 응답한다.
- 프론트에서 서버 health endpoint를 호출할 수 있다.
- 전체 TypeScript 빌드가 성공한다.
- AI 키는 서버 환경에서만 읽는다.

#### 테스트 항목

- workspace 의존성 설치
- web build
- server build
- shared type import
- 개발 CORS 설정
- 프론트 번들에 AI 키가 포함되지 않는지 확인

#### 수정하지 말아야 할 범위

- Prisma 모델과 시드 데이터
- 실제 화면 구현
- AI 호출
- Journey 비즈니스 로직
- 설계에 없는 배포 설정

### 2단계. Prisma 스키마와 시드 데이터

#### 목표

확정된 최소 데이터 모델을 Prisma + SQLite로 구현하고, 고정 시연 데이터를 재현 가능하게 생성한다.

#### 생성 파일

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `prisma/migrations/.../migration.sql`
- 서버의 Prisma Client 초기화 파일
- 시드 검증 테스트 파일

#### 완료 조건

- migration과 Prisma Client 생성이 성공한다.
- 가상 고객 2명과 필요한 경우 직원 1명이 생성된다.
- 매장 1개, 구역 4개와 제품 9~12개가 관계에 맞게 생성된다.
- Inventory, ProductTag, OnlineBehavior, TasteProfile과 TastePreference가 시드된다.
- 동일 seed를 반복 실행해도 의도하지 않은 중복이 생기지 않는다.
- DATABASE_SCHEMA에서 유지하기로 결정한 unique와 index가 반영된다.

#### 테스트 항목

- 존재하지 않는 관계의 Inventory 생성 실패
- 동일 매장·제품 Inventory 중복 실패
- 동일 Reservation의 Journey 중복 실패
- Journey stepNumber 중복 실패
- StepRecommendation 제품·rank 중복 실패
- JourneyResult와 shareToken 중복 실패
- 점수, 수량과 enum 입력에 대한 애플리케이션 검증
- StoreZone의 Store와 Inventory의 Store가 다른 입력 거부

#### 수정하지 말아야 할 범위

- 프론트 화면
- REST controller
- AI 프롬프트와 외부 AI 호출
- QR 카메라 기능
- 문서에 없는 테이블

### 3단계. 공통 계약과 기본 조회 API

#### 목표

프론트와 서버가 동일한 request/response 타입과 enum을 사용하고, 시드 데이터를 읽는 API를 완성한다.

#### 생성 파일

- `packages/shared/src/enums.ts`
- `packages/shared/src/api-types.ts`
- `packages/shared/src/journey-types.ts`
- `packages/shared/src/constants.ts`
- `apps/server/src/schemas/...`
- `apps/server/src/repositories/user-repository.ts`
- `apps/server/src/repositories/store-repository.ts`
- `apps/server/src/repositories/product-repository.ts`
- `apps/server/src/routes/demo-routes.ts`
- `apps/server/src/routes/store-routes.ts`
- `apps/server/src/routes/product-routes.ts`
- 해당 controller와 API 테스트

#### 완료 조건

- 데모 사용자, 프로필, 매장, 구역과 추천 가능한 제품을 조회할 수 있다.
- 모든 path, query와 body 입력을 Zod로 검증한다.
- 비활성 제품, 수량 0과 체험 불가 제품은 추천 가능 조회에서 제외된다.
- API 응답 필드명이 확정 문서와 일치한다.

#### 테스트 항목

- `GET /api/demo/users`
- `POST /api/demo/login`
- `GET /api/users/:userId/profile`
- `GET /api/stores`
- `GET /api/stores/:storeId/zones`
- `GET /api/stores/:storeId/products`
- `GET /api/products/:productId`
- 잘못된 ID와 비활성 데이터 처리

#### 수정하지 말아야 할 범위

- Reservation과 Journey 쓰기
- AI 호출
- 결과 생성
- 직원 화면
- 캐릭터 에셋

### 4단계. 동의, 예약과 체크인

#### 목표

가상 고객이 동의를 선택하고, 질문을 포함한 예약을 생성하며, QR 토큰 또는 확정된 수동 코드로 체크인할 수 있게 한다.

#### 생성 파일

- consent repository/service/controller/routes/schema
- reservation repository/service/controller/routes/schema
- QR 토큰 생성 유틸리티
- 체크인 transaction 서비스
- 관련 API 테스트

#### 완료 조건

- Journey 데이터 활용 동의가 없으면 예약이 거부된다.
- 행동 데이터 미동의 사용자는 예약할 수 있지만 AI 입력에서 행동 원본이 제외된다.
- 예약 생성 시 질문 답변과 QR 토큰이 함께 저장된다.
- 체크인 시 Reservation이 CHECKED_IN이 되고 READY Journey가 생성된다.
- 동일 QR 재요청은 새 Journey를 만들지 않고 기존 Journey를 반환한다.
- 존재하지 않거나 사용할 수 없는 QR은 명확한 오류를 반환한다.

#### 테스트 항목

- 동의 있음/없음/행동 데이터 미동의 예약
- 동일 이메일이 아닌 동일 userId 기준 동의 조회
- QR 토큰 고유성
- 체크인 2회 호출의 idempotency
- 예약과 다른 매장 사용 거부
- 만료·취소 상태를 MVP에 유지한다면 해당 체크인 거부

#### 수정하지 말아야 할 범위

- Journey 단계 추천 로직
- AI 호출
- 결과 생성
- QR 카메라 인식
- 결제·실시간 재고

### 5단계. 규칙 기반 Journey와 fallback

#### 목표

AI 없이도 전체 Journey가 시작, 선택, 다음 단계, 종료와 결과 저장까지 진행되게 한다. 이 단계의 결과가 이후 AI 실패 시 fallback이 된다.

#### 생성 파일

- journey repository/service/controller/routes/schema
- candidate engine
- fallback step generator
- fallback result generator
- Journey 복구용 aggregate query
- 상태 전이와 transaction 테스트

#### 완료 조건

- Journey 시작 시 Snapshot, BAG JourneyStep과 추천 3개가 저장된다.
- 추천 제품은 활성, 재고, 전시 가능, 매장, 구역과 카테고리 조건을 만족한다.
- SELECTED/REJECTED/DESELECTED 기록과 selectedProductId가 일관되게 갱신된다.
- next 호출이 현재 단계를 완료하고 다음 단계와 추천을 생성한다.
- 최소 완료 조건 전 finish가 거부된다.
- finish가 fallback JourneyResult와 JourneyResultItem을 생성한다.
- Journey와 Reservation 완료 상태가 결과 저장과 함께 갱신된다.
- 모든 쓰기 API가 중복 호출에 안전하다.

#### 테스트 항목

- 재고 0, 체험 불가, 비활성, 다른 매장, 다른 카테고리 제품 제외
- 선택·거절 제품 재추천 제외
- 선택 변경 시 DESELECTED와 새 SELECTED 순서
- interaction sequence 및 stepNumber 중복 요청
- BAG 없이 종료 거부
- 추가 제품 없이 종료 거부
- finish 2회 호출 시 기존 결과 반환
- AI 없이 `BAG → APPAREL → ACCESSORY → RESULT` 완료

#### 수정하지 말아야 할 범위

- OpenAI SDK와 프롬프트
- 프론트 화면
- 캐릭터 레이어
- 실제 재고 연동
- 동적 stage 확장 기능

### 6단계. 새로고침 복구와 오류 계약

#### 목표

Journey의 어느 확정 상태에서 새로고침해도 서버 응답만으로 올바른 화면과 데이터를 복원한다.

#### 생성 파일

- Journey aggregate response mapper
- 공통 API 오류 타입과 error middleware
- idempotency 및 복구 API 테스트
- 필요 시 프론트용 route 결정 helper의 공유 타입

#### 완료 조건

- READY, ACTIVE 각 stage와 FINISHED 상태를 한 조회 API로 구분할 수 있다.
- 현재 추천 제품, 선택 제품과 누적 선택 이력이 복구된다.
- 중복 next/finish 요청이 추가 step/result를 만들지 않는다.
- DB의 currentStage/currentStepNumber와 최신 step이 transaction 후 일치한다.
- 서버 재시작 후에도 SQLite 파일에서 진행 상태가 복구된다.

#### 테스트 항목

- 체크인 직후 새로고침
- BAG 선택 전·후 새로고침
- next 직후 새로고침
- 최소 완료 조건 충족 후 decision 복구
- FINISHED 결과 화면 복구
- 네트워크 재전송으로 같은 mutation 두 번 호출

#### 수정하지 말아야 할 범위

- AI 호출
- UI 디자인
- 캐릭터
- 공유 페이지
- 새로운 Journey 상태 추가

### 7단계. AI 어댑터와 검증

#### 목표

규칙 기반 후보 위에 AI 시나리오와 최종 Signature를 연결하되, 실패 시 5단계 결과와 동일하게 Journey가 계속되도록 한다.

#### 생성 파일

- `apps/server/src/services/ai/ai-client.ts`
- `apps/server/src/services/ai/journey-step-prompt.ts`
- `apps/server/src/services/ai/journey-result-prompt.ts`
- AI 구조화 응답 Zod schema
- AI 응답 ID 검증기
- AIExecution 최소 로깅 서비스
- mock AI 및 실패 테스트

#### 완료 조건

- AI 키와 모델 설정은 서버 환경변수에서만 읽는다.
- 서버가 유효 후보와 구역만 AI에 전달한다.
- AI 응답의 제품·구역 ID를 후보 집합과 DB에 대해 검증한다.
- 시간 초과, 네트워크 오류, JSON 오류와 허용되지 않은 ID가 모두 fallback으로 전환된다.
- 재시도는 최대 1회다.
- fallback도 정상 응답과 동일한 내부 타입을 만족한다.
- Journey 단계와 최종 결과 각각 deterministic fallback이 있다.
- AI 대기 중 DB transaction을 열지 않는다.

#### 테스트 항목

- 정상 구조화 응답
- malformed JSON
- 존재하지 않는 제품 ID
- 후보에는 없지만 DB에는 있는 제품 ID
- 다른 매장 구역 ID
- timeout 및 재시도 성공/실패
- Step 생성 실패 후 fallback 저장
- Result 생성 실패 후 fallback Result와 FINISHED 상태
- AI 로그에 API 키, 이메일과 행동 원본이 없는지 확인

#### 수정하지 말아야 할 범위

- 규칙 후보 조건
- DB 상태 전이 의미
- 프론트 화면
- AI가 제품명, 가격, 재고 또는 새 구역을 생성하는 기능
- 이미지 생성 AI

### 8단계. 고객 온라인 화면

#### 목표

가상 고객 선택부터 동의, 취향 확인, 예약·질문과 Passport 표시까지의 온라인 흐름을 구현한다.

#### 생성 파일

- auth, consent, profile, reservation feature 모듈
- `/login`, `/consent`, `/profile`, `/reserve`, `/question`, `/passport/:id` 페이지
- API client와 TanStack Query 또는 확정된 상태 관리 구성
- QR 표시 컴포넌트
- 온라인 흐름 테스트

#### 완료 조건

- 사용자 선택과 새로고침 후 사용자 컨텍스트 복원이 동작한다.
- 행동 데이터 동의 여부가 서버 값과 일치한다.
- 예약과 질문 데이터가 확정된 순서로 한 번만 제출된다.
- Passport에 매장, 시간과 QR 또는 예약 코드가 표시된다.
- 오류와 재시도 상태가 레이아웃을 깨뜨리지 않는다.

#### 테스트 항목

- 고객 A/B 프로필 차이
- 행동 데이터 미동의 흐름
- 필수 예약 입력 검증
- 예약 POST 중복 클릭 방지
- 예약 생성 후 새로고침
- 잘못된 Passport ID

#### 수정하지 말아야 할 범위

- 매장 Journey UI
- 직원 UI
- AI 프롬프트
- QR 카메라 인식
- 실제 인증·결제

### 9단계. 매장 Journey 화면

#### 목표

체크인부터 시나리오, 제품 선택, 구역 안내, 진행 상태와 종료 결정까지 핵심 시연 흐름을 구현한다.

#### 생성 파일

- check-in, journey, product selection feature 모듈
- `/store/check-in`
- `/journey/:id/intro`
- `/journey/:id/select`
- `/journey/:id/route`
- `/journey/:id/progress`
- `/journey/:id/decision`
- Journey 복구 route guard
- 핵심 사용자 흐름 테스트

#### 완료 조건

- 체크인 응답으로 기존 또는 새 Journey에 진입한다.
- 현재 단계 추천 3개와 이유가 표시된다.
- 선택, 거절과 선택 변경이 서버 저장 후 화면에 반영된다.
- 다음 구역과 브랜드 헤리티지가 DB 데이터로 표시된다.
- 최소 완료 조건을 충족한 경우에만 종료 버튼이 활성화된다.
- 새로고침 시 서버 aggregate 응답으로 같은 단계가 복원된다.
- AI 실패 시 fallback임을 내부적으로 기록하되 사용자 흐름은 중단되지 않는다.

#### 테스트 항목

- 예약 코드 성공/실패
- 제품 선택·변경·거절
- 느린 AI 응답 로딩
- AI 실패 fallback
- 각 Journey 단계 새로고침
- next 중복 클릭
- 종료 가능 여부
- 이미 FINISHED된 Journey 접근 시 결과 이동

#### 수정하지 말아야 할 범위

- 서버가 정한 추천 후보를 프론트에서 재계산하는 로직
- AI 직접 호출
- 실제 NFC·재고·위치 추적
- 최종 캐릭터 합성
- 문서에 없는 추천 기능

### 10단계. 결과, 공유와 직원 화면

#### 목표

Journey Signature, 최종 제품 조합, 제품별 이유와 직원 접객 요약을 저장하고 필요한 대상에게 제한된 형태로 보여준다.

#### 생성 파일

- result, share, staff API route/controller/response mapper
- `/journey/:id/result`
- `/share/:shareToken` 또는 확정된 공개 공유 경로
- 최소 직원 예약·Journey 요약 화면
- 결과 및 접근 범위 테스트

#### 완료 조건

- 동일 Journey 결과를 여러 번 요청해도 한 결과만 존재한다.
- 결과 화면에 최종 선택 제품만 순서대로 표시된다.
- 공유 응답에 이름, 이메일, 행동 원본과 staffSummary가 포함되지 않는다.
- 직원 응답에는 필요한 취향 요약과 설명 포인트만 포함된다.
- AI 결과 실패 시 fallback Signature와 staffSummary가 표시된다.

#### 테스트 항목

- JourneyResult/JourneyResultItem 중복 방지
- shareToken 고유성과 잘못된 토큰 처리
- 공유 payload 개인정보 누락 확인
- 고객 API에서 직원 전용 데이터 노출 여부
- 직원 역할 확인을 적용하기로 했다면 고객 접근 거부
- 결과 화면 새로고침

#### 수정하지 말아야 할 범위

- 결과 이후 결제·주문
- 소셜 공유 플랫폼 연동
- 직원의 데이터 수정 기능
- 관리자 대시보드
- 실제 MCM 고객 데이터

### 11단계. 캐릭터 레이어와 시연 안정화

#### 목표

사전 제작된 정적 레이어를 최종 선택에 따라 조합하고, 3~5분 시연 흐름을 안정화한다.

#### 생성 파일

- persona 레이어 컴포넌트
- 정적 base, bag, apparel, shoes/accessory와 background assets
- 제품 ID와 에셋 매핑
- 개발 환경 전용 demo reset route와 화면 제어
- end-to-end 시연 테스트

#### 완료 조건

- 고객 A/B가 같은 제품을 선택해도 취향과 선택 이력에 따라 다른 시나리오 또는 이유를 보여준다.
- 선택 제품 레이어가 정해진 캔버스에서 겹침 오류 없이 표시된다.
- AI를 끈 상태와 실패시킨 상태에서도 전체 시연이 끝난다.
- demo reset이 개발 환경에서만 동작한다.
- 전체 정상 시연이 3~5분 안에 완료된다.
- 한 대의 시연 서버 재시작 후 고정 시드와 DB 초기화 절차가 재현된다.

#### 테스트 항목

- 데스크톱 및 모바일 핵심 화면
- 긴 제품명·추천 이유 overflow
- 누락된 이미지 fallback
- AI 정상/timeout/오류 전체 흐름
- 네트워크 재시도와 중복 클릭
- 새로고침과 서버 재시작 복구
- 공유 페이지 개인정보 점검
- reset API 운영 환경 차단

#### 수정하지 말아야 할 범위

- 실시간 이미지·영상 생성
- 실사형 가상 피팅
- 실제 각인 장비
- 실제 MCM 시스템 연동
- 여러 국가·매장 간 Journey
- 복잡한 관리자 기능

## 4. 단계별 진입 기준

각 단계는 이전 단계의 완료 조건과 테스트가 통과한 뒤 시작한다.

- 1단계 진입 전: P0 설계 결정 완료
- 2단계 진입 전: monorepo 빌드 성공
- 4단계 진입 전: schema, migration과 seed 검증 완료
- 5단계 진입 전: 예약과 체크인 idempotency 확보
- 7단계 진입 전: AI 없는 fallback Journey 전체 완료
- 8~10단계 진입 전: 각 API 계약과 오류 응답 고정
- 11단계 진입 전: 정상, 새로고침과 AI 실패 핵심 흐름 통과

## 5. MVP 우선순위와 중단 기준

일정이 부족하면 다음 순서로 후순위 기능을 중단한다.

1. QR 카메라 인식
2. `/history`
3. SHOES 전용 시연 분기
4. 동의 이력·철회 UI
5. 상세 AIExecution 로그 UI 또는 관리 기능
6. 여러 직원 화면
7. 캐릭터 배경 전환과 세부 위치 보정

끝까지 유지해야 하는 범위는 다음과 같다.

- 가상 고객과 취향 데이터
- 동의와 예약
- QR 또는 예약 코드 체크인
- BAG + 추가 제품 선택
- 서버 제한 후보 안에서의 AI 시나리오
- 규칙 기반 fallback
- Journey 상태 저장과 새로고침 복구
- Journey Signature와 제품별 이유
- 개인정보가 제거된 공유 결과
- 직원용 최소 접객 요약

## 6. 전체 구현 완료 조건

- 단일 monorepo에서 web, server와 shared가 빌드된다.
- Prisma migration, seed와 SQLite 실행이 재현된다.
- 고객 A와 B의 3~5분 Journey가 각각 완료된다.
- 모든 AI 호출을 실패시켜도 두 Journey가 완료된다.
- 핵심 화면마다 새로고침 후 동일 상태가 복원된다.
- 중복 check-in, next와 finish 요청이 중복 행을 만들지 않는다.
- AI는 서버 후보 밖의 제품과 구역을 결과에 사용할 수 없다.
- 프론트 번들과 저장소에 AI API 키가 없다.
- 공유 응답과 직원 응답의 개인정보 범위가 테스트로 검증된다.
- 실제 MCM 회원, 결제, NFC, 실시간 재고와 이미지 생성 기능이 포함되지 않는다.

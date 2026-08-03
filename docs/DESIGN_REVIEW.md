# MCM Journey Passport 설계 검토

## 1. 검토 범위

다음 두 문서를 상호 비교했다.

- `docs/SYSTEM_DESIGN_V1.md`
- `docs/DATABASE_SCHEMA.md`

검토 기준은 React + TypeScript + Vite, Node.js + TypeScript + Express, Prisma + SQLite, 단일 monorepo, 백엔드 전용 AI 호출, 가상 사용자와 시드 데이터를 사용하는 해커톤 MVP다.

## 2. 전체 설계 평가

전체 구조는 구현 가능한 편이다. 특히 다음 원칙은 두 문서에서 일관되며 그대로 유지할 가치가 있다.

- 프론트엔드는 AI API를 직접 호출하지 않는다.
- 백엔드가 재고, 카테고리, 매장 구역과 제외 제품을 먼저 제한한다.
- AI는 서버가 전달한 제품 ID와 구역 ID 중에서만 선택한다.
- AI 응답은 서버가 다시 검증하고, 실패하면 규칙 기반 결과로 진행한다.
- Journey 핵심 상태와 선택 이력은 서버와 DB에 저장한다.
- 실제 MCM 회원, 결제, NFC, 실시간 재고와 실사형 피팅은 제외한다.

다만 현재 상태로 바로 구현하면 API와 DB 사이에서 서로 다른 해석이 생길 가능성이 높다. 가장 큰 원인은 `DATABASE_SCHEMA.md`가 `SYSTEM_DESIGN_V1.md`의 개략 모델을 확장하면서 필드명, 상태, 생성 책임과 저장 단위를 바꾸었지만, 시스템 설계의 화면 흐름과 REST API가 이에 맞게 갱신되지 않은 점이다.

구현 착수 가능 여부는 **조건부 가능**으로 판단한다. 아래 P0 의사결정과 충돌을 먼저 확정해야 한다.

## 3. 문서 간 충돌 사항

### P0. 예약 생성 시점과 시작 질문 순서가 충돌한다

- 시스템 화면 순서는 `/reserve`에서 매장·날짜·시간을 선택한 뒤 `/question`에서 시작 질문에 답하도록 되어 있다.
- API는 `POST /api/reservations` 하나만 있고 질문 답변 수정 API가 없다.
- DB의 `Reservation.startQuestionCode`, `startAnswerCode`, `startAnswerLabel`은 모두 필수다.

현재 계약대로라면 `/reserve` 화면에서 Reservation을 먼저 생성할 수 없다. 다음 중 하나를 결정해야 한다.

1. `/reserve`와 `/question`의 입력을 프론트 임시 상태에 모은 뒤 질문 완료 시 한 번만 Reservation을 생성한다.
2. Reservation을 초안 상태로 먼저 만들고 질문 답변을 수정하는 API와 상태를 추가한다.

MVP에는 1안이 단순하지만, 문서상 확정이 필요하다.

### P0. Journey 생성 책임이 중복된다

- 시스템 API에는 `POST /api/journeys`와 `POST /api/journeys/:journeyId/start`가 있다.
- DB 운영 규칙은 체크인 성공 시 `READY` Journey를 생성하고, 첫 시나리오 시작 시 `ACTIVE`로 바꾸도록 한다.
- Reservation 규칙은 체크인 후 같은 QR을 다시 쓰면 기존 Journey로 이동한다고 한다.

`check-in`과 `POST /api/journeys` 중 누가 Journey를 생성하는지 불명확하다. 둘 다 생성할 수 있으면 중복 요청과 경쟁 상태가 발생한다. MVP에서는 `check-in`이 Journey를 idempotent하게 생성하거나 기존 Journey를 반환하고, `start`가 첫 단계 생성만 담당하는 구조가 가장 단순하다. 이 경우 독립적인 `POST /api/journeys`의 필요성을 재검토해야 한다.

### P0. 정상 AI 응답과 실패 대체 응답의 구조가 다르다

- 정상 응답에는 `recommendationReasons`와 `canFinishJourney`가 있다.
- 시스템의 고정 실패 응답에는 두 필드가 없다.
- DB에서는 `StepRecommendation.reason`과 `JourneyStep.canFinishJourney`가 필수다.

현재 실패 응답을 그대로 저장할 수 없다. 정상 응답과 fallback 응답은 동일한 서버 내부 스키마를 만족해야 한다.

또한 고정 fallback의 `zone-accessory`와 `product-accessory-01~03`은 현재 단계, 실제 시드 ID, 재고와 거절 이력을 보장하지 않는다. 이는 "서버가 전달한 후보와 구역 중에서만 선택" 원칙과 충돌할 수 있다. fallback은 하드코딩된 제품 ID가 아니라 해당 요청에서 이미 계산한 유효 후보로 동적으로 구성해야 한다.

### P0. 시스템 설계와 DB 문서의 필드명이 다르다

| 개념 | SYSTEM_DESIGN_V1 | DATABASE_SCHEMA | 위험 |
|---|---|---|---|
| 제품 가격 | `price` | `priceKrw` | API 타입 불일치 |
| 구역 순서 | `sequence` | `displayOrder` | 시드 및 정렬 구현 불일치 |
| 온라인 행동 시각 | `createdAt` | `occurredAt` | 조회·인덱스 불일치 |
| Journey 단계 | `stageType` | `stage` | 공유 타입 불일치 |
| 제품 상호작용 유형 | `interactionType` | `type` | 요청 DTO 불일치 |
| 취향 목록 | `preferredCategories`, `preferredColors`, `preferredStyles` | `TastePreference` 행으로 정규화 | 조회 응답 형태 불일치 |

구현 전에 어느 문서를 데이터 계약의 기준으로 삼을지 확정해야 한다. 상세 DB 모델을 유지한다면 공통 API 타입도 DB 문서의 명칭으로 통일하는 편이 안전하다.

### P1. 상태 집합이 다르다

- 시스템의 Reservation 상태는 `RESERVED`, `CHECKED_IN`, `COMPLETED`만 명시한다.
- DB는 `CANCELLED`, `EXPIRED`를 추가한다.
- 시스템의 Journey 상태는 `ACTIVE`, `FINISHED`, `CANCELLED`만 명시한다.
- DB는 체크인 후 시작 전 상태인 `READY`를 추가한다.
- 시스템의 ProductInteraction에는 `DESELECTED`가 없지만 DB에는 있다.

DB 상태가 더 완전하지만 프론트 라우팅과 API 오류 처리가 추가 상태를 어떻게 표시할지 정의되어 있지 않다.

### P1. 직원 요약 AI 호출 책임이 중복된다

- 시스템의 Signature Generator 출력에 직원용 접객 요약이 포함된다.
- DB의 `AIPurpose`에는 `JOURNEY_RESULT`와 별도로 `STAFF_SUMMARY`가 있다.
- `JourneyResult.staffSummary`는 필수다.

결과 생성 한 번으로 Signature와 직원 요약을 함께 만들지, 직원 요약을 별도 AI 호출로 만들지 결정해야 한다. 해커톤 MVP에는 한 번의 결과 호출로 함께 생성하는 편이 실패 지점과 대기 시간을 줄인다.

### P1. QR의 의미가 일관되지 않다

- DB는 `qrToken`을 일회용 토큰이라고 설명한다.
- 동시에 체크인 후 같은 QR을 다시 사용하면 기존 Journey로 이동한다고 규정한다.
- 시스템은 QR 실패 시 "예약 코드 직접 입력"을 지원하지만 DB에는 짧은 예약 코드가 따로 없다.

`qrToken`을 체크인 후에도 조회 가능한 불투명 식별자로 사용할지, 실제로 소비되는 일회용 토큰으로 사용할지 결정해야 한다. 긴 QR 토큰을 수동 입력 코드로 재사용할지도 확정해야 한다.

### P2. 결과 저장 API의 의미가 불명확하다

- `JourneyResult`는 Journey 종료 시 이미 DB에 저장된다.
- 별도로 `POST /api/journeys/:journeyId/result/save`가 있다.
- DB에는 즐겨찾기나 별도 저장 상태가 없다.

"save"가 결과 생성·영속화를 뜻한다면 `finish`와 중복이다. 고객의 별도 보관 의사를 뜻한다면 DB 필드가 빠져 있다. MVP에서는 결과 생성 시 자동 저장하고 별도 save API를 제거하는 방향이 단순하지만, 구현 전에 의미를 확정해야 한다.

## 4. SYSTEM_DESIGN_V1에 있으나 DB에 충분히 반영되지 않은 항목

### 캐릭터 레이어 위치

시스템 설계는 Product에 `personaLayerPosition`을 추가할 수 있다고 명시하지만 DB Product에는 `personaLayerUrl`과 `sceneBackgroundKey`만 있다. 레이어별 위치 보정이 실제 에셋에 필요하다면 저장 위치와 표현 형식을 결정해야 한다. 모든 레이어가 동일 캔버스 규격이면 필드 없이 처리할 수 있다.

### 수동 입력용 예약 코드

시스템은 QR 대신 예약 코드 입력을 필수 대체 경로로 둔다. DB에는 `qrToken`만 있다. 수동 입력 UX를 유지하려면 짧고 고유한 `reservationCode`가 필요한지, QR 토큰을 그대로 입력할지 결정해야 한다.

### AI 단계별 fallback

시스템에는 Journey 단계용 fallback 예시만 있다. 다음 항목의 deterministic fallback 출력은 문서화되지 않았다.

- Taste Analyzer 실패 시 `JourneyProfileSnapshot` 필수 필드 생성 방법
- Signature Generator 실패 시 `JourneyResult` 필수 필드 생성 방법
- 직원 요약 실패 시 `staffSummary` 생성 방법
- 추천 후보가 3개 미만일 때의 표시와 이유 생성 방법

DB에는 `usedFallback`과 `AIExecution`이 있으므로 실패 사실은 저장할 수 있지만, 실제 대체 데이터 생성 규칙이 빠져 있다.

### 새로고침 복원 응답 계약

시스템은 `GET /api/journeys/:id`로 현재 단계를 복원한다고 하지만 응답에 무엇이 포함되는지 정의하지 않는다. 최소한 다음 데이터의 반환 여부를 결정해야 한다.

- Journey 상태와 현재 단계 번호
- 현재 JourneyStep과 상태
- 현재 단계 추천 3개와 선택 제품
- 누적 선택·거절 이력
- 다음에 이동할 프론트 경로 또는 이를 계산할 규칙
- FINISHED인 경우 JourneyResult

### 진행 중 요청 복구

AI 호출 도중 새로고침하거나 `/next`를 두 번 호출한 경우를 표현할 명확한 상태가 없다. `AIExecutionStatus`에는 `PENDING`이 없고, JourneyStep은 생성된 이후의 상태만 표현한다. MVP에서 AI를 동기 호출로 처리한다면 동일 요청의 중복 실행을 막는 idempotency 규칙과 "AI 실패 즉시 fallback 저장" 원칙이 필요하다.

## 5. DATABASE_SCHEMA에 있으나 MVP에 과도한 항목

다음 항목은 장기 운영에는 의미가 있지만 3~5분 시연용 MVP의 구현량을 크게 늘린다.

### 우선 단순화 권장

- `Consent`의 버전 이력, 철회, `marketingAllowed`: 마케팅은 사용하지 않는다고 명시되어 있다. 현재 동의 1건만 필요하면 과도하다.
- `TagSource.AI`, `TagSource.RULE`: 제품 태그는 시드에서 팀이 직접 검토하므로 `MANUAL` 외 흐름이 없다.
- `OnlineEventType.STORE_VISIT`, `JOURNEY_VIEW`, `metadataJson`: 핵심 데모는 반복 조회·위시리스트·장바구니·색상 선택만으로 충분하다.
- `AIExecution`의 전체 `requestJson`, `responseJson`, 모델명과 지연 시간: 디버깅에는 유용하지만 개인정보 최소화와 구현량 측면에서 과하다. 최소 로그만 남기거나 개발 환경에서만 상세 저장하는 편이 낫다.
- 별도 `STAFF_SUMMARY` AI 목적: 결과 생성과 합치면 호출 수와 실패 지점을 줄일 수 있다.
- 모든 조회용 인덱스: 사용자 2명, 제품 9~12개, 매장 1개에서는 성능상 필요성이 낮다. unique 제약과 핵심 조회 인덱스만 우선 적용할 수 있다.

### 유지 가능하지만 범위를 명확히 할 항목

- `TastePreference`: SQLite에서 배열 대신 정규화된 선호를 저장하는 데 유용하므로 유지 가치가 있다.
- `JourneyProfileSnapshot`: 재현성과 동의 미허용 시 AI 입력 차단에 유용하지만, 해커톤 동안 TasteProfile이 바뀌지 않는다면 JSON 한 필드 수준으로 단순화할 수 있다.
- `StepRecommendation`: 새로고침 복원과 AI 허용 후보 검증에 직접 필요하므로 유지 가치가 높다.
- `JourneyResultItem`: 최종 선택 순서와 제품별 이유를 저장하는 데 필요하다. 다만 현재 필드만으로는 Product 이름·이미지 변경까지 완전히 스냅샷하지 못하므로 "제품 변경 후 당시 결과 완전 재현"이라는 설명은 과장되어 있다.
- `ProductInteraction.sequence`: 정확한 선택 순서를 보존하지만 동시 요청 제어가 필요하다. MVP에서 한 화면의 단일 사용자만 조작한다면 유지 가능하다.

### 화면·기능 단순화 권장

- QR 카메라 인식은 우선순위에서 내리고 QR 표시 + 예약 코드 입력을 기본 시연 경로로 둔다.
- `/history`는 핵심 매장 Journey가 완성된 뒤에만 구현한다.
- 직원 화면은 예약 목록, 진행 화면, 결과 화면을 모두 별도 구현하기보다 하나의 읽기 전용 Journey 요약 화면으로 시작한다.
- 시연 경로는 `BAG → APPAREL → ACCESSORY → RESULT` 한 개를 우선 완성한다. `SHOES` enum과 데이터 확장은 핵심 경로가 안정된 뒤 진행한다.
- 캐릭터 레이어는 에셋 규격이 확정된 경우에만 적용하고, Journey 상태 로직과 AI 실패 흐름보다 뒤에 둔다.

## 6. Prisma 및 SQLite 구현 위험

### DB만으로 보장할 수 없는 교차 관계

다음 규칙은 단순 foreign key와 unique만으로 보장되지 않는다.

- `Inventory.zoneId`의 Store와 `Inventory.storeId`가 동일해야 한다.
- Inventory 제품 카테고리와 StoreZone 카테고리가 같아야 한다.
- `Journey.userId`, `storeId`가 연결된 Reservation의 사용자·매장과 같아야 한다.
- `ProductInteraction.journeyId`가 `journeyStepId`의 Journey와 같아야 한다.
- `JourneyStep.zoneId`가 Journey의 매장에 속해야 한다.
- `selectedProductId`가 추천 후보이거나 같은 매장의 체험 가능한 동일 카테고리 제품이어야 한다.
- 최소 완료 조건인 가방 1개 + 추가 제품 1개가 충족되어야 한다.

이 규칙들은 서비스 계층에서 검증하고 관련 쓰기를 Prisma transaction으로 묶어야 한다. AI 응답을 기다리는 동안 DB transaction을 열어두면 안 된다.

### 중복 저장 필드의 불일치 위험

- Journey의 `currentStage`, `currentStepNumber`와 최신 JourneyStep
- JourneyStep의 `selectedProductId`와 ProductInteraction의 최신 SELECTED/DESELECTED 이력
- Journey의 `userId`, `storeId`와 Reservation의 동일 정보
- ProductInteraction의 `journeyId`와 JourneyStep의 `journeyId`

복구 편의를 위해 중복 필드를 유지할 수 있지만, 반드시 하나의 서비스 함수와 transaction에서 함께 갱신해야 한다. 각 값의 canonical source도 문서화해야 한다.

### 범위·형식 제약

`0~100` 점수, `quantity >= 0`, 양수인 `rank`·`sequence`, 상태와 timestamp의 일치 등은 현재 unique/index만으로 보장되지 않는다. Zod 요청 검증과 서비스 계층 검증이 필요하다.

Prisma의 현재 SQLite connector는 enum을 사용할 수 있지만 SQLite 자체가 enum 값을 DB 수준에서 강제하지 않는다. Prisma를 우회한 데이터 입력이나 잘못된 migration 데이터는 런타임 오류로 이어질 수 있으므로 Prisma 버전을 고정하고 시드는 Prisma Client를 통해 넣어야 한다. 참고: [Prisma SQLite connector 문서](https://www.prisma.io/docs/orm/core-concepts/supported-databases/sqlite)

### JSON 문자열 필드

`preferencesJson`, `behaviorSummaryJson`, `requestJson`, `responseJson`, `metadataJson`은 String이므로 DB가 구조를 검증하거나 내부 필드를 조회할 수 없다. 저장 전·조회 후 Zod 검증이 필요하다. MVP에서 검색하지 않는 데이터만 JSON 문자열로 저장해야 한다.

### SQLite 실행 환경

SQLite는 단일 로컬 시연 프로세스에는 적합하지만 다중 서버 인스턴스나 휘발성 파일 시스템 배포에는 부적합하다. 현장 시연을 한 대의 Node 서버로 실행할지, 외부 공개 배포를 할지 먼저 정해야 한다. 공개 배포가 필요해도 이번 MVP의 SQLite 기준을 유지한다면 영속 볼륨과 단일 writer를 보장할 실행 환경이 필요하다.

### 순번 경쟁 상태

`ProductInteraction.sequence`와 `JourneyStep.stepNumber`를 `MAX + 1`로 계산하면 중복 요청에서 unique 충돌이 날 수 있다. 단일 Journey의 `/interactions`, `/next`, `/finish` 요청을 순차 처리하고 transaction 안에서 번호와 상태를 함께 확정해야 한다.

## 7. 데이터 흐름이 불분명한 부분

### 온라인 흐름

1. 데모 로그인 결과가 서버 세션인지 단순 userId인지 불명확하다.
2. 현재 로그인 사용자는 프론트 임시 상태라고 되어 있어 브라우저 새로고침 후 사용자 컨텍스트가 사라질 수 있다.
3. 동의하지 않은 온라인 행동을 프로필 화면에는 보여주되 AI 입력에서는 제외하는지, 화면에서도 숨기는지 불명확하다.
4. Taste Analyzer가 매 Journey 시작 때 AI로 실행되는지, 시드 TasteProfile을 그대로 요약하는지 불명확하다.
5. 예약 입력과 질문 답변이 언제 하나의 POST body로 합쳐지는지 불명확하다.

### 체크인과 Journey 시작

1. 체크인 응답이 Reservation만 반환하는지, 생성된 Journey와 첫 이동 URL까지 반환하는지 정의되어 있지 않다.
2. `start`가 Taste Analyzer, Snapshot 생성, 첫 BAG JourneyStep과 추천 후보 생성을 한 번에 수행하는지 불명확하다.
3. INTRO가 실제 JourneyStep인지 화면만을 위한 stage인지 불명확하다. `JourneyStage`에는 INTRO가 있지만 최소 단계 설명은 `INTRO → BAG`이고 JourneyStep에는 필수 `zoneId`와 선택 구조가 있다.

### 제품 선택과 다음 단계

1. `/interactions`가 단순 로그만 추가하는지, SELECTED일 때 `JourneyStep.selectedProductId`와 status도 갱신하는지 불명확하다.
2. `/next`가 현재 단계를 완료하고 다음 단계 생성까지 수행하는지, 다음 stage 선택만 수행하는지 불명확하다.
3. AI가 세 제품을 직접 고르는지, 서버가 정한 세 제품의 순서·이유만 정하는지 불명확하다.
4. `StepRecommendation.isAiSelected`가 넓은 규칙 후보 풀과 화면 표시 후보를 구분하는 값인지 정의되어 있지 않다.
5. 고객이 추천 카드 외 실제 제품을 선택할 때 프론트가 어떤 제품 목록과 ID를 얻는지 불명확하다.

### 종료와 결과

1. `/finish`가 AI 결과 생성과 DB 저장까지 동기 수행하는지 불명확하다.
2. 결과 생성 AI가 실패한 경우 FINISHED로 전환할지, fallback 결과 저장 후 전환할지 명시가 필요하다.
3. Reservation의 COMPLETED와 Journey의 FINISHED를 어느 transaction에서 함께 갱신하는지 불명확하다.
4. `result/save`와 자동 저장의 역할이 중복된다.

## 8. AI 실패 후 Journey 지속 가능성 평가

평가는 **부분 충족**이다.

긍정적인 요소:

- AI 재시도 1회 제한이 있다.
- 잘못된 제품·구역 ID를 폐기한다.
- JourneyStep과 JourneyResult에 `usedFallback`을 둘 수 있다.
- AIExecution으로 성공·검증 실패·fallback을 기록할 수 있다.

부족한 요소:

- 고정 fallback ID가 현재 유효 후보임을 보장하지 않는다.
- fallback이 정상 응답의 필수 필드를 채우지 않는다.
- Taste Snapshot과 최종 Result 각각의 fallback 생성 규칙이 없다.
- 후보가 없을 때 다음 구역을 어떻게 선택할지 없다.
- AI 실패와 fallback 저장 사이에 DB 상태가 어느 단계로 남는지 없다.

권장 원칙은 다음과 같다.

1. 규칙 후보를 먼저 DB에서 확정한다.
2. AI에는 그 후보만 전달한다.
3. AI 성공 시 검증된 결과를 사용한다.
4. 실패·시간 초과·검증 실패 시 같은 후보를 규칙 점수 순으로 사용해 동일 응답 스키마를 만든다.
5. 생성된 JourneyStep, StepRecommendation, Journey 상태를 한 transaction으로 저장한다.
6. 결과 생성도 선택 제품에서 deterministic Signature와 직원 요약을 만들 수 있어야 한다.

## 9. 새로고침 후 상태 복원 가능성 평가

평가는 **핵심 데이터는 존재하지만 API 계약이 부족함**이다.

복구에 필요한 Journey, currentStage, currentStepNumber, JourneyStep, StepRecommendation, selectedProductId와 ProductInteraction은 DB에 있다. 따라서 정상 저장이 끝난 뒤의 새로고침 복원은 가능하다.

다만 다음을 보완해야 실제로 안정적으로 복구된다.

- `GET /api/journeys/:id`를 복구용 aggregate 응답으로 정의한다.
- 현재 단계와 최신 JourneyStep 불일치 시 어느 값을 신뢰할지 정한다.
- 로그인한 데모 userId 또는 세션을 새로고침 후 복원한다.
- `/next`와 `/finish` 중복 호출을 idempotent하게 처리한다.
- AI 호출 중 새로고침 시 서버가 즉시 fallback으로 완료할지, 재조회 상태를 제공할지 정한다.
- FINISHED Journey는 항상 기존 JourneyResult를 반환한다.

## 10. 보안 및 개인정보 검토

### 잘 설계된 부분

- 실제 MCM 회원과 실제 개인정보를 저장하지 않는다.
- AI API 키는 백엔드 환경변수에 둔다.
- QR에 Reservation ID를 직접 노출하지 않는다.
- 직원에게 원본 행동 기록을 제공하지 않는다.
- 공유 페이지에 이름, 이메일과 행동 기록을 노출하지 않는다.

### 보완할 위험

- 데모 로그인과 `:userId`, `:journeyId` 기반 API에 접근 제어 규칙이 없다. 사용자 화면, 직원 화면과 공유 화면의 권한 경계를 정해야 한다.
- `AIExecution.requestJson`과 `responseJson`에 온라인 행동 원본이나 사용자 식별자가 들어가면 최소 수집 원칙과 충돌한다. 요약 데이터만 저장하고 식별자를 제거해야 한다.
- `errorMessage`에 SDK 오류 전문이나 요청 payload가 포함되지 않도록 해야 한다.
- `shareToken`은 충분히 긴 난수여야 하며 목록 API나 직원 응답에서 불필요하게 노출하지 않아야 한다.
- `/api/dev/reset-demo`, AI on/off와 Journey 초기화 기능은 운영 환경에서 반드시 차단해야 한다.
- Cookie 기반 데모 세션을 사용하면 CORS, SameSite와 CSRF 정책이 필요하고, 단순 userId 방식이면 해당 방식이 보안용 인증이 아님을 명확히 해야 한다.
- 동의 철회 후 기존 Journey, Snapshot과 AI 로그를 보존할지 삭제할지 정책이 없다. 가상 데이터여도 동작은 일관되어야 한다.
- 저장소나 프론트 빌드 결과에 AI API 키가 포함되지 않도록 `.env`와 `.gitignore` 정책이 필요하다.

## 11. 권장 수정 사항

### P0: 구현 전 문서 계약 통일

1. `DATABASE_SCHEMA.md`의 필드명과 상태를 기준으로 사용할지 확정한다.
2. 예약 입력을 질문 완료 후 한 번에 생성할지 확정한다.
3. 체크인 API가 Journey를 idempotent하게 생성·반환하도록 책임을 확정한다.
4. Journey start, interaction, next, finish의 요청·응답과 상태 전이를 정의한다.
5. 정상 AI와 모든 fallback이 공유하는 내부 스키마를 정의한다.
6. `GET /api/journeys/:id` 복구 응답을 정의한다.
7. Journey 상태와 관련 행을 함께 갱신하는 transaction 경계를 정의한다.

### P1: MVP 범위 축소

1. 첫 시연 경로를 `BAG → APPAREL → ACCESSORY → RESULT`로 고정해 완성한다.
2. AI는 Journey Step 생성과 최종 Result 생성의 최대 2종 호출로 시작한다.
3. TasteProfile은 시드 데이터로 두고, Journey 시작 시 규칙으로 Snapshot을 만든다. Taste Analyzer AI 호출은 핵심 흐름이 안정된 뒤 판단한다.
4. 직원 요약은 JourneyResult 생성에 포함한다.
5. QR 카메라, history, consent 이력·철회, 상세 AI 로그와 고급 soft delete 운영은 후순위로 둔다.
6. 캐릭터는 상태 로직과 fallback 테스트가 끝난 뒤 정적 레이어 조합만 적용한다.

### P1: 데이터 모델 정합성

1. 중복 FK와 상태 필드의 canonical source를 정한다.
2. `personaLayerPosition` 필요 여부를 에셋 규격으로 결정한다.
3. 수동 입력용 `reservationCode` 필요 여부를 정한다.
4. `StepRecommendation.isAiSelected`의 의미를 확정하거나 제거한다.
5. JourneyResultItem을 실제 스냅샷으로 볼지 단순 관계 테이블로 볼지 설명을 정정한다.
6. 점수, 수량, 순번과 상태 전이를 Zod와 서비스 계층에서 검증하도록 명시한다.

## 12. 구현 전 반드시 확정할 사항

아래 항목은 코드 작성 전에 답이 있어야 한다.

| 번호 | 의사결정 | 권장 기본안 |
|---|---|---|
| D1 | 예약과 질문 저장 시점 | 질문까지 완료한 뒤 Reservation 1회 생성 |
| D2 | Journey 생성 주체 | check-in이 READY Journey를 생성하거나 기존 Journey 반환 |
| D3 | 독립 `POST /api/journeys` 유지 여부 | MVP에서는 제거 또는 내부 서비스로 한정 |
| D4 | 필드명 기준 문서 | DATABASE_SCHEMA 명칭을 공통 타입의 기준으로 사용 |
| D5 | 정상·fallback 응답 스키마 | 동일한 Zod 스키마 사용, 누락 필드 금지 |
| D6 | fallback 후보 | 현재 요청의 유효 후보를 규칙 점수 순으로 사용 |
| D7 | 첫 시연 stage | BAG → APPAREL → ACCESSORY → RESULT |
| D8 | INTRO 저장 방식 | 선택 없는 화면 상태인지 실제 JourneyStep인지 결정 |
| D9 | interaction 처리 | SELECTED/DESELECTED 로그와 selectedProductId를 한 transaction에서 갱신 |
| D10 | next 처리 | 현재 step 완료 + 다음 step 생성 + Journey 포인터 갱신을 하나의 서비스 작업으로 처리 |
| D11 | finish 처리 | fallback 포함 Result 저장 후 Journey/Reservation 완료 상태 갱신 |
| D12 | 새로고침 응답 | 현재 step, 추천, 선택 이력, 결과를 포함하는 aggregate 응답 |
| D13 | 데모 로그인 유지 | 서버 세션 또는 명시적 localStorage userId 중 하나 선택 |
| D14 | 직원 API 권한 | 데모 STAFF 역할 확인 적용 여부와 방식 확정 |
| D15 | QR와 수동 코드 | 하나의 토큰 재사용 또는 별도 짧은 코드 결정 |
| D16 | 결과 save API | 자동 저장이면 제거, 별도 저장 의미면 DB 상태 추가 |
| D17 | AI 호출 범위 | Step + Result 두 호출을 우선, Taste/Staff 별도 호출은 후순위 |
| D18 | AI 상세 로그 | 개발 환경 최소 로그만 저장하고 원본 행동·PII 제외 |
| D19 | SQLite 실행 위치 | 단일 Node 프로세스와 영속 DB 파일 경로 확정 |
| D20 | 캐릭터 위치 정보 | 동일 캔버스 규격 사용 또는 위치 필드 형식 확정 |

이 표의 결정이 끝나면 API 명세를 먼저 고정한 뒤 Prisma와 화면 구현을 시작하는 것이 안전하다.

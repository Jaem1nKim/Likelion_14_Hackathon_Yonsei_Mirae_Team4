# MCM Journey Passport 설계 의사결정

## 1. 문서 목적

이 문서는 `SYSTEM_DESIGN_V1.md`, `DATABASE_SCHEMA.md`, `DESIGN_REVIEW.md`, `IMPLEMENTATION_PLAN.md`를 바탕으로 구현 전에 확정한 설계 결정을 기록한다.

아래 D1~D20은 모두 **확정(Resolved)** 상태이며 더 이상 미결정 항목이 아니다. D21~D23은 같은 작업에서 추가로 확정된 실행 환경, 에셋과 후순위 범위다. 구현 중 임의로 변경하지 않으며, 변경이 필요하면 별도 의사결정 기록을 추가한다.

## 2. 최종 결정 요약

| ID | 결정 | 상태 |
|---|---|---|
| D1 | 질문 완료 시 Reservation을 한 번 생성 | 확정 |
| D2 | 체크인이 READY Journey를 생성하거나 기존 Journey 반환 | 확정 |
| D3 | 외부 `POST /api/journeys` 제거 | 확정 |
| D4 | DATABASE_SCHEMA의 필드명과 enum을 기준으로 사용 | 확정 |
| D5 | 정상 AI와 fallback에 동일한 Zod 스키마 적용 | 확정 |
| D6 | fallback은 현재 유효 후보를 규칙 점수순으로 사용 | 확정 |
| D7 | 최초 MVP 경로를 BAG → APPAREL → ACCESSORY → RESULT로 고정 | 확정 |
| D8 | INTRO를 JourneyStep으로 저장하지 않음 | 확정 |
| D9 | 선택 이력과 selectedProductId를 한 transaction에서 갱신 | 확정 |
| D10 | next의 단계 완료·생성·포인터 갱신을 한 서비스 작업으로 처리 | 확정 |
| D11 | finish의 결과 저장·Journey/Reservation 완료를 transaction 처리 | 확정 |
| D12 | Journey GET을 새로고침 복구용 aggregate API로 정의 | 확정 |
| D13 | localStorage userId와 `X-Demo-User-Id` 사용 | 확정 |
| D14 | 직원 API에서 STAFF 역할 확인 | 확정 |
| D15 | `qrToken`과 `reservationCode` 분리 | 확정 |
| D16 | 별도 result/save API 제거 | 확정 |
| D17 | AI 호출을 Journey Step과 Journey Result 두 종류로 제한 | 확정 |
| D18 | TasteProfile은 시드로 사용하고 Taste Analyzer AI 제외 | 확정 |
| D19 | staffSummary를 Journey Result AI 응답에 포함 | 확정 |
| D20 | AIExecution에 원본 행동·이메일·전체 요청/응답을 저장하지 않음 | 확정 |

## 3. D1~D20 상세 결정

### D1. Reservation 생성 시점

**상태: 확정**

- 결정: `/reserve`와 `/question`의 입력은 프론트 임시 상태에 보관하고 질문 완료 시 `POST /api/reservations`를 한 번 호출한다.
- 선택 이유: DB의 `startQuestionCode`, `startAnswerCode`, `startAnswerLabel` 필수 조건을 지키면서 별도 DRAFT 상태와 답변 수정 API를 만들지 않기 위함이다.
- API·DB 영향: Reservation 생성 body에 매장, 예약 일시와 시작 질문 세 필드를 모두 포함한다. DB의 필수 필드는 그대로 유지한다.
- MVP 이후: 여러 질문이나 예약 중간 저장이 필요하면 `ReservationAnswer`와 DRAFT 상태를 별도 설계한다.

### D2. Journey 생성 주체

**상태: 확정**

- 결정: `POST /api/reservations/check-in`이 해당 Reservation의 READY Journey를 생성하거나 이미 존재하는 Journey를 반환한다.
- 선택 이유: QR 재시도와 중복 클릭에도 Reservation 1건당 Journey 1건을 보장하고 생성 책임을 한곳에 두기 위함이다.
- API·DB 영향: 체크인은 Reservation 상태 갱신과 Journey 생성/조회까지 수행한다. `Journey.reservationId` unique가 최종 중복 방지 장치다.
- MVP 이후: 다회 방문 Journey가 필요하면 Reservation과 Journey의 cardinality부터 재설계한다.

### D3. 외부 Journey 생성 API 제거

**상태: 확정**

- 결정: 외부용 `POST /api/journeys`는 제공하지 않는다.
- 선택 이유: D2와 중복되는 생성 경로를 제거해 상태 경쟁과 권한 오류를 막기 위함이다.
- API·DB 영향: Journey 생성은 체크인 서비스 내부 함수로만 호출한다. 외부 클라이언트는 Journey ID를 체크인 응답에서 받는다.
- MVP 이후: 운영자 수동 생성이 필요하면 일반 고객 API와 분리된 관리자 계약을 새로 만든다.

### D4. 필드명과 enum 기준

**상태: 확정**

- 결정: 공통 타입, API와 이후 Prisma 구현은 `DATABASE_SCHEMA.md`의 명칭을 기준으로 한다.
- 선택 이유: 상세 스키마 문서가 필드 타입, 관계, unique와 상태 전이를 가장 구체적으로 정의하기 때문이다.
- API·DB 영향: `priceKrw`, `displayOrder`, `occurredAt`, `stage`, `type` 등을 사용한다. SYSTEM_DESIGN의 개략 명칭은 API 타입에 사용하지 않는다.
- MVP 이후: 필드명 변경은 shared 타입과 migration을 함께 변경하는 버전 계약으로 처리한다.

### D5. AI와 fallback의 공통 스키마

**상태: 확정**

- 결정: Journey Step과 Journey Result 각각에서 정상 AI 응답과 deterministic fallback이 동일한 Zod 스키마를 만족한다.
- 선택 이유: AI 성공 여부에 따라 저장 및 프론트 응답 코드가 갈라지지 않게 하기 위함이다.
- API·DB 영향: 검증된 공통 객체만 JourneyStep, StepRecommendation, JourneyResult와 JourneyResultItem으로 변환한다.
- MVP 이후: 출력 버전을 변경할 때 promptVersion과 shared 타입을 함께 버전 관리한다.

### D6. fallback 후보 선정

**상태: 확정**

- 결정: fallback은 하드코딩 ID를 사용하지 않고 현재 요청에서 서버가 계산한 유효 후보를 `ruleScore` 내림차순으로 사용한다.
- 선택 이유: 재고, 매장, 카테고리, 거절 이력과 활성 상태 검증을 항상 유지하기 위함이다.
- API·DB 영향: AI 호출 전에 후보 계산이 완료되어야 하며 fallback도 동일 후보 배열만 사용한다.
- MVP 이후: 규칙 점수 알고리즘을 개선할 수 있지만 후보 경계는 계속 서버가 소유한다.

### D7. 최초 MVP Journey 경로

**상태: 확정**

- 결정: 최초 시연의 확장 경로는 `BAG → APPAREL → ACCESSORY → RESULT`로 고정한다.
- 선택 이유: 3~5분 시연에서 핵심인 가방 중심 스타일 확장을 안정적으로 보여주고 분기 수를 제한하기 위함이다.
- API·DB 영향: `/next`는 BAG에서 APPAREL, APPAREL에서 ACCESSORY만 생성한다. SHOES stage는 enum에 남지만 최초 경로에는 사용하지 않는다.
- MVP 이후: SHOES와 AI 기반 stage 분기는 별도 상태 전이 표와 후보 보장 조건을 추가한 뒤 활성화한다.

### D8. INTRO 저장 방식

**상태: 확정**

- 결정: INTRO는 JourneyStep 행으로 저장하지 않고 체크인 후 READY 상태를 표현하는 화면으로만 사용한다.
- 선택 이유: 선택·추천이 없는 가상 단계를 JourneyStep의 필수 `zoneId`, 시나리오와 추천 구조에 억지로 맞추지 않기 위함이다.
- API·DB 영향: READY Journey의 `currentStage`는 `INTRO`, `currentStepNumber`는 `0`, `currentStep`은 `null`이다. start 성공 후 BAG stepNumber 1을 생성한다.
- MVP 이후: INTRO 자체에 저장할 상호작용이 생기면 별도 Intro 데이터 모델을 검토한다.

### D9. 제품 선택 transaction

**상태: 확정**

- 결정: SELECTED/DESELECTED ProductInteraction과 `JourneyStep.selectedProductId`를 한 transaction에서 갱신한다.
- 선택 이유: 선택 이력과 현재 선택 제품이 서로 다른 상태로 남는 것을 방지하기 위함이다.
- API·DB 영향: interaction 서비스가 현재 step, 제품 적격성과 Journey 상태를 다시 확인한 뒤 모든 쓰기를 원자적으로 수행한다.
- MVP 이후: 동시 기기 편집이 필요하면 낙관적 버전 필드와 충돌 응답을 추가한다.

### D10. next 서비스 경계

**상태: 확정**

- 결정: next는 현재 단계 완료, 다음 단계와 추천 생성, Journey의 `currentStage`·`currentStepNumber` 갱신을 하나의 서비스 작업으로 처리한다.
- 선택 이유: 중간 상태에서 새로고침해도 단계 포인터와 실제 JourneyStep이 어긋나지 않게 하기 위함이다.
- API·DB 영향: AI 호출은 transaction 밖에서 수행하고, 검증된 AI/fallback 결과를 얻은 뒤 최종 쓰기만 짧은 transaction으로 수행한다.
- MVP 이후: 비동기 AI job을 도입하면 PENDING 상태와 polling 계약을 별도로 추가한다.

### D11. finish service 경계

**상태: 확정**

- 결정: JourneyResult와 JourneyResultItem 저장 후 Journey FINISHED와 Reservation COMPLETED 갱신을 하나의 transaction으로 처리한다.
- 선택 이유: 완료 상태인데 결과가 없거나 결과는 있는데 Journey가 ACTIVE인 상태를 방지하기 위함이다.
- API·DB 영향: AI 호출은 transaction 밖에서 수행한다. transaction 진입 후 상태와 최소 완료 조건을 재검증하고 결과 및 상태를 함께 저장한다.
- MVP 이후: 결제·주문 같은 후속 기능은 이 transaction에 포함하지 않고 이벤트 기반 후처리로 분리한다.

### D12. Journey aggregate 조회

**상태: 확정**

- 결정: `GET /api/journeys/:journeyId`는 새로고침 복구에 필요한 aggregate 데이터를 모두 반환한다.
- 선택 이유: 프론트 로컬 상태에 Journey 진행 사실을 의존하지 않기 위함이다.
- API·DB 영향: Journey, 현재 step, 추천, 선택·거절 요약, 완료 가능 여부와 FINISHED 결과를 조합한다. 프론트 경로 문자열은 반환하지 않는다.
- MVP 이후: 데이터가 커지면 summary/detail 분리나 pagination을 검토한다.

### D13. 데모 사용자 식별

**상태: 확정**

- 결정: 프론트는 선택한 userId를 localStorage에 보관하고 API 요청에 `X-Demo-User-Id` 헤더로 전달한다.
- 선택 이유: 실제 인증 시스템 없이 새로고침 후 데모 사용자 컨텍스트를 복원하기 위함이다.
- API·DB 영향: 보호 API는 활성 User 존재 여부와 소유권을 확인한다. 비밀번호, 세션과 access token은 만들지 않는다.
- MVP 이후: 실제 인증 도입 시 헤더 방식을 제거하고 서버 검증 identity로 대체한다.

### D14. 직원 API 역할 확인

**상태: 확정**

- 결정: `/api/staff/*`는 `X-Demo-User-Id` User의 `role = STAFF`와 `isActive = true`를 확인한다.
- 선택 이유: 데모 환경에서도 고객 데이터 조회 화면의 역할 경계를 명확히 하기 위함이다.
- API·DB 영향: UserRole과 공통 access middleware를 사용한다. 고객 역할이면 403을 반환한다.
- MVP 이후: 직원 권한 세분화와 매장별 접근 범위를 실제 인증·인가 모델로 확장한다.

### D15. QR 토큰과 수동 코드 분리

**상태: 확정**

- 결정: QR에는 긴 `qrToken`, 수동 입력에는 짧은 `reservationCode`를 사용한다.
- 선택 이유: QR 토큰의 추측 저항성과 현장 수동 입력의 사용성을 동시에 확보하기 위함이다.
- API·DB 영향: Reservation에 unique `reservationCode`가 추가로 필요하다. 체크인 body는 두 값 중 정확히 하나만 허용한다.
- MVP 이후: 만료, 회전과 사용 횟수 정책이 필요하면 토큰 모델을 Reservation에서 분리한다.

### D16. 결과 자동 저장

**상태: 확정**

- 결정: 별도 `POST .../result/save` API를 제거하고 finish에서 결과를 자동 저장한다.
- 선택 이유: JourneyResult가 이미 영속 결과이며 사용자 저장 의사를 나타내는 별도 DB 상태가 없기 때문이다.
- API·DB 영향: `POST /api/journeys/:journeyId/finish`가 결과 생성·저장까지 담당한다. 조회는 GET만 제공한다.
- MVP 이후: 즐겨찾기나 보관함이 필요하면 별도 사용자-결과 관계를 설계한다.

### D17. MVP AI 호출 종류

**상태: 확정**

- 결정: AI 호출은 `JOURNEY_STEP`과 `JOURNEY_RESULT` 두 종류만 우선 구현한다.
- 선택 이유: 호출 수, 지연 시간과 실패 지점을 줄이면서 핵심 AI 경험을 유지하기 위함이다.
- API·DB 영향: AIPurpose의 다른 값은 enum 호환성을 위해 남을 수 있지만 MVP 서비스에서는 호출하지 않는다.
- MVP 이후: 필요성이 검증되면 별도 Taste Analysis 또는 Staff Summary 호출을 추가한다.

### D18. TasteProfile 처리

**상태: 확정**

- 결정: TasteProfile과 TastePreference는 시드 데이터로 사용하고 Taste Analyzer AI는 구현하지 않는다.
- 선택 이유: 실제 행동 추적이 없는 가상 사용자 MVP에서 매 Journey마다 같은 취향을 다시 생성할 필요가 없기 때문이다.
- API·DB 영향: Journey 시작 시 시드 TasteProfile과 시작 질문으로 JourneyProfileSnapshot을 생성한다. `TASTE_ANALYSIS` AIExecution은 생성하지 않는다.
- MVP 이후: 실제 행동 수집과 프로필 갱신 주기가 정의되면 비동기 Taste Analyzer를 검토한다.

### D19. staffSummary 생성 위치

**상태: 확정**

- 결정: `staffSummary`는 Journey Result AI 응답에 포함한다.
- 선택 이유: 최종 선택과 Signature를 해석하는 같은 문맥에서 한 번에 생성해 호출 중복을 제거하기 위함이다.
- API·DB 영향: Journey Result 출력 스키마와 deterministic fallback 모두 staffSummary를 필수로 생성한다. 별도 STAFF_SUMMARY 호출은 하지 않는다.
- MVP 이후: 직원 화면 요구가 복잡해지면 비동기 재생성이나 버전 관리를 검토한다.

### D20. AIExecution 최소 로그

**상태: 확정**

- 결정: AIExecution에 온라인 행동 원본, 이메일, 전체 prompt와 전체 AI 응답 JSON을 저장하지 않는다.
- 선택 이유: 가상 데이터 MVP에서도 불필요한 개인정보·행동 데이터 복제와 디버그 로그 노출을 줄이기 위함이다.
- API·DB 영향: `requestJson`에는 stage, 후보 수, 선택 수 같은 비식별 메타데이터만 저장한다. `responseJson`에는 선택된 ID와 검증 결과 등 축약 정보만 저장하거나 null을 사용한다. `errorMessage`는 정규화된 오류 코드만 저장한다.
- MVP 이후: 운영 관측이 필요하면 보존 기간, 접근 통제와 redaction 정책을 먼저 정의한다.

## 4. 추가 확정 결정

### D21. SQLite 실행 환경

**상태: 확정**

- 결정: 단일 Node 서버가 SQLite를 사용하며 DB 파일은 `prisma/dev.db`에 둔다.
- 영향: 다중 서버 인스턴스와 serverless 다중 writer는 MVP 대상이 아니다.
- MVP 이후: 공개 운영 환경의 동시성과 영속성 요구가 생기면 배포 토폴로지와 DB를 재검토한다.

### D22. 캐릭터 레이어 규격

**상태: 확정**

- 결정: 모든 캐릭터 에셋은 동일 캔버스 규격을 사용하고 위치 보정 DB 필드를 추가하지 않는다.
- 영향: Product의 `personaLayerUrl`과 `sceneBackgroundKey`만 사용하며 `personaLayerPosition`은 추가하지 않는다.
- MVP 이후: 제품별 위치 조절이 필요해질 때 에셋 매니페스트 또는 별도 레이아웃 모델을 검토한다.

### D23. 후순위 기능

**상태: 확정**

- 결정: QR 카메라 인식, history, SHOES 전용 분기와 복잡한 동의 철회 기능은 최초 MVP 범위에서 제외한다.
- 영향: 수동 코드 체크인을 기본 대체 경로로 제공하고, 고정 시연 stage만 구현한다.
- MVP 이후: 핵심 Journey와 실패 복구가 안정된 뒤 사용자 가치와 시연 필요성 순으로 추가한다.

## 5. 결정으로 해소된 기존 검토 항목

다음 항목은 더 이상 미결정 상태가 아니다.

- 예약과 질문 저장 순서: D1로 해소
- Journey 생성 책임 중복: D2, D3으로 해소
- AI 정상/fallback 구조 불일치: D5, D6으로 해소
- 필드명 기준 충돌: D4로 해소
- INTRO 저장 방식: D8로 해소
- 선택·next·finish transaction 경계: D9~D11로 해소
- 새로고침 복구 계약: D12로 해소
- 데모 사용자와 직원 권한: D13, D14로 해소
- QR와 수동 코드 관계: D15로 해소
- 결과 save API 중복: D16으로 해소
- AI 호출 범위와 staffSummary: D17~D19로 해소
- AI 상세 로그 개인정보 위험: D20으로 해소
- SQLite 실행 위치: D21로 해소
- 캐릭터 위치 필드: D22로 해소
- 후순위 MVP 범위: D23으로 해소

## 6. 문서 우선순위

구현 중 문서가 충돌하면 다음 순서로 해석한다.

1. `DESIGN_DECISIONS.md`의 확정 결정
2. `API_SPEC.md`와 `AI_FLOW.md`의 계약
3. `DATABASE_SCHEMA.md`의 필드, enum과 관계
4. `IMPLEMENTATION_PLAN.md`
5. `SYSTEM_DESIGN_V1.md`

기존 문서는 이력과 설계 배경으로 유지하며 이번 단계에서는 수정하지 않는다.

## 7. 남아 있는 비차단 의사결정

구현 1단계 착수를 막는 설계 의사결정은 남아 있지 않다. 다음 항목은 해당 구현 단계에서 고정해도 API·DB 계약을 바꾸지 않는다.

- Journey 후보 `ruleScore`의 세부 가중치
- 사용할 AI model 식별자, 요청 timeout 값과 promptVersion 문자열
- Journey Step·Result prompt의 최종 한국어 문구
- `consentVersion`의 초기 상수 값
- `personaBaseKey`, 기본 배경과 정적 에셋 파일명
- 개발 전용 reset 기능을 활성화할 환경변수 이름

이 항목을 결정할 때도 후보 경계, 출력 Zod schema, 상태 전이와 개인정보 로그 정책은 변경하지 않는다.

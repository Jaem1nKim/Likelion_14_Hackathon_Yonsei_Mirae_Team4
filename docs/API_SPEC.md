# MCM Journey Passport API Specification

## 1. 목적과 범위

이 문서는 MCM Journey Passport MVP의 React 프론트엔드와 Express 백엔드 사이 REST 계약을 정의한다. 총 **25개 API**를 확정한다.

이 문서의 필드명과 enum은 `DATABASE_SCHEMA.md`를 기준으로 하며, `DESIGN_DECISIONS.md`의 D1~D23을 반영한다.

MVP에서 명시적으로 제외하는 API는 다음과 같다.

- 외부용 `POST /api/journeys`
- `POST /api/journeys/:journeyId/result/save`
- QR 카메라 인식 전용 API
- history API와 화면
- 실제 인증, 결제, 주문, NFC, 실시간 재고 API
- 관리자 CRUD API

## 2. 공통 규칙

### 2.1 Base URL과 데이터 형식

- Base path: `/api`
- Request/response media type: `application/json`
- DateTime: UTC 기준 ISO 8601 문자열. 예: `2026-08-03T09:30:00.000Z`
- ID: UUID 또는 CUID 형식의 String
- 가격: `priceKrw` 원 단위 Int
- optional 값: 값이 없으면 `null`; 필드 자체를 임의로 생략하지 않는다.
- 목록: 결과가 없으면 빈 배열 `[]`을 반환한다.
- MVP 목록 API는 pagination을 사용하지 않는다.

### 2.2 성공 envelope

```ts
type ApiSuccess<T> = {
  data: T;
};
```

### 2.3 오류 envelope

```ts
type ApiError = {
  error: {
    code: ApiErrorCode;
    message: string;
    details: Array<{
      path: string;
      reason: string;
    }> | null;
  };
};
```

```ts
type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "DEMO_USER_REQUIRED"
  | "DEMO_USER_NOT_FOUND"
  | "FORBIDDEN"
  | "RESOURCE_NOT_FOUND"
  | "CONSENT_REQUIRED"
  | "INVALID_STATE"
  | "RESOURCE_CONFLICT"
  | "STALE_JOURNEY_STEP"
  | "PRODUCT_NOT_ELIGIBLE"
  | "NO_ELIGIBLE_CANDIDATES"
  | "MINIMUM_SELECTION_REQUIRED"
  | "RESULT_NOT_READY"
  | "DEV_ENDPOINT_DISABLED"
  | "INTERNAL_ERROR";
```

| HTTP | 오류 코드 | 의미 |
|---:|---|---|
| 400 | VALIDATION_ERROR | header, path, query 또는 body 형식 오류 |
| 401 | DEMO_USER_REQUIRED, DEMO_USER_NOT_FOUND | 데모 사용자 헤더 누락 또는 비활성/존재하지 않는 사용자 |
| 403 | FORBIDDEN, CONSENT_REQUIRED | 소유권·역할 위반 또는 Journey 동의 없음 |
| 404 | RESOURCE_NOT_FOUND | 요청한 리소스 없음 |
| 409 | INVALID_STATE, RESOURCE_CONFLICT, STALE_JOURNEY_STEP, PRODUCT_NOT_ELIGIBLE, NO_ELIGIBLE_CANDIDATES, MINIMUM_SELECTION_REQUIRED, RESULT_NOT_READY | 현재 상태에서 요청 수행 불가 |
| 404 | DEV_ENDPOINT_DISABLED | 개발 전용 endpoint가 비활성 환경임 |
| 500 | INTERNAL_ERROR | 복구하지 못한 서버 내부 오류 |

AI 호출 실패, timeout과 AI 응답 검증 실패는 deterministic fallback으로 처리하므로 그 자체를 API 오류로 반환하지 않는다.

모든 endpoint는 명시된 도메인 오류 외에 복구 불가능한 서버 오류가 발생하면 `500 INTERNAL_ERROR`를 반환할 수 있다.

### 2.4 데모 사용자 헤더

```http
X-Demo-User-Id: <User.id>
```

- 프론트는 `POST /api/demo/login` 성공 후 User.id를 localStorage에 저장한다.
- 보호 API 호출 시 같은 ID를 `X-Demo-User-Id`로 전달한다.
- 이 헤더는 실제 인증 token이 아니다.
- 백엔드는 해당 User가 존재하고 `isActive = true`인지 확인한다.
- 고객 소유 API는 header User.id와 리소스의 `userId`가 같아야 한다.
- 직원 API는 header User의 `role = STAFF`를 추가로 확인한다.

### 2.5 접근 범위

| 범위 | 의미 |
|---|---|
| PUBLIC | 헤더 없이 접근 가능 |
| DEMO | 활성 데모 사용자 헤더 필요 |
| OWNER | 활성 CUSTOMER이며 리소스 userId와 헤더 ID가 같아야 함 |
| STAFF | 활성 STAFF 역할 필요 |
| OWNER_OR_STAFF | 소유 CUSTOMER 또는 STAFF |
| DEV_STAFF | 개발 환경이며 STAFF 역할 필요 |

### 2.6 공통 enum

```ts
type UserRole = "CUSTOMER" | "STAFF";
type ProductCategory = "BAG" | "APPAREL" | "SHOES" | "ACCESSORY";
type ReservationStatus = "RESERVED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "EXPIRED";
type JourneyStatus = "READY" | "ACTIVE" | "FINISHED" | "CANCELLED";
type JourneyStage = "INTRO" | "BAG" | "APPAREL" | "SHOES" | "ACCESSORY" | "RESULT";
type JourneyStepStatus = "GENERATED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
type InteractionType = "VIEWED" | "COMPARED" | "SELECTED" | "REJECTED" | "DESELECTED";
type RecommendationType = "MATCH" | "COMPARE" | "CHALLENGE";
type PreferenceType = "CATEGORY" | "COLOR" | "STYLE" | "MATERIAL" | "FUNCTION";
type ProductTagType = "STYLE" | "FUNCTION" | "SILHOUETTE" | "MOOD";
```

SHOES는 schema 호환성을 위해 enum에 유지하지만 최초 MVP의 `/next` 전이에는 사용하지 않는다.

## 3. 공통 응답 타입

### 3.1 User와 취향

```ts
type DemoUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profileType: string | null;
  avatarUrl: string | null;
};

type TastePreferenceView = {
  type: PreferenceType;
  value: string;
  score: number;
  source: string;
};

type TasteProfileView = {
  id: string;
  userId: string;
  summary: string;
  practicalityScore: number;
  expressionScore: number;
  noveltyScore: number;
  confidenceScore: number;
  calculatedAt: string;
  updatedAt: string;
  preferences: TastePreferenceView[];
};

type UserProfileResponse = {
  user: DemoUser;
  tasteProfile: TasteProfileView;
};
```

### 3.2 Consent

```ts
type ConsentView = {
  id: string;
  userId: string;
  consentVersion: string;
  behaviorDataAllowed: boolean;
  journeyDataAllowed: boolean;
  marketingAllowed: false;
  agreedAt: string;
  withdrawnAt: null;
};

type ConsentResponse = {
  currentConsent: ConsentView | null;
};
```

복잡한 철회 기능은 후순위이므로 MVP API는 `withdrawnAt`을 입력받지 않는다. `marketingAllowed`는 항상 false다.

### 3.3 Store, Zone과 Product

```ts
type StoreView = {
  id: string;
  code: string;
  name: string;
  location: string;
  description: string | null;
  imageUrl: string | null;
  isJourneyEnabled: boolean;
};

type StoreZoneView = {
  id: string;
  storeId: string;
  code: string;
  name: string;
  category: ProductCategory;
  floor: string | null;
  directionText: string;
  heritageTitle: string | null;
  heritageStory: string | null;
  displayOrder: number;
};

type ProductTagView = {
  type: ProductTagType;
  name: string;
  score: number;
  verified: boolean;
};

type ProductView = {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  color: string;
  material: string | null;
  priceKrw: number;
  size: string | null;
  capacity: string | null;
  wearMethod: string | null;
  description: string;
  imageUrl: string;
  personaLayerUrl: string | null;
  sceneBackgroundKey: string | null;
  tags: ProductTagView[];
};

type StoreProductView = ProductView & {
  inventory: {
    storeId: string;
    zoneId: string;
    quantity: number;
    isDisplayAvailable: boolean;
  };
};
```

### 3.4 Reservation

```ts
type ReservationView = {
  id: string;
  userId: string;
  store: StoreView;
  reservedAt: string;
  startQuestionCode: string;
  startAnswerCode: string;
  startAnswerLabel: string;
  qrToken: string;
  reservationCode: string;
  status: ReservationStatus;
  checkedInAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type JourneyReservationSummary = Omit<ReservationView, "qrToken" | "reservationCode">;
```

`qrToken`은 32자 이상의 추측하기 어려운 불투명 문자열이다. `reservationCode`는 대문자 영문과 숫자로 구성된 8자 고유 코드다.

### 3.5 Journey aggregate

```ts
type JourneyProfileSnapshotView = {
  longTermTasteSummary: string;
  todayIntentSummary: string;
  practicalityScore: number;
  expressionScore: number;
  noveltyScore: number;
  preferences: Array<{
    type: PreferenceType;
    value: string;
    score: number;
  }>;
};

type StepRecommendationView = {
  id: string;
  type: RecommendationType;
  rank: number;
  ruleScore: number;
  reason: string;
  isAiSelected: boolean;
  product: ProductView;
};

type ProductInteractionView = {
  id: string;
  journeyStepId: string;
  productId: string;
  type: InteractionType;
  sequence: number;
  createdAt: string;
};

type JourneyStepView = {
  id: string;
  journeyId: string;
  stepNumber: number;
  stage: JourneyStage;
  status: JourneyStepStatus;
  scenarioTitle: string;
  scenarioText: string;
  zone: StoreZoneView;
  heritageTitle: string | null;
  heritageText: string | null;
  selectedProduct: ProductView | null;
  canFinishJourney: boolean;
  usedFallback: boolean;
  recommendations: StepRecommendationView[];
  createdAt: string;
  completedAt: string | null;
};

type JourneyView = {
  id: string;
  userId: string;
  reservationId: string;
  storeId: string;
  status: JourneyStatus;
  currentStage: JourneyStage;
  currentStepNumber: number;
  startedAt: string | null;
  finishedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type JourneyResultItemView = {
  id: string;
  product: ProductView;
  category: ProductCategory;
  selectionOrder: number;
  recommendationReason: string;
  personaLayerUrl: string | null;
};

type CustomerJourneyResultView = {
  id: string;
  journeyId: string;
  signatureName: string;
  signatureStory: string;
  finalLookSummary: string;
  personaBaseKey: string | null;
  sceneKey: string | null;
  shareToken: string;
  usedFallback: boolean;
  items: JourneyResultItemView[];
  createdAt: string;
  updatedAt: string;
};

type JourneyAggregate = {
  journey: JourneyView;
  reservation: JourneyReservationSummary;
  profileSnapshot: JourneyProfileSnapshotView | null;
  currentStep: JourneyStepView | null;
  completedSteps: JourneyStepView[];
  interactions: ProductInteractionView[];
  canFinishJourney: boolean;
  result: CustomerJourneyResultView | null;
};
```

### 3.6 Journey 상태 판별 규칙

프론트는 API에서 경로 문자열을 받지 않는다. shared의 route 결정 함수가 다음 필드만 사용한다.

| 서버 상태 | 판별 조건 | 프론트 의미 |
|---|---|---|
| 체크인 후 READY | `status=READY`, `currentStage=INTRO`, `currentStepNumber=0`, `currentStep=null` | Intro/시작 화면 |
| BAG 진행 중 | `status=ACTIVE`, `currentStage=BAG` | BAG 선택 흐름 |
| APPAREL 진행 중 | `status=ACTIVE`, `currentStage=APPAREL` | APPAREL 선택 흐름 |
| ACCESSORY 진행 중 | `status=ACTIVE`, `currentStage=ACCESSORY` | ACCESSORY 선택 흐름 |
| 종료 가능 | `status=ACTIVE`, `canFinishJourney=true` | 계속 또는 종료 결정 가능 |
| 결과 완료 | `status=FINISHED`, `currentStage=RESULT`, `result!=null` | 결과 화면 |

ACTIVE 상태에서는 `currentStep`이 반드시 존재하고 `currentStep.stepNumber = journey.currentStepNumber`, `currentStep.stage = journey.currentStage`여야 한다.

`canFinishJourney`는 AI가 아니라 서버가 최종 선택 상태로 계산한다. BAG 1개와 APPAREL 또는 ACCESSORY 1개 이상이 최종 선택된 경우 true다. 최초 시연은 APPAREL에서 계속을 선택해 ACCESSORY까지 진행한다.

top-level `JourneyAggregate.canFinishJourney`는 **현재 저장된 최종 선택만으로 지금 finish 가능한지**를 뜻한다. `JourneyStep.canFinishJourney`는 DB 문서의 정의대로 **현재 Step에서 제품을 선택해 완료한 뒤 finish 가능한 stage인지**를 뜻한다. 따라서 APPAREL Step은 생성 시 `JourneyStep.canFinishJourney=true`일 수 있지만, 제품을 선택하기 전 top-level 값은 false다.

FINISHED 상태에서는 `currentStage=RESULT`, `currentStep=null`, `result!=null`이다. `currentStepNumber`는 마지막 실제 JourneyStep 번호를 유지한다.

## 4. Endpoint 목록

| # | Method | URL | 접근 |
|---:|---|---|---|
| 1 | GET | `/api/health` | PUBLIC |
| 2 | GET | `/api/demo/users` | PUBLIC |
| 3 | POST | `/api/demo/login` | PUBLIC |
| 4 | GET | `/api/users/:userId/profile` | OWNER |
| 5 | GET | `/api/users/:userId/consent` | OWNER |
| 6 | PUT | `/api/users/:userId/consent` | OWNER |
| 7 | GET | `/api/stores` | DEMO |
| 8 | GET | `/api/stores/:storeId` | DEMO |
| 9 | GET | `/api/stores/:storeId/zones` | DEMO |
| 10 | GET | `/api/stores/:storeId/products` | DEMO |
| 11 | GET | `/api/products/:productId` | DEMO |
| 12 | POST | `/api/reservations` | OWNER |
| 13 | GET | `/api/reservations/:reservationId` | OWNER_OR_STAFF |
| 14 | GET | `/api/reservations/code/:reservationCode` | OWNER_OR_STAFF |
| 15 | POST | `/api/reservations/check-in` | OWNER_OR_STAFF |
| 16 | POST | `/api/journeys/:journeyId/start` | OWNER |
| 17 | GET | `/api/journeys/:journeyId` | OWNER |
| 18 | POST | `/api/journeys/:journeyId/interactions` | OWNER |
| 19 | POST | `/api/journeys/:journeyId/next` | OWNER |
| 20 | POST | `/api/journeys/:journeyId/finish` | OWNER |
| 21 | GET | `/api/journeys/:journeyId/result` | OWNER |
| 22 | GET | `/api/share/:shareToken` | PUBLIC |
| 23 | GET | `/api/staff/reservations` | STAFF |
| 24 | GET | `/api/staff/journeys/:journeyId` | STAFF |
| 25 | POST | `/api/dev/reset-demo` | DEV_STAFF |

## 5. 공통 및 데모 사용자 API

### 5.1 GET `/api/health`

- 용도: 서버와 DB 연결 상태 확인
- 요청 헤더: 없음
- path/query/body: 없음
- 허용 상태: 제한 없음
- 접근: PUBLIC

성공 `200`:

```json
{
  "data": {
    "status": "ok",
    "database": "connected",
    "timestamp": "2026-08-03T09:30:00.000Z"
  }
}
```

- 오류: `500 INTERNAL_ERROR`
- 상태 전이: 없음
- idempotency: safe, 반복 호출은 상태를 변경하지 않음
- transaction: DB 연결 확인용 단일 read; transaction 없음

### 5.2 GET `/api/demo/users`

- 용도: 로그인 화면에서 선택할 활성 가상 사용자 조회
- 요청 헤더: 없음
- query: `role?: UserRole`; 생략 시 CUSTOMER와 STAFF 모두
- path/body: 없음
- 허용 상태: 제한 없음
- 접근: PUBLIC, 데모 환경 전용 목록

성공 `200`: `ApiSuccess<DemoUser[]>`

- 오류: `400 VALIDATION_ERROR`, `500 INTERNAL_ERROR`
- 상태 전이: 없음
- idempotency: safe
- transaction: 단일 read

### 5.3 POST `/api/demo/login`

- 용도: 선택한 데모 사용자가 활성 상태인지 검증하고 localStorage에 보관할 사용자 정보를 반환
- 요청 헤더: `Content-Type: application/json`
- path/query: 없음
- 접근: PUBLIC

body:

```ts
type DemoLoginRequest = {
  userId: string;
};
```

성공 `200`: `ApiSuccess<DemoUser>`

- 오류: `400 VALIDATION_ERROR`, `401 DEMO_USER_NOT_FOUND`
- 허용 상태: `User.isActive=true`
- 상태 전이: 없음; 서버 세션과 token을 만들지 않음
- idempotency: 같은 userId 반복 호출은 같은 현재 사용자 정보를 반환
- transaction: 단일 read

### 5.4 GET `/api/users/:userId/profile`

- 용도: 가상 고객과 시드 TasteProfile 조회
- 요청 헤더: `X-Demo-User-Id` 필수
- path: `userId: string`
- query/body: 없음
- 접근: OWNER; header ID와 path userId가 같아야 하며 CUSTOMER여야 함

성공 `200`: `ApiSuccess<UserProfileResponse>`

- 오류: `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `403 FORBIDDEN`, `404 RESOURCE_NOT_FOUND`
- 허용 상태: 활성 CUSTOMER와 TasteProfile 존재
- 상태 전이: 없음
- idempotency: safe
- transaction: User, TasteProfile, TastePreference read

## 6. 동의 API

### 6.1 GET `/api/users/:userId/consent`

- 용도: 가장 최근의 유효 동의 조회
- 요청 헤더: `X-Demo-User-Id` 필수
- path: `userId: string`
- query/body: 없음
- 접근: OWNER

성공 `200`: `ApiSuccess<ConsentResponse>`; 동의 이력이 없으면 `currentConsent=null`

- 오류: `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `403 FORBIDDEN`
- 허용 상태: 활성 CUSTOMER
- 상태 전이: 없음
- idempotency: safe
- transaction: 최신 `withdrawnAt=null` Consent read

### 6.2 PUT `/api/users/:userId/consent`

- 용도: MVP에서 사용할 현재 동의 값을 기록
- 요청 헤더: `X-Demo-User-Id`, `Content-Type` 필수
- path: `userId: string`
- query: 없음
- 접근: OWNER

body:

```ts
type PutConsentRequest = {
  behaviorDataAllowed: boolean;
  journeyDataAllowed: boolean;
};
```

성공 `200`: `ApiSuccess<ConsentResponse>`

- 오류: `400 VALIDATION_ERROR`, `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `403 FORBIDDEN`
- 허용 상태: 활성 CUSTOMER
- 상태 전이: 현재 유효 동의와 값이 다르면 새 Consent 행 생성. 같으면 기존 행 반환. `marketingAllowed=false`, `withdrawnAt=null` 고정.
- idempotency: 같은 body를 반복하면 중복 Consent를 만들지 않고 현재 행 반환
- transaction: 최신 동의 조회와 필요 시 새 행 생성을 한 transaction에서 처리

## 7. 매장과 제품 API

### 7.1 GET `/api/stores`

- 용도: Journey 예약 가능한 활성 매장 목록 조회
- 요청 헤더: `X-Demo-User-Id` 필수
- path/query/body: 없음
- 접근: DEMO

성공 `200`: `ApiSuccess<StoreView[]>`

- 오류: `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`
- 허용 상태: `Store.isActive=true`, `isJourneyEnabled=true`
- 상태 전이: 없음
- idempotency: safe
- transaction: 단일 read

### 7.2 GET `/api/stores/:storeId`

- 용도: 예약 및 Passport에 표시할 매장 상세 조회
- 요청 헤더: `X-Demo-User-Id` 필수
- path: `storeId: string`
- query/body: 없음
- 접근: DEMO

성공 `200`: `ApiSuccess<StoreView>`

- 오류: `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `404 RESOURCE_NOT_FOUND`
- 허용 상태: 활성 매장
- 상태 전이: 없음
- idempotency: safe
- transaction: 단일 read

### 7.3 GET `/api/stores/:storeId/zones`

- 용도: 매장 구역, 이동 안내와 브랜드 헤리티지 조회
- 요청 헤더: `X-Demo-User-Id` 필수
- path: `storeId: string`
- query/body: 없음
- 접근: DEMO

성공 `200`: `ApiSuccess<StoreZoneView[]>`; `displayOrder` 오름차순

- 오류: `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `404 RESOURCE_NOT_FOUND`
- 허용 상태: 활성 매장의 `StoreZone.isActive=true`
- 상태 전이: 없음
- idempotency: safe
- transaction: Store 존재 확인과 Zone read

### 7.4 GET `/api/stores/:storeId/products`

- 용도: 해당 매장에서 체험 가능한 제품 조회; 추천 후보 계산 자체는 서버 Journey 서비스가 별도로 수행
- 요청 헤더: `X-Demo-User-Id` 필수
- path: `storeId: string`
- query: `category?: ProductCategory`, `zoneId?: string`
- body: 없음
- 접근: DEMO

성공 `200`: `ApiSuccess<StoreProductView[]>`; 기본 정렬은 category, Product.name

- 오류: `400 VALIDATION_ERROR`, `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `404 RESOURCE_NOT_FOUND`
- 허용 상태: Product/Store/Zone 활성, `quantity>0`, `isDisplayAvailable=true`
- 상태 전이: 없음
- idempotency: safe
- transaction: Store, Inventory, Zone, Product와 Tag read

### 7.5 GET `/api/products/:productId`

- 용도: 제품 카드 상세 조회
- 요청 헤더: `X-Demo-User-Id` 필수
- path: `productId: string`
- query/body: 없음
- 접근: DEMO

성공 `200`: `ApiSuccess<ProductView>`

- 오류: `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `404 RESOURCE_NOT_FOUND`
- 허용 상태: `Product.isActive=true`
- 상태 전이: 없음
- idempotency: safe
- transaction: Product와 Tag read

## 8. 예약과 체크인 API

### 8.1 POST `/api/reservations`

- 용도: 매장, 일시와 시작 질문을 한 번에 저장하고 Passport 토큰 발급
- 요청 헤더: `X-Demo-User-Id`, `Content-Type`, `Idempotency-Key` 필수
- `Idempotency-Key`: 클라이언트가 생성한 UUID이며 첫 생성 시 `Reservation.id`로 사용
- path/query: 없음
- 접근: OWNER

body:

```ts
type CreateReservationRequest = {
  storeId: string;
  reservedAt: string;
  startQuestionCode: string;
  startAnswerCode: string;
  startAnswerLabel: string;
};
```

성공:

- 최초 생성 `201`: `ApiSuccess<ReservationView>`
- 같은 Idempotency-Key와 같은 body 재요청 `200`: 기존 `ReservationView`

- 오류: `400 VALIDATION_ERROR`, `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `403 FORBIDDEN`, `403 CONSENT_REQUIRED`, `404 RESOURCE_NOT_FOUND`, `409 RESOURCE_CONFLICT`
- 허용 상태: 활성 CUSTOMER, 활성 Journey 매장, 최신 동의의 `journeyDataAllowed=true`
- 상태 전이: 새 Reservation을 `RESERVED`로 생성
- idempotency: 같은 key와 다른 body면 `409 RESOURCE_CONFLICT`; 같은 key와 같은 body면 기존 행 반환
- transaction: User·Consent·Store 재검증, `qrToken`과 `reservationCode` 고유 생성, Reservation insert를 한 transaction에서 처리

### 8.2 GET `/api/reservations/:reservationId`

- 용도: Passport와 체크인 전 예약 상세 조회
- 요청 헤더: `X-Demo-User-Id` 필수
- path: `reservationId: string`
- query/body: 없음
- 접근: OWNER_OR_STAFF; OWNER 응답과 STAFF 응답 모두 ReservationView 사용

성공 `200`: `ApiSuccess<ReservationView>`

- 오류: `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `403 FORBIDDEN`, `404 RESOURCE_NOT_FOUND`
- 허용 상태: 모든 ReservationStatus
- 상태 전이: 없음
- idempotency: safe
- transaction: 단일 aggregate read

### 8.3 GET `/api/reservations/code/:reservationCode`

- 용도: 짧은 수동 코드로 예약 확인
- 요청 헤더: `X-Demo-User-Id` 필수
- path: `reservationCode: string`; `^[A-Z0-9]{8}$`
- query/body: 없음
- 접근: OWNER_OR_STAFF

성공 `200`: `ApiSuccess<ReservationView>`

- 오류: `400 VALIDATION_ERROR`, `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `403 FORBIDDEN`, `404 RESOURCE_NOT_FOUND`
- 허용 상태: 모든 ReservationStatus; 실제 체크인 가능 여부는 check-in에서 재검증
- 상태 전이: 없음
- idempotency: safe
- transaction: unique reservationCode read

Express router에서는 고정 segment인 `/code/:reservationCode`를 동적 `/:reservationId`보다 먼저 등록해야 한다.

### 8.4 POST `/api/reservations/check-in`

- 용도: QR 또는 수동 코드로 체크인하고 READY Journey를 생성하거나 기존 Journey 반환
- 요청 헤더: `X-Demo-User-Id`, `Content-Type` 필수
- path/query: 없음
- 접근: OWNER_OR_STAFF

body는 두 값 중 정확히 하나만 허용한다.

```ts
type CheckInRequest =
  | { qrToken: string; reservationCode?: never }
  | { qrToken?: never; reservationCode: string };
```

성공 `200`: `ApiSuccess<JourneyAggregate>`

- 오류: `400 VALIDATION_ERROR`, `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `403 FORBIDDEN`, `404 RESOURCE_NOT_FOUND`, `409 INVALID_STATE`
- 허용 상태:
  - `RESERVED`: 체크인 수행
  - `CHECKED_IN`: 기존 Journey 반환
  - `COMPLETED`: 기존 FINISHED Journey 반환
  - `CANCELLED`, `EXPIRED`: `409 INVALID_STATE`
- 상태 전이: 최초 성공 시 Reservation `RESERVED → CHECKED_IN`, Journey `READY/currentStage=INTRO/currentStepNumber=0` 생성
- idempotency: Reservation의 기존 Journey가 있으면 새로 만들지 않고 현재 aggregate 반환
- transaction: Reservation 조회·상태/소유권 검증, 상태 갱신, `reservationId` unique Journey create-or-read를 한 transaction에서 처리. aggregate read는 commit 후 수행.

## 9. Journey API

### 9.1 POST `/api/journeys/:journeyId/start`

- 용도: READY Journey의 Snapshot과 첫 BAG 단계 생성
- 요청 헤더: `X-Demo-User-Id`, `Content-Type` 필수
- path: `journeyId: string`
- query/body: 없음
- 접근: OWNER

성공 `200`: `ApiSuccess<JourneyAggregate>`

- 오류: `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `403 FORBIDDEN`, `404 RESOURCE_NOT_FOUND`, `409 INVALID_STATE`, `409 NO_ELIGIBLE_CANDIDATES`
- 허용 상태:
  - `READY/INTRO/0`: 새 BAG 단계 생성
  - `ACTIVE/BAG/1`: 이미 생성된 첫 단계 반환; start 재시도로 간주
  - 그 외 ACTIVE, FINISHED, CANCELLED: `409 INVALID_STATE`
- 상태 전이: `READY → ACTIVE`, `INTRO → BAG`, `currentStepNumber 0 → 1`, `startedAt` 설정
- idempotency: BAG stepNumber 1이 이미 있으면 중복 Snapshot/Step/Recommendation을 만들지 않음
- transaction 범위:
  1. READY 상태와 TasteProfile·Reservation을 read하고 메모리에서 Snapshot 입력 객체 구성
  2. transaction 밖에서 BAG 후보 계산, AI 최대 2회 또는 fallback 생성
  3. 짧은 transaction으로 상태 재확인, JourneyProfileSnapshot create-or-read, BAG JourneyStep·StepRecommendation 생성, Journey 포인터 갱신

### 9.2 GET `/api/journeys/:journeyId`

- 용도: 새로고침 복구를 위한 전체 Journey aggregate 조회
- 요청 헤더: `X-Demo-User-Id` 필수
- path: `journeyId: string`
- query/body: 없음
- 접근: OWNER

성공 `200`: `ApiSuccess<JourneyAggregate>`

- 오류: `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `403 FORBIDDEN`, `404 RESOURCE_NOT_FOUND`, `500 INTERNAL_ERROR`
- 허용 상태: READY, ACTIVE, FINISHED, CANCELLED 모두 조회 가능
- 상태 전이: 없음
- idempotency: safe
- transaction: 일관된 snapshot read. 결과 조합 시 상태 불변식이 깨져 있으면 부분 응답 대신 `500 INTERNAL_ERROR`를 기록하고 반환.

이 응답은 3.6의 규칙으로 READY, BAG, APPAREL, ACCESSORY, 종료 가능과 FINISHED를 모두 구분해야 한다. API payload에 `/journey/...` 같은 프론트 경로 문자열을 포함하지 않는다.

### 9.3 POST `/api/journeys/:journeyId/interactions`

- 용도: 현재 단계의 제품 조회·비교·선택·거절·선택 취소 저장
- 요청 헤더: `X-Demo-User-Id`, `Content-Type` 필수
- path: `journeyId: string`
- query: 없음
- 접근: OWNER

body:

```ts
type CreateInteractionRequest = {
  interactionId: string; // 클라이언트 생성 UUID, ProductInteraction.id로 사용
  journeyStepId: string;
  productId: string;
  type: InteractionType;
};
```

성공 `200`: `ApiSuccess<JourneyAggregate>`

- 오류: `400 VALIDATION_ERROR`, `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `403 FORBIDDEN`, `404 RESOURCE_NOT_FOUND`, `409 INVALID_STATE`, `409 STALE_JOURNEY_STEP`, `409 PRODUCT_NOT_ELIGIBLE`, `409 RESOURCE_CONFLICT`
- 허용 상태: Journey `ACTIVE`; body journeyStepId가 현재 step이며 step status `IN_PROGRESS`
- 제품 조건: 현재 매장에 있고 활성·재고·전시 가능하며 현재 stage 카테고리와 같아야 함. SELECTED는 추천 후보 또는 같은 구역의 적격 실제 제품을 허용.
- 상태 전이:
  - VIEWED/COMPARED: interaction만 추가
  - REJECTED: interaction 추가; 현재 선택 제품이면 거부
  - SELECTED: 이전 선택이 있으면 서버가 DESELECTED interaction을 먼저 추가하고 새 SELECTED 추가, selectedProductId 갱신
  - DESELECTED: 현재 selectedProductId와 같은 제품만 취소하고 selectedProductId=null
- idempotency: 같은 interactionId 재요청은 payload가 같으면 현재 aggregate 반환, 다르면 `409 RESOURCE_CONFLICT`
- transaction: Journey/현재 step/제품 적격성 재검증, 다음 sequence 할당, 필요한 DESELECTED와 요청 interaction 생성, `selectedProductId` 갱신을 한 transaction에서 처리

### 9.4 POST `/api/journeys/:journeyId/next`

- 용도: 현재 선택을 확정하고 고정 경로의 다음 JourneyStep 생성
- 요청 헤더: `X-Demo-User-Id`, `Content-Type` 필수
- path: `journeyId: string`
- query: 없음
- 접근: OWNER

body:

```ts
type NextJourneyRequest = {
  expectedStepNumber: number;
};
```

성공 `200`: `ApiSuccess<JourneyAggregate>`

- 오류: `400 VALIDATION_ERROR`, `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `403 FORBIDDEN`, `404 RESOURCE_NOT_FOUND`, `409 INVALID_STATE`, `409 STALE_JOURNEY_STEP`, `409 NO_ELIGIBLE_CANDIDATES`
- 허용 상태:
  - ACTIVE/BAG/step 1이며 selectedProductId 존재 → APPAREL 생성
  - ACTIVE/APPAREL/step 2이며 selectedProductId 존재 → ACCESSORY 생성
  - ACCESSORY에서는 next를 허용하지 않고 finish 사용
- 상태 전이:
  - 현재 JourneyStep `IN_PROGRESS → COMPLETED`, `completedAt` 설정
  - BAG → APPAREL 또는 APPAREL → ACCESSORY
  - `currentStepNumber + 1`
- idempotency:
  - 현재 stepNumber가 expectedStepNumber와 같으면 처리
  - 이미 정확히 다음 step으로 이동했고 이전 step이 COMPLETED면 재시도로 보고 현재 aggregate 반환
  - 그보다 더 진행되었거나 다른 stage면 `409 STALE_JOURNEY_STEP`
- transaction 범위:
  1. 현재 상태, selectedProductId와 대상 stage를 read
  2. transaction 밖에서 대상 stage 후보 계산, AI 최대 2회 또는 fallback 생성
  3. transaction에서 상태 재검증, 현재 step 완료, 다음 step·추천 생성, Journey 포인터 갱신

### 9.5 POST `/api/journeys/:journeyId/finish`

- 용도: 최소 완료 조건을 확인하고 Journey Result 자동 생성·저장 후 완료
- 요청 헤더: `X-Demo-User-Id`, `Content-Type` 필수
- path: `journeyId: string`
- query: 없음
- 접근: OWNER

body:

```ts
type FinishJourneyRequest = {
  expectedStepNumber: number;
};
```

성공 `200`: `ApiSuccess<JourneyAggregate>`; 반드시 `status=FINISHED`, `result!=null`

- 오류: `400 VALIDATION_ERROR`, `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `403 FORBIDDEN`, `404 RESOURCE_NOT_FOUND`, `409 INVALID_STATE`, `409 STALE_JOURNEY_STEP`, `409 MINIMUM_SELECTION_REQUIRED`
- 허용 상태:
  - ACTIVE이며 현재 stepNumber가 expectedStepNumber와 같고 `canFinishJourney=true`
  - FINISHED이며 Result 존재: idempotent하게 기존 aggregate 반환
- 상태 전이:
  - 현재 IN_PROGRESS step은 selectedProductId가 있으면 COMPLETED 처리
  - Journey `ACTIVE → FINISHED`, `currentStage=RESULT`, `finishedAt` 설정
  - Reservation `CHECKED_IN → COMPLETED`, `completedAt` 설정
- idempotency: `JourneyResult.journeyId` unique를 사용. FINISHED 재요청은 기존 결과 반환.
- transaction 범위:
  1. 완료 조건과 최종 선택·이력을 read
  2. transaction 밖에서 Journey Result AI 최대 2회 또는 fallback 생성
  3. transaction에서 상태와 선택을 재검증하고 JourneyResult·JourneyResultItem 생성, 현재 step 완료, Journey와 Reservation 완료를 함께 처리

## 10. 결과와 공유 API

### 10.1 GET `/api/journeys/:journeyId/result`

- 용도: 고객의 저장된 Journey Signature 조회
- 요청 헤더: `X-Demo-User-Id` 필수
- path: `journeyId: string`
- query/body: 없음
- 접근: OWNER

성공 `200`: `ApiSuccess<CustomerJourneyResultView>`

- 오류: `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `403 FORBIDDEN`, `404 RESOURCE_NOT_FOUND`, `409 RESULT_NOT_READY`
- 허용 상태: Journey `FINISHED`이며 JourneyResult 존재
- 상태 전이: 없음
- idempotency: safe
- transaction: Result, ResultItem과 Product read

### 10.2 GET `/api/share/:shareToken`

- 용도: 개인정보를 제거한 공개 결과 카드 조회
- 요청 헤더: 없음
- path: `shareToken: string`
- query/body: 없음
- 접근: PUBLIC

공개 타입:

```ts
type SharedJourneyResultView = {
  signatureName: string;
  signatureStory: string;
  finalLookSummary: string;
  sceneKey: string | null;
  items: Array<{
    productId: string;
    name: string;
    category: ProductCategory;
    color: string;
    imageUrl: string;
    recommendationReason: string;
    personaLayerUrl: string | null;
    selectionOrder: number;
  }>;
  createdAt: string;
};
```

성공 `200`: `ApiSuccess<SharedJourneyResultView>`

- 오류: `404 RESOURCE_NOT_FOUND`
- 허용 상태: FINISHED Result와 일치하는 shareToken
- 상태 전이: 없음
- idempotency: safe
- transaction: Result와 ResultItem read
- 제외 필드: userId, 이름, 이메일, profileType, 행동 이력, staffSummary, qrToken, reservationCode, 내부 AI 로그

## 11. 직원 API

### 11.1 GET `/api/staff/reservations`

- 용도: 직원용 예약 및 Journey 진행 현황 조회
- 요청 헤더: `X-Demo-User-Id` 필수
- path/body: 없음
- query:
  - `storeId?: string`
  - `status?: ReservationStatus`
  - `date?: string` (`YYYY-MM-DD`, 생략 시 전체 시드 예약)
- 접근: STAFF

응답 항목:

```ts
type StaffReservationListItem = {
  reservationId: string;
  reservationCode: string;
  reservedAt: string;
  reservationStatus: ReservationStatus;
  store: StoreView;
  customer: {
    id: string;
    name: string;
    profileType: string | null;
  };
  journey: {
    id: string;
    status: JourneyStatus;
    currentStage: JourneyStage;
    currentStepNumber: number;
  } | null;
};
```

성공 `200`: `ApiSuccess<StaffReservationListItem[]>`; `reservedAt` 오름차순

- 오류: `400 VALIDATION_ERROR`, `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `403 FORBIDDEN`, `404 RESOURCE_NOT_FOUND`
- 허용 상태: 활성 STAFF
- 상태 전이: 없음
- idempotency: safe
- transaction: 필터 조건에 따른 Reservation/User/Store/Journey read

### 11.2 GET `/api/staff/journeys/:journeyId`

- 용도: 직원 접객에 필요한 Journey 진행 상태와 최종 요약 조회
- 요청 헤더: `X-Demo-User-Id` 필수
- path: `journeyId: string`
- query/body: 없음
- 접근: STAFF

```ts
type StaffJourneyView = {
  journey: JourneyView;
  reservation: JourneyReservationSummary;
  customer: {
    id: string;
    name: string;
    profileType: string | null;
  };
  profileSnapshot: JourneyProfileSnapshotView | null;
  steps: JourneyStepView[];
  interactions: ProductInteractionView[];
  result: (CustomerJourneyResultView & {
    staffSummary: string;
  }) | null;
};
```

성공 `200`: `ApiSuccess<StaffJourneyView>`

- 오류: `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `403 FORBIDDEN`, `404 RESOURCE_NOT_FOUND`
- 허용 상태: 활성 STAFF; Journey는 READY, ACTIVE, FINISHED, CANCELLED 모두 조회 가능
- 상태 전이: 없음
- idempotency: safe
- transaction: staff용 aggregate read
- 제외 필드: 고객 이메일, OnlineBehavior 원본, `behaviorSummaryJson`, qrToken, AIExecution request/response

## 12. 개발 환경 API

### 12.1 POST `/api/dev/reset-demo`

- 용도: 시연 데이터를 고정 시드 상태로 초기화
- 요청 헤더: `X-Demo-User-Id`, `Content-Type` 필수
- path/query/body: 없음
- 접근: DEV_STAFF; 개발 환경이고 활성 STAFF여야 함

성공 `200`:

```json
{
  "data": {
    "reset": true,
    "completedAt": "2026-08-03T09:30:00.000Z"
  }
}
```

- 오류: `401 DEMO_USER_REQUIRED`, `401 DEMO_USER_NOT_FOUND`, `403 FORBIDDEN`, `404 DEV_ENDPOINT_DISABLED`, `500 INTERNAL_ERROR`
- 허용 상태: 서버가 명시적인 development/demo 모드일 때만
- 상태 전이: 동적 Consent, Reservation, Journey, Step, Interaction, Result와 AIExecution을 정리하고 시드 기준 데이터를 복원
- idempotency: 반복 호출 후 동일한 시드 상태가 되어야 함
- transaction: reset 대상 삭제·복원 전체를 transaction으로 처리. 실패 시 부분 초기화 금지.

## 13. 상태 전이와 transaction 요약

| API | 허용 상태 | 성공 후 상태 | transaction 핵심 |
|---|---|---|---|
| POST reservations | 유효 동의 | Reservation RESERVED | 검증 + token/code + insert |
| POST check-in | RESERVED | Reservation CHECKED_IN + Journey READY/INTRO/0 | 예약 상태 + Journey create-or-read |
| POST start | READY/INTRO/0 | ACTIVE/BAG/1 | Snapshot, Step, 추천, Journey 포인터; AI는 tx 밖 |
| POST interactions | ACTIVE/current IN_PROGRESS | interaction 및 선택 갱신 | Interaction + selectedProductId |
| POST next | ACTIVE/BAG 또는 APPAREL | 다음 stage/step | 현재 완료 + 다음 Step/추천 + 포인터; AI는 tx 밖 |
| POST finish | ACTIVE/canFinish | FINISHED/RESULT + Reservation COMPLETED | Result/Items + Step + Journey + Reservation; AI는 tx 밖 |
| PUT consent | 활성 CUSTOMER | 현재 동의 갱신 | 최신 조회 + 필요 시 insert |
| POST reset-demo | DEV_STAFF | 시드 초기 상태 | 전체 reset 단일 transaction |

## 14. Idempotency 요약

- 모든 GET은 safe하고 idempotent하다.
- demo login과 consent PUT은 같은 입력에 같은 현재 결과를 반환한다.
- Reservation 생성은 `Idempotency-Key`를 Reservation.id로 사용한다.
- check-in은 `Journey.reservationId` unique로 create-or-read한다.
- start는 `(journeyId, stepNumber=1)`과 Snapshot unique로 중복을 막는다.
- interaction은 클라이언트 UUID인 `interactionId`를 ProductInteraction.id로 사용한다.
- next는 `expectedStepNumber`와 `(journeyId, stepNumber)` unique로 재시도를 판별한다.
- finish는 `JourneyResult.journeyId` unique로 기존 결과를 반환한다.
- reset은 반복 후 같은 시드 상태가 되어야 한다.

## 15. 프론트 shared 구현 대상 타입

추후 `packages/shared`에는 최소 다음 타입과 규칙을 그대로 구현한다.

- 공통: `ApiSuccess`, `ApiError`, `ApiErrorCode`
- enum: UserRole, ProductCategory, ReservationStatus, JourneyStatus, JourneyStage, JourneyStepStatus, InteractionType, RecommendationType, PreferenceType, ProductTagType
- 사용자: DemoUser, TasteProfileView, TastePreferenceView, UserProfileResponse
- 동의: ConsentView, ConsentResponse, PutConsentRequest
- 매장·제품: StoreView, StoreZoneView, ProductTagView, ProductView, StoreProductView
- 예약: CreateReservationRequest, ReservationView, CheckInRequest
- Journey: JourneyView, JourneyProfileSnapshotView, JourneyStepView, StepRecommendationView, ProductInteractionView, JourneyAggregate
- mutation: CreateInteractionRequest, NextJourneyRequest, FinishJourneyRequest
- 결과: JourneyResultItemView, CustomerJourneyResultView, SharedJourneyResultView
- 직원: StaffReservationListItem, StaffJourneyView
- 규칙: Journey aggregate에서 화면을 결정하는 순수 route 결정 함수

AI 내부 입력·출력 타입은 `AI_FLOW.md`를 기준으로 하며 API payload와 충돌하지 않아야 한다.

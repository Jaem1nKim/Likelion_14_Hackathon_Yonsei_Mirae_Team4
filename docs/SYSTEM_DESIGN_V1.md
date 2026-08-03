# MCM Journey Passport 전체 시스템 설계 v1

## 1. 설계 목표

MCM Journey Passport는 다음 흐름을 하나의 웹 서비스로 구현합니다.

```text
온라인 취향 데이터
→ 매장 Journey 예약
→ QR 발급
→ 매장 입장
→ 실제 제품 선택
→ AI 시나리오 및 매장 구역 안내
→ 추가 제품 선택
→ Journey 종료 또는 확장
→ Journey Signature 생성
→ 결과 저장 및 직원용 요약
```

핵심은 단순 상품 추천이 아닙니다.

AI가 고객의 온라인 취향, 시작 질문과 매장 내 실제 선택을 분석하고, **다음 제품·매장 구역·시나리오를 함께 결정하는 구조**로 설계합니다.

---

# 2. 해커톤 MVP 범위

## 2.1 반드시 구현할 기능

### 온라인 경험

- 가상 MCM 계정 로그인
- 온라인 행동 데이터 활용 동의
- 가상 온라인 취향 데이터 확인
- 체험 매장 선택
- 예약 날짜와 시간 선택
- 시작 질문 응답
- 예약 QR 발급

### 매장 경험

- QR 스캔 또는 예약 코드 입력
- 고객 취향 데이터 불러오기
- 첫 번째 AI 시나리오 생성
- 추천 가방 3개 제공
- 실제 제품 또는 제품 카드 선택
- 선택 및 거절 이력 저장
- 다음 제품과 매장 구역 안내
- Journey 계속하기 또는 종료하기
- 추가 의류·신발·액세서리 선택

### 결과 경험

- Journey Signature 생성
- 최종 MCM 룩 제공
- 제품별 추천 이유 제공
- 선택한 제품 목록 표시
- 간단한 캐릭터 변화
- 결과 저장
- 공유용 결과 카드
- 직원용 접객 요약

## 2.2 MVP에서 제외할 기능

- 실제 MCM 회원 시스템 연동
- 실제 MCM 웹사이트 행동 추적
- 소셜 로그인
- 실제 결제 및 주문
- 실제 NFC 장치
- 실제 매장 위치 추적
- 완전한 실시간 재고 시스템
- 실사형 가상 피팅
- 실시간 이미지·영상 생성
- 실제 각인 장비 연동
- 복잡한 관리자 대시보드
- 여러 국가 매장 간 Journey 연결

## 2.3 MVP 시연 기준

하나의 시연은 약 3~5분 안에 끝나도록 구성합니다.

```text
로그인
→ 온라인 취향 확인
→ 시작 질문
→ 예약 및 QR
→ 가방 선택
→ AI 시나리오
→ 재킷 선택
→ 액세서리 선택
→ Journey Signature
```

---

# 3. 권장 기술 스택

## 3.1 프론트엔드

| 구분 | 기술 |
|---|---|
| UI 프레임워크 | React |
| 개발 언어 | TypeScript |
| 빌드 도구 | Vite |
| 라우팅 | React Router |
| 상태 관리 | React Context + TanStack Query 또는 기본 Hooks |
| 스타일링 | CSS Modules 또는 일반 CSS |
| API 통신 | Fetch API |
| QR 표시 | QR 생성 라이브러리 |
| QR 인식 | 카메라 스캔 라이브러리 또는 코드 입력 대체 |

### 선택 이유

- 팀이 이미 React와 Vite 구조를 사용해본 경험이 있음
- 화면 단위 분업이 쉬움
- 고객용·매장용·직원용 화면을 하나의 프로젝트에서 구현 가능
- 해커톤에서 빠르게 화면을 수정하고 시연하기 쉬움
- TypeScript를 통해 API 데이터 구조 오류를 줄일 수 있음

## 3.2 백엔드

| 구분 | 기술 |
|---|---|
| 서버 | Node.js |
| 웹 프레임워크 | Express |
| 개발 언어 | TypeScript |
| API 방식 | REST API |
| 입력값 검증 | Zod |
| 인증 | MVP용 데모 세션 |
| AI 연동 | OpenAI API |
| ORM | Prisma |

### 선택 이유

- 기존 React 프로젝트와 같은 JavaScript·TypeScript 생태계 사용
- 프론트엔드와 백엔드 사이의 타입 공유 가능
- AI API 호출과 JSON 처리에 적합
- 화면별 API를 빠르게 구현 가능
- 팀원이 프론트엔드와 백엔드를 오가기 쉬움

## 3.3 데이터베이스

### MVP 기본 선택

```text
Prisma ORM + SQLite
```

### 선택 이유

- 팀원별 로컬 실행이 간단함
- 해커톤용 샘플 데이터를 쉽게 초기화 가능
- 별도의 DB 서버 설정이 필요하지 않음
- Prisma Studio를 이용해 데이터를 확인하기 쉬움
- 이후 PostgreSQL 등으로 변경할 수 있는 구조 유지 가능

### 운영 원칙

초기 개발과 현장 시연은 SQLite를 사용합니다.

공개 배포 단계에서 동시 접속이나 원격 데이터 저장이 반드시 필요해지면 Prisma 모델을 유지하면서 PostgreSQL 기반 환경으로 전환합니다.

## 3.4 AI

```text
OpenAI API
+ 서버 측 프롬프트
+ JSON Schema 기반 구조화 출력
```

### AI가 반환할 기본 구조

```json
{
  "scenarioTitle": "새로운 인상을 향한 이동",
  "scenarioText": "안정적인 이동을 선택했지만...",
  "nextZoneId": "zone-apparel",
  "recommendedProductIds": [
    "product-jacket-01",
    "product-jacket-02",
    "product-jacket-03"
  ],
  "challengeProductId": "product-jacket-03",
  "recommendationReasons": [
    {
      "productId": "product-jacket-01",
      "reason": "선택한 백팩과 안정적인 분위기를 유지합니다."
    }
  ],
  "canFinishJourney": true
}
```

---

# 4. 전체 시스템 구조

```text
┌─────────────────────────────────────┐
│            React Web App            │
│                                     │
│  고객 온라인 화면                   │
│  매장 Journey 화면                  │
│  직원 접객 화면                     │
└─────────────────┬───────────────────┘
                  │ REST API
                  ▼
┌─────────────────────────────────────┐
│       Node.js + Express Server      │
│                                     │
│  예약 서비스                        │
│  Journey 서비스                    │
│  제품 추천 서비스                   │
│  AI Orchestrator                    │
│  결과 생성 서비스                   │
└──────────────┬─────────────┬────────┘
               │             │
               ▼             ▼
┌────────────────────┐  ┌────────────────────┐
│ Prisma + SQLite    │  │ OpenAI API         │
│                    │  │                    │
│ 사용자             │  │ 시나리오 생성      │
│ 제품·매장          │  │ 추천 이유 생성     │
│ 예약               │  │ Signature 생성     │
│ Journey 기록       │  │ 직원 요약 생성     │
└────────────────────┘  └────────────────────┘
```

## 핵심 원칙

### 프론트엔드에서 AI를 직접 호출하지 않음

OpenAI API 키는 반드시 백엔드 환경변수에 저장합니다.

```text
React
→ Express API
→ OpenAI API
```

### AI가 데이터베이스를 직접 검색하지 않음

백엔드가 먼저 사용 가능한 제품을 조회한 뒤, 해당 후보만 AI에게 전달합니다.

```text
DB에서 재고가 있는 제품 조회
→ 규칙 기반 필터링
→ AI에게 후보 제품 전달
→ AI가 전달받은 제품 중 선택
→ 서버가 결과 검증
```

### AI 결과를 그대로 신뢰하지 않음

AI가 반환한 제품 ID와 구역 ID가 실제 데이터베이스에 존재하는지 서버에서 다시 검사합니다.

---

# 5. 서비스 화면 구조

하나의 React 프로젝트 안에서 URL 경로에 따라 고객용, 매장용과 직원용 화면을 분리합니다.

## 5.1 고객용 온라인 화면

| 경로 | 화면 | 주요 기능 |
|---|---|---|
| `/` | 랜딩 페이지 | 서비스 소개, Journey 시작 |
| `/login` | 데모 로그인 | 가상 고객 선택 |
| `/consent` | 정보 활용 동의 | 온라인 행동 데이터 활용 동의 |
| `/profile` | 취향 프로필 | 가상 온라인 취향 데이터 확인 |
| `/reserve` | Journey 예약 | 매장·날짜·시간 선택 |
| `/question` | 시작 질문 | 오늘의 Journey 방향 선택 |
| `/passport/:id` | Journey Passport | 예약 정보와 QR 표시 |
| `/history` | Journey 기록 | 이전 결과 확인 |

## 5.2 매장 Journey 화면

| 경로 | 화면 | 주요 기능 |
|---|---|---|
| `/store/check-in` | 매장 체크인 | QR 인식 또는 코드 입력 |
| `/journey/:id/intro` | 첫 시나리오 | 고객 취향과 Journey 소개 |
| `/journey/:id/select` | 제품 선택 | 후보 제품 비교 및 선택 |
| `/journey/:id/route` | 구역 안내 | 다음 매장 구역과 브랜드 이야기 |
| `/journey/:id/progress` | 진행 상태 | 선택 이력과 캐릭터 변화 |
| `/journey/:id/decision` | 계속·종료 선택 | 스타일 확장 또는 Journey 종료 |
| `/journey/:id/result` | 최종 결과 | Signature와 최종 룩 표시 |

## 5.3 직원용 화면

| 경로 | 화면 | 주요 기능 |
|---|---|---|
| `/staff/reservations` | 예약 목록 | 현재 예약 고객 확인 |
| `/staff/journey/:id` | 고객 요약 | 관심 제품과 Journey 진행 상태 |
| `/staff/journey/:id/result` | 접객 요약 | 추천 설명 포인트와 최종 제품 |

## 5.4 MVP에서 구현하지 않는 관리 화면

상품과 매장 정보는 관리자 화면을 만들지 않고 초기 샘플 데이터로 등록합니다.

```text
prisma/seed.ts
```

이 파일에서 다음 데이터를 생성합니다.

- 가상 사용자
- 매장
- 매장 구역
- 제품
- 스타일 태그
- 재고
- 온라인 행동 기록

---

# 6. 사용자 역할

## 6.1 Customer

- 온라인 취향 확인
- Journey 예약
- 시작 질문 응답
- 실제 제품 선택
- Journey 종료 또는 확장
- 결과 저장 및 공유

## 6.2 Staff

- 예약 고객 확인
- 고객의 핵심 취향 확인
- 고객이 선택한 제품 확인
- AI 접객 요약 확인
- 마지막 제품 체험 지원

## 6.3 Admin

MVP에서는 별도의 관리자 로그인을 만들지 않습니다.

상품과 매장 데이터는 개발자가 시드 데이터로 관리합니다.

---

# 7. 데이터베이스 설계

## 7.1 핵심 엔터티

```text
User
Consent
OnlineBehavior
TasteProfile
Store
StoreZone
Product
ProductTag
Inventory
Reservation
Journey
JourneyStep
ProductInteraction
JourneyResult
```

## 7.2 관계 구조

```text
User
 ├─ Consent
 ├─ OnlineBehavior
 ├─ TasteProfile
 ├─ Reservation
 └─ Journey
      ├─ JourneyStep
      │    └─ ProductInteraction
      └─ JourneyResult

Store
 ├─ StoreZone
 ├─ Inventory
 └─ Reservation

Product
 ├─ ProductTag
 └─ Inventory
```

## 7.3 테이블별 주요 필드

### User

| 필드 | 설명 |
|---|---|
| `id` | 사용자 ID |
| `email` | 데모 이메일 |
| `name` | 고객 이름 |
| `profileType` | 시연용 고객 유형 |
| `createdAt` | 생성 시간 |

### Consent

| 필드 | 설명 |
|---|---|
| `id` | 동의 기록 ID |
| `userId` | 사용자 |
| `behaviorDataAllowed` | 온라인 행동 데이터 활용 동의 |
| `journeyDataAllowed` | Journey 기록 활용 동의 |
| `agreedAt` | 동의 시간 |

### OnlineBehavior

| 필드 | 설명 |
|---|---|
| `id` | 행동 ID |
| `userId` | 사용자 |
| `productId` | 관련 제품 |
| `eventType` | VIEW, REPEAT_VIEW, WISHLIST, CART, PURCHASE |
| `selectedColor` | 확인한 색상 |
| `durationSeconds` | 체류 시간 |
| `createdAt` | 발생 시간 |

### TasteProfile

| 필드 | 설명 |
|---|---|
| `id` | 프로필 ID |
| `userId` | 사용자 |
| `preferredCategories` | 선호 카테고리 |
| `preferredColors` | 선호 색상 |
| `preferredStyles` | 선호 스타일 |
| `practicalityScore` | 실용성 선호 |
| `expressionScore` | 자기표현 선호 |

### Store

| 필드 | 설명 |
|---|---|
| `id` | 매장 ID |
| `name` | 매장 이름 |
| `location` | 매장 위치 |
| `description` | 매장 설명 |

### StoreZone

| 필드 | 설명 |
|---|---|
| `id` | 구역 ID |
| `storeId` | 매장 |
| `name` | 구역 이름 |
| `category` | BAG, APPAREL, SHOES, ACCESSORY |
| `heritageStory` | 해당 구역의 브랜드 이야기 |
| `sequence` | 기본 이동 순서 |

### Product

| 필드 | 설명 |
|---|---|
| `id` | 제품 ID |
| `name` | 제품명 |
| `category` | 제품 카테고리 |
| `color` | 색상 |
| `material` | 소재 |
| `price` | 가격 |
| `size` | 크기 |
| `capacity` | 수납 관련 정보 |
| `wearMethod` | 착용 방식 |
| `imageUrl` | 상품 이미지 |
| `description` | 상품 설명 |

### ProductTag

| 필드 | 설명 |
|---|---|
| `id` | 태그 ID |
| `productId` | 제품 |
| `tagName` | MINIMAL, CLASSIC, BOLD 등 |
| `score` | 태그 강도 |
| `verified` | 담당자 검토 여부 |

### Inventory

| 필드 | 설명 |
|---|---|
| `id` | 재고 ID |
| `storeId` | 매장 |
| `zoneId` | 매장 구역 |
| `productId` | 제품 |
| `quantity` | 수량 |
| `isDisplayAvailable` | 체험 가능 여부 |

### Reservation

| 필드 | 설명 |
|---|---|
| `id` | 예약 ID |
| `userId` | 사용자 |
| `storeId` | 매장 |
| `reservedAt` | 예약 일시 |
| `questionAnswer` | 시작 질문 답변 |
| `qrToken` | QR에 포함할 토큰 |
| `status` | RESERVED, CHECKED_IN, COMPLETED |

### Journey

| 필드 | 설명 |
|---|---|
| `id` | Journey ID |
| `userId` | 사용자 |
| `reservationId` | 예약 |
| `storeId` | 매장 |
| `status` | ACTIVE, FINISHED, CANCELLED |
| `currentStage` | 현재 단계 |
| `startedAt` | 시작 시간 |
| `finishedAt` | 종료 시간 |

### JourneyStep

| 필드 | 설명 |
|---|---|
| `id` | 단계 ID |
| `journeyId` | Journey |
| `stepNumber` | 단계 번호 |
| `stageType` | BAG, APPAREL, SHOES, ACCESSORY |
| `scenarioTitle` | AI 시나리오 제목 |
| `scenarioText` | AI 시나리오 내용 |
| `zoneId` | 안내한 구역 |
| `createdAt` | 생성 시간 |

### ProductInteraction

| 필드 | 설명 |
|---|---|
| `id` | 상호작용 ID |
| `journeyStepId` | Journey 단계 |
| `productId` | 제품 |
| `interactionType` | VIEWED, COMPARED, SELECTED, REJECTED |
| `createdAt` | 발생 시간 |

### JourneyResult

| 필드 | 설명 |
|---|---|
| `id` | 결과 ID |
| `journeyId` | Journey |
| `signatureName` | Journey Signature |
| `signatureStory` | 스타일 서사 |
| `finalLookSummary` | 최종 룩 설명 |
| `staffSummary` | 직원용 접객 요약 |
| `shareToken` | 공유 페이지 토큰 |
| `createdAt` | 생성 시간 |

---

# 8. AI 시스템 설계

## 8.1 AI 처리 구조

AI 기능은 하나의 거대한 프롬프트로 처리하지 않습니다.

다음 네 단계로 분리합니다.

### A. Taste Analyzer

온라인 행동과 시작 질문을 분석합니다.

```text
입력:
- 반복 조회 제품
- 위시리스트
- 선호 색상
- 시작 질문 답변

출력:
- 장기 취향
- 오늘의 방향
- 유지할 취향
- 확장할 취향
```

### B. Product Candidate Engine

AI 호출 전에 백엔드가 규칙 기반으로 제품 후보를 추립니다.

```text
1. 현재 매장에 있는 제품만 조회
2. 체험 가능한 제품만 선택
3. 현재 Journey 단계의 카테고리만 선택
4. 이미 선택하거나 거절한 제품 제외
5. 취향 점수를 기준으로 후보 정렬
6. 상위 후보를 AI에 전달
```

### C. Journey Story Engine

전달받은 후보 제품 안에서 다음 시나리오와 구역을 결정합니다.

```text
입력:
- 고객 취향 요약
- 오늘의 Journey 방향
- 이전 선택
- 이전 거절
- 후보 제품
- 매장 구역
- 브랜드 헤리티지

출력:
- 다음 시나리오
- 다음 구역
- 추천 제품 ID
- 추천 이유
- 도전 제품
```

### D. Signature Generator

Journey가 끝날 때 최종 결과를 만듭니다.

```text
입력:
- 전체 선택 순서
- 선택한 제품 속성
- 시작 질문
- 온라인 취향
- 취향과 다른 선택

출력:
- Journey Signature 이름
- 스타일 서사
- 최종 MCM 룩 설명
- 제품별 추천 이유
- 직원용 접객 요약
```

## 8.2 AI와 규칙 기반 로직의 역할 분리

| 기능 | 처리 방식 |
|---|---|
| 재고 확인 | 규칙 기반 |
| 매장 위치 확인 | 규칙 기반 |
| 제품 카테고리 제한 | 규칙 기반 |
| 이미 거절한 제품 제외 | 규칙 기반 |
| 제품 후보 점수 계산 | 규칙 기반 |
| 다음 시나리오 문장 | AI |
| 선택 의미 해석 | AI |
| 추천 이유 | AI |
| Journey Signature | AI |
| 직원용 접객 요약 | AI |

## 8.3 AI 안전장치

- AI는 서버가 제공한 제품 ID만 선택 가능
- 존재하지 않는 제품명 생성 금지
- 제품 가격 생성 금지
- 재고 수량 생성 금지
- 존재하지 않는 매장 구역 생성 금지
- 결과를 JSON Schema로 검증
- 잘못된 ID가 포함되면 해당 결과 폐기
- AI 호출 실패 시 기본 규칙 기반 결과 사용
- AI 응답 시간 초과 시 재시도는 1회만 수행

## 8.4 AI 실패 시 기본 응답

```json
{
  "scenarioTitle": "다음 스타일을 발견해보세요",
  "scenarioText": "현재 선택한 제품과 어울리는 새로운 제품을 직접 확인해보세요.",
  "nextZoneId": "zone-accessory",
  "recommendedProductIds": [
    "product-accessory-01",
    "product-accessory-02",
    "product-accessory-03"
  ],
  "challengeProductId": "product-accessory-03"
}
```

AI가 실패해도 시연이 멈추지 않도록 반드시 기본 결과를 준비합니다.

---

# 9. REST API 설계

## 9.1 데모 사용자

```http
GET /api/demo/users
POST /api/demo/login
GET /api/users/:userId/profile
```

## 9.2 개인정보 동의

```http
GET  /api/users/:userId/consent
POST /api/users/:userId/consent
```

## 9.3 매장과 제품

```http
GET /api/stores
GET /api/stores/:storeId
GET /api/stores/:storeId/zones
GET /api/stores/:storeId/products
GET /api/products/:productId
```

## 9.4 예약

```http
POST /api/reservations
GET  /api/reservations/:reservationId
GET  /api/users/:userId/reservations
POST /api/reservations/:reservationId/check-in
```

## 9.5 Journey

```http
POST /api/journeys
GET  /api/journeys/:journeyId
POST /api/journeys/:journeyId/start
POST /api/journeys/:journeyId/interactions
POST /api/journeys/:journeyId/next
POST /api/journeys/:journeyId/finish
```

## 9.6 결과

```http
GET  /api/journeys/:journeyId/result
POST /api/journeys/:journeyId/result/save
GET  /api/share/:shareToken
GET  /api/users/:userId/journeys
```

## 9.7 직원용

```http
GET /api/staff/reservations
GET /api/staff/journeys/:journeyId
GET /api/staff/journeys/:journeyId/summary
```

---

# 10. 캐릭터 구현 설계

## 10.1 MVP 방식

실시간 이미지 생성 API를 사용하지 않습니다.

사전에 준비한 이미지 레이어를 선택 결과에 따라 겹쳐 표시합니다.

```text
기본 캐릭터
+ 가방 레이어
+ 의류 레이어
+ 신발 레이어
+ 액세서리 레이어
+ 배경 레이어
```

## 10.2 파일 구조 예시

```text
assets/
└── persona/
    ├── base/
    │   ├── persona-01.png
    │   └── persona-02.png
    ├── bags/
    ├── apparel/
    ├── shoes/
    ├── accessories/
    └── backgrounds/
```

## 10.3 제품과 이미지 연결

Product 데이터에 다음 필드를 추가할 수 있습니다.

```text
personaLayerUrl
personaLayerPosition
sceneBackgroundKey
```

---

# 11. 프로젝트 저장소 구조

```text
mcm-journey-passport/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── api/
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── consent/
│   │   │   │   ├── reservation/
│   │   │   │   ├── journey/
│   │   │   │   ├── persona/
│   │   │   │   ├── result/
│   │   │   │   └── staff/
│   │   │   ├── hooks/
│   │   │   ├── layouts/
│   │   │   ├── pages/
│   │   │   ├── routes/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   └── package.json
│   │
│   └── server/
│       ├── src/
│       │   ├── config/
│       │   ├── controllers/
│       │   ├── middleware/
│       │   ├── repositories/
│       │   ├── routes/
│       │   ├── schemas/
│       │   ├── services/
│       │   │   ├── ai/
│       │   │   ├── journey/
│       │   │   ├── product/
│       │   │   ├── reservation/
│       │   │   └── result/
│       │   ├── types/
│       │   ├── utils/
│       │   └── app.ts
│       └── package.json
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── api-types.ts
│       │   ├── constants.ts
│       │   ├── enums.ts
│       │   └── journey-types.ts
│       └── package.json
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── dev.db
│
├── docs/
│   ├── PROJECT_SPEC.md
│   ├── MVP_SCOPE.md
│   ├── USER_FLOW.md
│   ├── SCREEN_SPEC.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_SPEC.md
│   └── AI_FLOW.md
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

# 12. 상태 관리 설계

## 서버에서 관리할 상태

- 개인정보 활용 동의
- 온라인 행동 데이터
- 예약
- QR 토큰
- Journey 상태
- 현재 Journey 단계
- 제품 선택·거절 기록
- 최종 Journey 결과

## 프론트엔드에서 관리할 임시 상태

- 현재 로그인한 데모 고객
- 화면 로딩 상태
- 선택 중인 제품
- 모달 상태
- 캐릭터 레이어
- QR 카메라 상태

## 새로고침 대응

Journey의 핵심 상태는 항상 서버에 저장합니다.

```text
제품 선택
→ 서버에 ProductInteraction 저장
→ Journey.currentStage 갱신
→ 다음 화면 이동
```

페이지를 새로고침해도 `GET /api/journeys/:id`를 호출해 현재 단계를 복구할 수 있어야 합니다.

---

# 13. 오류 처리 설계

## 필수 오류 상황

- 존재하지 않는 예약 코드
- 이미 사용된 QR
- 예약 시간이 아닌 체크인
- 동의하지 않은 사용자
- 재고가 없는 제품
- 잘못된 제품 ID
- 이전 단계 제품 선택
- AI 응답 실패
- AI 응답 형식 오류
- 네트워크 오류
- Journey가 이미 종료된 상태
- 결과 중복 생성

## 시연 중 오류 방지 기능

- 데모 데이터 초기화 버튼
- AI 사용 여부 전환 기능
- AI 실패 시 기본 응답
- QR 대신 예약 코드 입력 가능
- 모든 Journey를 첫 단계로 되돌리는 개발자 기능
- 시연용 고정 고객 프로필 제공
- 결과 화면 직접 진입용 테스트 데이터 제공

---

# 14. 테스트 전략

## 단위 테스트

- 취향 점수 계산
- 제품 후보 필터링
- 재고 없는 제품 제외
- 거절 제품 제외
- Journey 단계 변경
- AI 응답 검증
- Journey Signature 저장

## API 테스트

- 예약 생성
- 체크인
- Journey 시작
- 제품 선택
- 다음 단계 생성
- Journey 종료
- 결과 조회

## 사용자 흐름 테스트

### 정상 흐름

```text
로그인
→ 동의
→ 예약
→ 체크인
→ 가방 선택
→ 의류 선택
→ 액세서리 선택
→ 종료
```

### 조기 종료 흐름

```text
가방 선택
→ 의류 선택
→ Journey 종료
```

### AI 실패 흐름

```text
제품 선택
→ AI 호출 실패
→ 기본 시나리오 제공
→ Journey 정상 진행
```

---

# 15. 팀 분업 기준

## 프론트엔드 A

- 로그인
- 개인정보 동의
- 예약
- Journey Passport
- QR 화면

## 프론트엔드 B

- 매장 Journey
- 제품 선택
- 매장 구역 안내
- Journey 진행 상태
- 결과 화면

## 백엔드 A

- Prisma 모델
- 시드 데이터
- 사용자·매장·제품·예약 API
- QR 토큰

## 백엔드 B

- Journey 상태 관리
- 제품 상호작용 저장
- 후보 제품 필터링
- AI 연동
- 결과 생성

## 디자인·콘텐츠

- 사용자 경험 설계
- 상품 카드
- 캐릭터 레이어
- Journey Scene
- 시나리오 문구
- MCM 브랜드 헤리티지 콘텐츠

팀 인원에 따라 프론트엔드와 백엔드 역할을 합칠 수 있지만, 기능 소유권은 위 기준으로 구분하는 것이 좋습니다.

---

# 16. 개발 단계

## 0단계: 설계 문서 확정

- MVP 범위
- 화면 목록
- 데이터베이스
- API
- AI 입출력
- 시연 시나리오

## 1단계: 프로젝트 초기화

- Monorepo 생성
- React + Vite 설정
- Express 설정
- Prisma + SQLite 연결
- 공통 타입 패키지 생성
- 환경변수 설정

## 2단계: 데이터와 기본 API

- Prisma 모델 작성
- 가상 고객 2명
- 매장 1개
- 매장 구역 4개
- 제품 9~12개
- 온라인 행동 데이터
- 예약 API

## 3단계: 온라인 사용자 흐름

- 데모 로그인
- 개인정보 활용 동의
- 취향 프로필
- 예약
- 시작 질문
- QR 발급

## 4단계: 매장 Journey

- QR 체크인
- 첫 시나리오
- 제품 후보 표시
- 제품 선택·거절
- 매장 구역 안내
- Journey 상태 저장

## 5단계: AI

- 후보 제품 엔진
- AI 프롬프트
- 구조화 출력
- 결과 검증
- 실패 시 기본 응답

## 6단계: 최종 결과

- Journey Signature
- 최종 MCM 룩
- 추천 이유
- 직원용 요약
- 결과 저장
- 공유 카드

## 7단계: 캐릭터

- 레이어 이미지 적용
- 선택 결과 누적
- Journey Scene 변경

## 8단계: 시연 최적화

- 디자인 통일
- 로딩 화면
- 오류 처리
- 데모 초기화
- 전체 사용자 흐름 테스트
- 발표용 시연 데이터 고정

---

# 17. 최종 기술 결정

| 항목 | 결정 |
|---|---|
| 서비스 형태 | 반응형 웹 애플리케이션 |
| 저장소 형태 | 프론트·백엔드 Monorepo |
| 프론트엔드 | React + TypeScript + Vite |
| 백엔드 | Node.js + TypeScript + Express |
| API | REST API |
| ORM | Prisma |
| MVP 데이터베이스 | SQLite |
| AI 호출 위치 | 백엔드 |
| AI 응답 | JSON Schema 기반 구조화 출력 |
| 실제 인증 | 구현하지 않음 |
| 로그인 | 가상 고객 선택 방식 |
| QR | 예약 토큰을 포함한 QR |
| 제품 인식 | 제품 카드 선택 또는 QR |
| 캐릭터 | 사전 제작 레이어 조합 |
| 이미지 생성 AI | MVP 제외 |
| 관리자 페이지 | MVP 제외 |
| 핵심 데이터 저장 | 모두 서버 및 DB에 저장 |
| AI 실패 대응 | 규칙 기반 기본 시나리오 |

---

이 설계에서 가장 중요한 기술적 결정은 **제품 후보 선정과 재고·동선 처리는 서버 규칙으로 통제하고, AI는 선택의 의미와 브랜드 서사를 생성하도록 역할을 분리하는 것**입니다.

이렇게 해야 AI가 장식이 아닌 핵심 기능으로 작동하면서도 시연 중 잘못된 상품이나 경로를 생성하지 않습니다.

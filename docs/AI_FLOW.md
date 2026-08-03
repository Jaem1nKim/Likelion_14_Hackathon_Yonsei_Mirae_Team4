# MCM Journey Passport AI Flow

## 1. 목적과 범위

이 문서는 MCM Journey Passport MVP의 서버 내부 AI 계약을 정의한다. AI는 Express 백엔드에서만 호출하며, 프론트는 AI provider와 직접 통신하지 않는다.

MVP에서 구현하는 AI 목적은 두 가지뿐이다.

1. `JOURNEY_STEP`: 현재 stage의 시나리오, 매장 구역과 추천 제품 구성
2. `JOURNEY_RESULT`: Journey Signature, 제품별 이유와 직원 요약 생성

다음 기능은 구현하지 않는다.

- Taste Analyzer AI
- 별도 Staff Summary AI
- 제품 태그 생성 AI
- 이미지·영상 생성 AI
- AI의 DB 직접 조회
- AI가 제품명, 가격, 재고나 새 매장 구역을 생성하는 기능

TasteProfile과 TastePreference는 시드 데이터를 사용한다. AI 입력에는 실제 이메일과 온라인 행동 원본을 포함하지 않는다.

## 2. 공통 처리 원칙

### 2.1 책임 분리

서버 규칙이 담당하는 항목:

- 현재 Journey와 stage 검증
- 다음 stage 결정
- 활성 매장과 구역 확인
- Inventory 수량과 전시 가능 여부 확인
- stage 카테고리 제한
- 선택·거절 제품 제외
- 후보 `ruleScore`와 `RecommendationType` 계산
- 최소 완료 조건과 `canFinishJourney` 계산
- AI 입력 후보와 허용 zone 경계 생성
- AI 응답 Zod 및 ID 검증
- deterministic fallback 생성
- DB 저장과 상태 전이

AI가 담당하는 항목:

- 선택 의미를 반영한 시나리오 문장
- 허용 후보 중 최대 3개 구성과 표시 순서
- 후보별 추천 이유
- 최종 Signature 이름과 스타일 서사
- 최종 제품별 이유
- 직원 접객 요약
- 전달받은 scene key 중 최종 장면 선택

### 2.2 호출 및 transaction 순서

모든 AI 작업은 다음 순서를 지킨다.

```text
DB에서 현재 상태 read
→ 서버 규칙으로 입력과 허용 ID 집합 생성
→ DB transaction 없이 AI 호출
→ Zod 구조 검증
→ 허용 제품·구역 ID 검증
→ 실패 시 최대 1회 재시도
→ 모두 실패하면 동일 타입의 deterministic fallback 생성
→ 짧은 DB transaction에서 상태 재검증 및 결과 저장
```

AI network 요청을 기다리는 동안 Prisma transaction을 열지 않는다.

### 2.3 재시도

- 최초 호출 1회 + 재시도 최대 1회, 총 최대 2회다.
- timeout, provider 오류, JSON parse 오류, Zod 오류와 ID 범위 오류는 재시도 대상이다.
- 재시도 전 후보와 허용 ID 집합을 넓히지 않는다.
- 두 번째 호출도 실패하면 즉시 fallback을 사용한다.
- fallback 생성에는 외부 API를 호출하지 않는다.

### 2.4 공통 문자열 제한

Zod 스키마는 trim 후 다음 길이를 적용한다.

| 필드 | 최소 | 최대 |
|---|---:|---:|
| scenarioTitle | 1 | 60자 |
| scenarioText | 1 | 400자 |
| 추천 이유 | 1 | 240자 |
| signatureName | 1 | 60자 |
| signatureStory | 1 | 600자 |
| finalLookSummary | 1 | 400자 |
| staffSummary | 1 | 500자 |

문자열은 plain text로 취급한다. HTML, Markdown 링크와 script를 허용하지 않는다.

## 3. 서버 후보 엔진

### 3.1 고정 stage 전이

```text
start: INTRO → BAG
next:  BAG → APPAREL
next:  APPAREL → ACCESSORY
finish: APPAREL 또는 ACCESSORY → RESULT
```

SHOES는 schema enum에는 남지만 최초 MVP 후보 엔진에서 대상 stage로 선택하지 않는다.

### 3.2 유효 후보 조건

현재 요청의 후보 제품은 모두 다음 조건을 만족해야 한다.

```text
Product.isActive = true
Store.isActive = true
Store.isJourneyEnabled = true
StoreZone.isActive = true
Inventory.storeId = Journey.storeId
Inventory.zoneId가 같은 Store에 속함
Inventory.quantity > 0
Inventory.isDisplayAvailable = true
Product.category = targetStage
StoreZone.category = targetStage
최종 선택된 제품이 아님
REJECTED된 제품이 아님
```

MVP에서는 각 stage별 시드 제품을 최소 3개 보장한다. 후보 0개는 AI 실패가 아니라 시드·데이터 구성 오류이며 AI를 호출하지 않고 API에서 `NO_ELIGIBLE_CANDIDATES`를 반환한다. 이 경우 기존 Journey 상태는 변경하지 않는다.

### 3.3 후보 내부 타입

```ts
type JourneyCandidateProduct = {
  productId: string;
  sku: string;
  name: string;
  category: "BAG" | "APPAREL" | "ACCESSORY";
  color: string;
  material: string | null;
  size: string | null;
  capacity: string | null;
  wearMethod: string | null;
  description: string;
  tags: Array<{
    type: "STYLE" | "FUNCTION" | "SILHOUETTE" | "MOOD";
    name: string;
    score: number;
  }>;
  storeId: string;
  zoneId: string;
  ruleScore: number;
  recommendationType: "MATCH" | "COMPARE" | "CHALLENGE";
  ruleReason: string;
  sceneBackgroundKey: string | null;
};
```

가격과 재고 수량은 AI 입력에서 제외한다. AI는 가격·재고 문장을 만들지 않는다.

### 3.4 정렬 안정성

fallback과 테스트 재현성을 위해 기본 정렬은 다음과 같다.

1. `ruleScore` 내림차순
2. `recommendationType`: MATCH, COMPARE, CHALLENGE 순
3. `sku` 오름차순
4. `productId` 오름차순

동일 입력에는 같은 후보 순서가 나와야 한다.

## 4. JourneyProfileSnapshot AI View

DB의 JourneyProfileSnapshot을 AI에 전달할 때 JSON 문자열을 검증된 객체로 변환한다.

```ts
type JourneyProfileSnapshotAiView = {
  longTermTasteSummary: string;
  todayIntentSummary: string;
  practicalityScore: number;
  expressionScore: number;
  noveltyScore: number;
  preferences: Array<{
    type: "CATEGORY" | "COLOR" | "STYLE" | "MATERIAL" | "FUNCTION";
    value: string;
    score: number;
  }>;
  behaviorSummary: {
    repeatedViewProductIds: string[];
    wishlistProductIds: string[];
    cartProductIds: string[];
    selectedColors: string[];
  } | null;
};
```

- `behaviorDataAllowed=false`이면 `behaviorSummary=null`이다.
- true여도 개별 event timestamp, duration, metadata와 전체 OnlineBehavior 행을 전달하지 않는다.
- 이메일, 사용자 이름과 profileType은 AI 입력에 포함하지 않는다.
- `preferencesJson`, `behaviorSummaryJson` parse 실패는 서버 데이터 오류로 처리하며 원문 문자열을 AI에 전달하지 않는다.

## 5. Journey Step AI

### 5.1 호출 시점

- `POST /api/journeys/:journeyId/start`: BAG step 생성
- `POST /api/journeys/:journeyId/next`: APPAREL 또는 ACCESSORY step 생성

INTRO는 AI 호출과 JourneyStep 저장 대상이 아니다.

### 5.2 입력 타입

```ts
type JourneyStepAiInput = {
  purpose: "JOURNEY_STEP";
  promptVersion: string;
  journeyId: string;
  profileSnapshot: JourneyProfileSnapshotAiView;
  currentStage: "BAG" | "APPAREL" | "ACCESSORY";
  serverCanFinishJourney: boolean;
  candidateProducts: JourneyCandidateProduct[];
  previousSelectedProducts: Array<{
    stepNumber: number;
    stage: "BAG" | "APPAREL" | "ACCESSORY";
    productId: string;
    name: string;
    color: string;
    tags: Array<{ type: string; name: string; score: number }>;
  }>;
  previousRejectedProducts: Array<{
    stage: "BAG" | "APPAREL" | "ACCESSORY";
    productId: string;
    name: string;
  }>;
  allowedZones: Array<{
    zoneId: string;
    storeId: string;
    category: "BAG" | "APPAREL" | "ACCESSORY";
    name: string;
    directionText: string;
    heritageTitle: string | null;
    heritageStory: string | null;
  }>;
};
```

입력 전제:

- `candidateProducts.length >= 1`
- 모든 candidate의 category는 `currentStage`와 같다.
- 모든 candidate의 `zoneId`는 `allowedZones`에 있다.
- 최초 MVP 시드는 stage별 활성 zone을 하나만 두므로 현재 stage의 모든 candidate는 같은 zoneId를 가진다.
- previous selected/rejected 배열은 DB 이력에서 서버가 생성한다.
- 브랜드 헤리티지는 현재 allowed zone의 DB 텍스트만 전달한다.

### 5.3 출력 타입

정상 AI와 fallback은 모두 다음 타입을 사용한다.

```ts
type JourneyStepAiOutput = {
  scenarioTitle: string;
  scenarioText: string;
  nextZoneId: string;
  recommendedProductIds: string[]; // 1~3개, 중복 없음
  challengeProductId: string | null;
  recommendationReasons: Array<{
    productId: string;
    reason: string;
  }>;
  canFinishJourney: boolean;
};
```

`recommendedProductIds.length`는 `min(3, candidateProducts.length)`와 같아야 한다. AI는 충분한 후보가 있는데 임의로 1~2개만 반환할 수 없다.

### 5.4 출력 검증 규칙

Zod 구조 검증 후 서버가 다음 의미 검증을 모두 수행한다.

1. `nextZoneId`는 `allowedZones.zoneId` 중 하나다.
2. recommended ID는 모두 candidateProducts에 있고 중복되지 않는다.
3. 모든 recommended product는 `nextZoneId`에서 체험 가능하다.
4. recommended 개수는 `min(3, candidateProducts.length)`다.
5. recommendationReasons는 recommended ID 각각을 정확히 한 번 포함한다.
6. 이유에 recommended 외 productId가 있으면 실패다.
7. `challengeProductId`는 null이거나 recommended ID 중 하나다.
8. challengeProductId가 있으면 해당 candidate의 `recommendationType=CHALLENGE`여야 한다.
9. `canFinishJourney`는 입력의 `serverCanFinishJourney`와 같아야 한다. 이 값은 현재 stage에서 제품을 선택해 Step을 완료한 뒤 finish 가능한지를 서버가 미리 계산한 값이다.
10. 응답의 제품명·가격·수량처럼 서버 원본과 대조할 수 없는 생성 사실은 저장하지 않는다.

하나라도 실패하면 일부 필드만 고쳐 쓰지 않고 **전체 AI 응답을 폐기**한다. 첫 실패면 같은 허용 집합으로 한 번 재시도하고, 두 번째 실패면 fallback을 생성한다.

### 5.5 StepRecommendation 저장 매핑

검증된 output은 다음처럼 저장한다.

| Output/후보 | JourneyStep/StepRecommendation |
|---|---|
| `scenarioTitle` | JourneyStep.scenarioTitle |
| `scenarioText` | JourneyStep.scenarioText |
| `nextZoneId` | JourneyStep.zoneId |
| zone heritage | JourneyStep.heritageTitle, heritageText |
| `canFinishJourney` | JourneyStep.canFinishJourney |
| fallback 여부 | JourneyStep.usedFallback |
| recommended ID 순서 | StepRecommendation.rank 1부터 |
| candidate.ruleScore | StepRecommendation.ruleScore |
| candidate.recommendationType | StepRecommendation.type |
| recommendation reason | StepRecommendation.reason |
| AI 성공 여부 | StepRecommendation.isAiSelected |

- AI 검증 성공이면 `isAiSelected=true`, fallback이면 false다.
- JourneyStep은 프론트가 즉시 조작할 수 있도록 `status=IN_PROGRESS`로 생성한다.
- `GENERATED` 상태는 최초 MVP 흐름에서 사용하지 않는다.

## 6. Journey Step deterministic fallback

### 6.1 생성 순서

1. target stage, serverCanFinishJourney와 allowed zone을 서버 상태에서 확정한다.
2. 후보를 3.4의 안정 정렬로 정렬한다.
3. 최고 점수 후보의 `zoneId`를 fallback `nextZoneId`로 선택한다.
4. 같은 zone의 후보만 유지하고 상위 최대 3개를 선택한다.
5. 각 후보의 `ruleReason`을 recommendationReasons에 사용한다.
6. 선택 후보 중 `recommendationType=CHALLENGE`인 첫 제품을 challengeProductId로 사용한다. 없으면 null이다.
7. stage별 템플릿으로 scenarioTitle과 scenarioText를 생성한다.
8. `canFinishJourney`에는 서버 계산값을 그대로 사용한다.
9. 완성 객체를 AI 출력과 같은 Zod 스키마로 다시 검증한다.

### 6.2 stage별 템플릿

```text
BAG title: 여정의 중심을 선택해보세요
BAG text: 오늘의 방향과 취향에 맞는 MCM 가방을 직접 비교해보세요.

APPAREL title: 선택한 가방에서 룩을 확장해보세요
APPAREL text: 방금 선택한 가방의 색상과 분위기를 이어갈 의류를 확인해보세요.

ACCESSORY title: 마지막 디테일을 완성해보세요
ACCESSORY text: 지금까지의 선택을 연결할 액세서리로 Journey Signature를 완성해보세요.
```

템플릿은 존재하지 않는 제품 특성이나 브랜드 역사를 생성하지 않는다. `heritageTitle`과 `heritageText`는 선택 zone의 DB 값을 그대로 사용한다.

### 6.3 후보가 3개 미만일 때

- 2개: 서로 다른 2개 ID만 반환하고 이유도 2개 생성한다.
- 1개: 해당 1개 ID와 이유 1개를 반환한다.
- 동일 제품을 복제해 3개를 채우지 않는다.
- 선택 목록에 CHALLENGE 후보가 없으면 `challengeProductId=null`이다.
- 0개: AI/fallback을 실행하지 않고 `NO_ELIGIBLE_CANDIDATES`; 기존 step과 Journey 포인터를 변경하지 않는다.

시드 검증은 BAG, APPAREL과 ACCESSORY 각각 추천 가능한 제품 3개 이상을 보장해야 한다. 따라서 정상 MVP 데이터에서 0개 상태는 발생하지 않아야 한다.

### 6.4 AI 실패 후 진행

- start에서 AI가 모두 실패하면 fallback BAG Step을 저장하고 Journey를 ACTIVE로 바꾼다.
- next에서 AI가 모두 실패하면 현재 Step을 완료하고 fallback 다음 Step을 저장한다.
- 프론트 응답 타입은 AI 성공 때와 동일하다.
- UI는 별도 오류 화면으로 이동하지 않는다.

## 7. Journey Result AI

### 7.1 호출 시점과 선행 조건

`POST /api/journeys/:journeyId/finish`에서 다음 조건을 서버가 먼저 확인한 뒤 호출한다.

- Journey.status = ACTIVE
- 현재 JourneyStep이 존재
- BAG 최종 선택 1개 존재
- APPAREL 또는 ACCESSORY 최종 선택 1개 이상 존재
- 모든 최종 선택 제품이 Journey의 매장과 연결됨

### 7.2 입력 타입

```ts
type JourneyResultAiInput = {
  purpose: "JOURNEY_RESULT";
  promptVersion: string;
  journeyId: string;
  startQuestion: {
    code: string;
    answerCode: string;
    answerLabel: string;
  };
  profileSnapshot: JourneyProfileSnapshotAiView;
  finalSelectedProducts: Array<{
    selectionOrder: number;
    stepNumber: number;
    stage: "BAG" | "APPAREL" | "ACCESSORY";
    productId: string;
    name: string;
    category: "BAG" | "APPAREL" | "ACCESSORY";
    color: string;
    material: string | null;
    size: string | null;
    capacity: string | null;
    wearMethod: string | null;
    description: string;
    tags: Array<{
      type: "STYLE" | "FUNCTION" | "SILHOUETTE" | "MOOD";
      name: string;
      score: number;
    }>;
    sceneBackgroundKey: string | null;
  }>;
  decisionHistory: Array<{
    sequence: number;
    stepNumber: number;
    stage: "BAG" | "APPAREL" | "ACCESSORY";
    productId: string;
    type: "SELECTED" | "REJECTED" | "DESELECTED";
  }>;
  allowedSceneKeys: string[];
};
```

`finalSelectedProducts`는 각 JourneyStep의 최종 `selectedProductId`를 stepNumber 순으로 만든다. decisionHistory에는 의미 해석에 필요한 선택·거절·변경만 포함하고 VIEWED, COMPARED와 온라인 행동 원본은 제외한다.

### 7.3 출력 타입

정상 AI와 fallback은 모두 다음 타입을 사용한다.

```ts
type JourneyResultAiOutput = {
  signatureName: string;
  signatureStory: string;
  finalLookSummary: string;
  productReasons: Array<{
    productId: string;
    reason: string;
  }>;
  staffSummary: string;
  sceneKey: string | null;
};
```

### 7.4 출력 검증 규칙

1. productReasons는 finalSelectedProducts의 각 productId를 정확히 한 번 포함한다.
2. 최종 선택 밖의 productId를 포함할 수 없다.
3. productReasons 배열 순서는 finalSelectedProducts.selectionOrder와 같아야 한다.
4. `sceneKey`는 null이거나 `allowedSceneKeys`에 있어야 한다.
5. signature와 reason은 입력에 없는 제품, 가격, 재고, 구매 사실을 생성할 수 없다.
6. staffSummary에 이메일, 온라인 행동 원본, duration, metadata와 내부 점수를 나열할 수 없다.
7. 모든 문자열은 공통 길이와 plain text 제한을 만족해야 한다.

검증 실패 시 전체 응답을 폐기하고 최대 한 번 재시도한다. 두 번째도 실패하면 Journey Result fallback을 사용한다.

### 7.5 DB 저장 매핑

| Output | 저장 위치 |
|---|---|
| signatureName | JourneyResult.signatureName |
| signatureStory | JourneyResult.signatureStory |
| finalLookSummary | JourneyResult.finalLookSummary |
| staffSummary | JourneyResult.staffSummary |
| sceneKey | JourneyResult.sceneKey |
| fallback 여부 | JourneyResult.usedFallback |
| productReasons 순서 | JourneyResultItem.selectionOrder |
| productReasons.reason | JourneyResultItem.recommendationReason |
| 선택 제품 category | JourneyResultItem.category |
| 선택 제품 personaLayerUrl | JourneyResultItem.personaLayerUrl |

`shareToken`은 AI가 만들지 않고 서버가 안전한 난수로 생성한다. `personaBaseKey`도 서버의 고정 에셋 설정에서 결정한다.

## 8. Journey Result deterministic fallback

### 8.1 생성 순서

1. 최종 제품을 stepNumber 순으로 확정해 selectionOrder 1부터 부여한다.
2. 모든 최종 제품의 verified ProductTag 점수를 합산한다.
3. 총점이 가장 높은 STYLE 또는 MOOD 태그를 dominant tag로 선택한다. 동점이면 tag name 오름차순이다.
4. 태그가 없으면 첫 BAG 제품의 color를 dominant descriptor로 사용한다.
5. 아래 템플릿으로 모든 필수 문자열을 만든다.
6. 각 제품의 최고 점수 verified tag를 제품별 이유에 사용한다. 없으면 category와 color를 사용한다.
7. 최종 선택 역순에서 첫 non-null `sceneBackgroundKey`를 sceneKey로 사용한다. 모두 null이면 null이다.
8. 완성 결과를 JourneyResultAiOutput Zod 스키마로 다시 검증한다.

### 8.2 필수 필드 템플릿

```text
signatureName:
MCM {dominant descriptor} Journey

signatureStory:
"{startAnswerLabel}"에서 시작한 여정은 {선택 제품명 목록}의 선택으로 이어졌습니다.
각 선택이 고객의 기존 취향과 새로운 시도를 연결해 하나의 스타일 흐름을 완성했습니다.

finalLookSummary:
{BAG 제품명}을 중심으로 {추가 제품명 목록}을 연결한 MCM 룩입니다.

productReasons:
{제품명}은(는) {색상}과 {최고 점수 태그 또는 카테고리} 특성으로 전체 선택을 연결합니다.

staffSummary:
오늘의 방향은 "{startAnswerLabel}"입니다. 최종 선택 제품은 {제품명 목록}입니다.
고객은 선택을 {selected count}회 확정했고 {rejected count}개 제품을 제외했으며 {deselected count}회 선택을 변경했습니다.
```

staffSummary에는 이메일, 행동 원본과 내부 prompt를 넣지 않는다. count는 ProductInteraction 집계값만 사용한다.

### 8.3 태그·scene 데이터 부족

- verified tag가 없으면 category와 color만 사용한다.
- material, capacity 또는 wearMethod가 null이면 문장에 포함하지 않는다.
- scene key가 없으면 `sceneKey=null`로 저장하고 기본 배경은 프론트 에셋 설정이 선택한다.
- Product 이름이나 필수 color가 DB에 없으면 fallback 문장으로 숨기지 않고 서버 데이터 검증 오류로 처리한다.

### 8.4 AI가 모두 실패해도 FINISHED까지 진행하는 방법

```text
finish 선행 조건 확인
→ Result AI 1차 실패
→ 동일 입력으로 1회 재시도 실패
→ deterministic Result 생성 및 Zod 검증
→ transaction에서 상태·선택 재검증
→ JourneyResult와 JourneyResultItem 저장
→ 현재 step COMPLETED
→ Journey FINISHED/currentStage RESULT
→ Reservation COMPLETED
→ aggregate 결과 반환
```

AI 실패 자체는 Journey를 ACTIVE에 남겨두지 않는다. 단, fallback 생성에 필요한 DB 필수 데이터가 손상된 경우에만 transaction을 수행하지 않고 `INTERNAL_ERROR`로 남긴다.

## 9. usedFallback과 AIExecution

### 9.1 저장 규칙

| 상황 | JourneyStep/JourneyResult.usedFallback | AIExecution.status | AIExecution.validated |
|---|---:|---|---:|
| 첫 AI 응답 검증 성공 | false | SUCCESS | true |
| 첫 실패 후 재시도 성공 | false | SUCCESS | true |
| 두 AI 시도 실패 후 fallback 성공 | true | FALLBACK | false |
| 서버 데이터 오류로 fallback도 생성 불가 | 저장 결과 없음 | FAILED | false |

Step AIExecution은 생성된 JourneyStep과 연결한다. Result AIExecution은 `journeyId`에 연결하고 `journeyStepId=null`로 저장한다.

### 9.2 최소 로그 payload

AIExecution의 기존 String 필드는 전체 prompt/response가 아니라 아래와 같은 축약 JSON만 저장한다.

Journey Step `requestJson`:

```json
{
  "stage": "APPAREL",
  "candidateCount": 4,
  "selectedCount": 1,
  "rejectedCount": 1
}
```

Journey Step `responseJson` 성공 예시:

```json
{
  "nextZoneId": "<StoreZone.id>",
  "recommendedProductIds": ["<Product.id>"],
  "reasonCount": 1
}
```

Journey Result `requestJson`:

```json
{
  "selectedProductCount": 3,
  "decisionEventCount": 5,
  "allowedSceneKeyCount": 2
}
```

Journey Result `responseJson` 성공 예시:

```json
{
  "productReasonCount": 3,
  "sceneKeyPresent": true
}
```

금지 항목:

- 이메일과 사용자 이름
- OnlineBehavior 행과 metadataJson
- 전체 JourneyProfileSnapshot 텍스트
- 전체 prompt
- scenarioText, signatureStory와 staffSummary 원문
- provider의 전체 오류 응답
- API 키와 request header

### 9.3 오류 코드 정규화

`errorMessage`에는 stack trace나 provider payload 대신 마지막 실패 원인을 아래 코드 중 하나로 저장한다.

```text
AI_TIMEOUT
AI_PROVIDER_ERROR
AI_JSON_INVALID
AI_SCHEMA_INVALID
AI_PRODUCT_OUT_OF_SCOPE
AI_ZONE_OUT_OF_SCOPE
AI_REASON_PRODUCT_MISMATCH
AI_SCENE_OUT_OF_SCOPE
FALLBACK_INPUT_INVALID
```

### 9.4 저장 transaction

- AI 호출 결과와 latency는 메모리에 보관한다.
- Step/Result를 저장하는 최종 transaction에서 AIExecution도 함께 생성한다.
- 최종 transaction이 실패하면 성공한 AIExecution만 따로 남기지 않는다.
- `latencyMs`는 두 번 호출했다면 두 호출의 합계를 저장한다.
- `promptVersion`은 서버 상수이며 Step과 Result를 별도로 버전 관리한다.
- `modelName`은 provider의 실제 모델 식별자만 저장하며 API 키나 endpoint URL은 저장하지 않는다.

## 10. API와의 연결

| API | AI 목적 | AI 실패 시 API 결과 |
|---|---|---|
| POST journey start | JOURNEY_STEP/BAG | fallback BAG aggregate 200 |
| POST journey next from BAG | JOURNEY_STEP/APPAREL | fallback APPAREL aggregate 200 |
| POST journey next from APPAREL | JOURNEY_STEP/ACCESSORY | fallback ACCESSORY aggregate 200 |
| POST journey finish | JOURNEY_RESULT | fallback Result가 포함된 FINISHED aggregate 200 |
| GET APIs | 호출 없음 | 저장 데이터만 반환 |
| interactions | 호출 없음 | 선택 이력만 transaction 저장 |

AI provider의 가용성은 GET Journey 복구에 영향을 주지 않는다. 이미 저장된 Step, Recommendation과 Result만 사용한다.

## 11. shared 및 server 구현 대상 타입

추후 `packages/shared` 또는 server 내부 type 모듈에는 다음 계약을 구현한다.

- `JourneyProfileSnapshotAiView`
- `JourneyCandidateProduct`
- `JourneyStepAiInput`
- `JourneyStepAiOutput`
- `JourneyResultAiInput`
- `JourneyResultAiOutput`
- 각 output의 Zod schema
- API_SPEC의 Product, Zone, Step, Result view mapper와 충돌하지 않는 ID·enum 타입

AI 입력에는 서버 내부 데이터가 포함되므로 프론트 public export 대상과 server-only 타입을 구분한다. AI output은 DB 저장 전에 반드시 server-only 검증기를 통과한다.

## 12. 완료 조건

- 정상 AI와 fallback이 같은 Zod output schema를 통과한다.
- AI가 후보 밖 제품, 허용 밖 zone과 선택 밖 result 제품을 저장할 수 없다.
- 후보 1개, 2개, 3개 이상에서 중복 없는 추천이 생성된다.
- AI를 항상 실패시키는 테스트에서도 BAG, APPAREL, ACCESSORY와 FINISHED Result가 생성된다.
- 모든 AI 호출은 DB transaction 밖에서 수행된다.
- Step/Result와 해당 AIExecution은 최종 transaction에서 함께 저장된다.
- AIExecution에 이메일, 행동 원본과 전체 요청·응답이 저장되지 않는다.
- 직원 요약은 Result 생성에 포함되고 별도 STAFF_SUMMARY 호출이 없다.

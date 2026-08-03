-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "profileType" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "behaviorDataAllowed" BOOLEAN NOT NULL,
    "journeyDataAllowed" BOOLEAN NOT NULL,
    "marketingAllowed" BOOLEAN NOT NULL DEFAULT false,
    "agreedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" DATETIME,
    CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OnlineBehavior" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "eventType" TEXT NOT NULL,
    "selectedColor" TEXT,
    "selectedOption" TEXT,
    "durationSeconds" INTEGER,
    "metadataJson" TEXT,
    "occurredAt" DATETIME NOT NULL,
    CONSTRAINT "OnlineBehavior_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OnlineBehavior_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TasteProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "practicalityScore" INTEGER NOT NULL,
    "expressionScore" INTEGER NOT NULL,
    "noveltyScore" INTEGER NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    "calculatedAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TasteProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TastePreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tasteProfileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TastePreference_tasteProfileId_fkey" FOREIGN KEY ("tasteProfileId") REFERENCES "TasteProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "isJourneyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StoreZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "floor" TEXT,
    "directionText" TEXT NOT NULL,
    "heritageTitle" TEXT,
    "heritageStory" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "StoreZone_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "material" TEXT,
    "priceKrw" INTEGER NOT NULL,
    "size" TEXT,
    "capacity" TEXT,
    "wearMethod" TEXT,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "personaLayerUrl" TEXT,
    "sceneBackgroundKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "isDisplayAvailable" BOOLEAN NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Inventory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inventory_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "StoreZone" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "reservedAt" DATETIME NOT NULL,
    "startQuestionCode" TEXT NOT NULL,
    "startAnswerCode" TEXT NOT NULL,
    "startAnswerLabel" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "reservationCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "checkedInAt" DATETIME,
    "completedAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Journey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "currentStage" TEXT NOT NULL DEFAULT 'INTRO',
    "currentStepNumber" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Journey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Journey_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Journey_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JourneyProfileSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journeyId" TEXT NOT NULL,
    "longTermTasteSummary" TEXT NOT NULL,
    "todayIntentSummary" TEXT NOT NULL,
    "practicalityScore" INTEGER NOT NULL,
    "expressionScore" INTEGER NOT NULL,
    "noveltyScore" INTEGER NOT NULL,
    "preferencesJson" TEXT NOT NULL,
    "behaviorSummaryJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JourneyProfileSnapshot_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JourneyStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journeyId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scenarioTitle" TEXT NOT NULL,
    "scenarioText" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "heritageTitle" TEXT,
    "heritageText" TEXT,
    "selectedProductId" TEXT,
    "canFinishJourney" BOOLEAN NOT NULL,
    "usedFallback" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "JourneyStep_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JourneyStep_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "StoreZone" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JourneyStep_selectedProductId_fkey" FOREIGN KEY ("selectedProductId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StepRecommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journeyStepId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "ruleScore" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "isAiSelected" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StepRecommendation_journeyStepId_fkey" FOREIGN KEY ("journeyStepId") REFERENCES "JourneyStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StepRecommendation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journeyId" TEXT NOT NULL,
    "journeyStepId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductInteraction_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductInteraction_journeyStepId_fkey" FOREIGN KEY ("journeyStepId") REFERENCES "JourneyStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductInteraction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JourneyResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journeyId" TEXT NOT NULL,
    "signatureName" TEXT NOT NULL,
    "signatureStory" TEXT NOT NULL,
    "finalLookSummary" TEXT NOT NULL,
    "staffSummary" TEXT NOT NULL,
    "personaBaseKey" TEXT,
    "sceneKey" TEXT,
    "shareToken" TEXT NOT NULL,
    "usedFallback" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JourneyResult_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JourneyResultItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journeyResultId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "selectionOrder" INTEGER NOT NULL,
    "recommendationReason" TEXT NOT NULL,
    "personaLayerUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JourneyResultItem_journeyResultId_fkey" FOREIGN KEY ("journeyResultId") REFERENCES "JourneyResult" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JourneyResultItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journeyId" TEXT NOT NULL,
    "journeyStepId" TEXT,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "modelName" TEXT,
    "requestJson" TEXT NOT NULL,
    "responseJson" TEXT,
    "validated" BOOLEAN NOT NULL,
    "latencyMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIExecution_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIExecution_journeyStepId_fkey" FOREIGN KEY ("journeyStepId") REFERENCES "JourneyStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "Consent_userId_agreedAt_idx" ON "Consent"("userId", "agreedAt");

-- CreateIndex
CREATE INDEX "OnlineBehavior_userId_occurredAt_idx" ON "OnlineBehavior"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "OnlineBehavior_userId_eventType_idx" ON "OnlineBehavior"("userId", "eventType");

-- CreateIndex
CREATE INDEX "OnlineBehavior_productId_eventType_idx" ON "OnlineBehavior"("productId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "TasteProfile_userId_key" ON "TasteProfile"("userId");

-- CreateIndex
CREATE INDEX "TastePreference_tasteProfileId_type_idx" ON "TastePreference"("tasteProfileId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "TastePreference_tasteProfileId_type_value_key" ON "TastePreference"("tasteProfileId", "type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Store_code_key" ON "Store"("code");

-- CreateIndex
CREATE UNIQUE INDEX "StoreZone_storeId_code_key" ON "StoreZone"("storeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTag_productId_type_name_key" ON "ProductTag"("productId", "type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_storeId_productId_key" ON "Inventory"("storeId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_qrToken_key" ON "Reservation"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_reservationCode_key" ON "Reservation"("reservationCode");

-- CreateIndex
CREATE INDEX "Reservation_userId_reservedAt_idx" ON "Reservation"("userId", "reservedAt");

-- CreateIndex
CREATE INDEX "Reservation_storeId_reservedAt_status_idx" ON "Reservation"("storeId", "reservedAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Journey_reservationId_key" ON "Journey"("reservationId");

-- CreateIndex
CREATE INDEX "Journey_userId_status_idx" ON "Journey"("userId", "status");

-- CreateIndex
CREATE INDEX "Journey_storeId_status_createdAt_idx" ON "Journey"("storeId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyProfileSnapshot_journeyId_key" ON "JourneyProfileSnapshot"("journeyId");

-- CreateIndex
CREATE INDEX "JourneyStep_journeyId_stepNumber_idx" ON "JourneyStep"("journeyId", "stepNumber");

-- CreateIndex
CREATE INDEX "JourneyStep_journeyId_status_idx" ON "JourneyStep"("journeyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyStep_journeyId_stepNumber_key" ON "JourneyStep"("journeyId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StepRecommendation_journeyStepId_productId_key" ON "StepRecommendation"("journeyStepId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "StepRecommendation_journeyStepId_rank_key" ON "StepRecommendation"("journeyStepId", "rank");

-- CreateIndex
CREATE INDEX "ProductInteraction_journeyId_createdAt_idx" ON "ProductInteraction"("journeyId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductInteraction_journeyStepId_type_idx" ON "ProductInteraction"("journeyStepId", "type");

-- CreateIndex
CREATE INDEX "ProductInteraction_productId_type_idx" ON "ProductInteraction"("productId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInteraction_journeyId_sequence_key" ON "ProductInteraction"("journeyId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyResult_journeyId_key" ON "JourneyResult"("journeyId");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyResult_shareToken_key" ON "JourneyResult"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyResultItem_journeyResultId_productId_key" ON "JourneyResultItem"("journeyResultId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyResultItem_journeyResultId_selectionOrder_key" ON "JourneyResultItem"("journeyResultId", "selectionOrder");

-- CreateIndex
CREATE INDEX "AIExecution_journeyId_purpose_createdAt_idx" ON "AIExecution"("journeyId", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "AIExecution_status_createdAt_idx" ON "AIExecution"("status", "createdAt");

import {
  JourneyStage,
  JourneyStatus,
  JourneyStepStatus,
  ProductCategory,
  ProductTagType,
  RecommendationType,
  ReservationStatus,
  UserRole,
} from "../generated/prisma/enums.js";
import { disconnectPrisma, prisma } from "../lib/prisma.js";

const failures: string[] = [];
let assertionCount = 0;

function check(condition: boolean, message: string) {
  assertionCount += 1;
  if (!condition) {
    failures.push(message);
  }
}

function inScoreRange(score: number) {
  return Number.isInteger(score) && score >= 0 && score <= 100;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

async function expectUniqueConstraint(
  label: string,
  operation: () => Promise<unknown>,
) {
  try {
    await operation();
    failures.push(`${label}: duplicate insert unexpectedly succeeded`);
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      failures.push(`${label}: expected P2002 but received ${String(error)}`);
    }
  }
  assertionCount += 1;
}

async function verifySeedData() {
  const customers = await prisma.user.findMany({
    where: { role: UserRole.CUSTOMER, isActive: true },
    include: { tasteProfile: { include: { preferences: true } } },
  });
  const staffCount = await prisma.user.count({
    where: { role: UserRole.STAFF, isActive: true },
  });

  check(customers.length >= 2, "At least two active CUSTOMER users are required");
  check(staffCount >= 1, "At least one active STAFF user is required");
  for (const customer of customers) {
    check(
      customer.tasteProfile !== null,
      `Customer ${customer.email} is missing TasteProfile`,
    );
    check(
      (customer.tasteProfile?.preferences.length ?? 0) > 0,
      `Customer ${customer.email} is missing TastePreference rows`,
    );
  }

  const stores = await prisma.store.findMany({
    where: { isActive: true, isJourneyEnabled: true },
    include: { zones: true },
  });
  check(stores.length >= 1, "At least one active Journey store is required");

  const requiredCategories = [
    ProductCategory.BAG,
    ProductCategory.APPAREL,
    ProductCategory.SHOES,
    ProductCategory.ACCESSORY,
  ];
  const activeZoneCategories = new Set(
    stores.flatMap((store) =>
      store.zones.filter((zone) => zone.isActive).map((zone) => zone.category),
    ),
  );
  for (const category of requiredCategories) {
    check(
      activeZoneCategories.has(category),
      `Missing active StoreZone for ${category}`,
    );
  }

  const inventories = await prisma.inventory.findMany({
    include: {
      store: true,
      zone: true,
      product: { include: { tags: true } },
    },
  });
  const eligibleInventories = inventories.filter(
    ({ quantity, isDisplayAvailable, store, zone, product }) =>
      quantity > 0 &&
      isDisplayAvailable &&
      store.isActive &&
      store.isJourneyEnabled &&
      zone.isActive &&
      product.isActive,
  );

  for (const category of [
    ProductCategory.BAG,
    ProductCategory.APPAREL,
    ProductCategory.ACCESSORY,
  ]) {
    check(
      eligibleInventories.filter(({ product }) => product.category === category)
        .length >= 3,
      `${category} requires at least three eligible products`,
    );
  }

  for (const inventory of eligibleInventories) {
    check(
      inventory.storeId === inventory.zone.storeId,
      `Inventory ${inventory.id} has mismatched Store and StoreZone`,
    );
    check(
      inventory.product.category === inventory.zone.category,
      `Inventory ${inventory.id} has mismatched Product and StoreZone categories`,
    );
    check(
      inventory.quantity >= 0,
      `Inventory ${inventory.id} has a negative quantity`,
    );
    check(
      inventory.product.tags.some(
        (tag) =>
          tag.verified &&
          (tag.type === ProductTagType.STYLE ||
            tag.type === ProductTagType.MOOD),
      ),
      `Product ${inventory.product.sku} needs a verified STYLE or MOOD tag`,
    );
    check(
      inventory.product.tags.some(
        (tag) => tag.verified && tag.type === ProductTagType.FUNCTION,
      ),
      `Product ${inventory.product.sku} needs a verified FUNCTION tag`,
    );
  }

  const tasteProfiles = await prisma.tasteProfile.findMany({
    include: { preferences: true },
  });
  for (const profile of tasteProfiles) {
    for (const [name, score] of [
      ["practicalityScore", profile.practicalityScore],
      ["expressionScore", profile.expressionScore],
      ["noveltyScore", profile.noveltyScore],
      ["confidenceScore", profile.confidenceScore],
    ] as const) {
      check(inScoreRange(score), `TasteProfile ${profile.id} ${name} is out of range`);
    }
    for (const preference of profile.preferences) {
      check(
        inScoreRange(preference.score),
        `TastePreference ${preference.id} score is out of range`,
      );
    }
  }

  const productTags = await prisma.productTag.findMany();
  for (const tag of productTags) {
    check(inScoreRange(tag.score), `ProductTag ${tag.id} score is out of range`);
  }
}

type SqliteIndexRow = { name: string; unique: number | bigint };
type SqliteIndexInfoRow = { name: string; seqno: number | bigint };

async function hasDatabaseUnique(modelName: string, expectedFields: string[]) {
  const indexes = await prisma.$queryRawUnsafe<SqliteIndexRow[]>(
    `PRAGMA index_list("${modelName}")`,
  );

  for (const index of indexes.filter((candidate) => Number(candidate.unique) === 1)) {
    const fields = await prisma.$queryRawUnsafe<SqliteIndexInfoRow[]>(
      `PRAGMA index_info("${index.name}")`,
    );
    const fieldNames = fields
      .sort((left, right) => Number(left.seqno) - Number(right.seqno))
      .map((field) => field.name);

    if (
      fieldNames.length === expectedFields.length &&
      fieldNames.every((field, indexPosition) => field === expectedFields[indexPosition])
    ) {
      return true;
    }
  }

  return false;
}

async function verifySchemaConstraints() {
  const uniqueDefinitions: ReadonlyArray<readonly [string, readonly string[]]> = [
    ["User", ["email"]],
    ["Store", ["code"]],
    ["Product", ["sku"]],
    ["TasteProfile", ["userId"]],
    ["Reservation", ["qrToken"]],
    ["Reservation", ["reservationCode"]],
    ["Journey", ["reservationId"]],
    ["JourneyProfileSnapshot", ["journeyId"]],
    ["JourneyResult", ["journeyId"]],
    ["JourneyResult", ["shareToken"]],
    ["TastePreference", ["tasteProfileId", "type", "value"]],
    ["StoreZone", ["storeId", "code"]],
    ["ProductTag", ["productId", "type", "name"]],
    ["Inventory", ["storeId", "productId"]],
    ["JourneyStep", ["journeyId", "stepNumber"]],
    ["StepRecommendation", ["journeyStepId", "productId"]],
    ["StepRecommendation", ["journeyStepId", "rank"]],
    ["ProductInteraction", ["journeyId", "sequence"]],
    ["JourneyResultItem", ["journeyResultId", "productId"]],
    ["JourneyResultItem", ["journeyResultId", "selectionOrder"]],
  ];

  for (const [model, fields] of uniqueDefinitions) {
    check(
      await hasDatabaseUnique(model, [...fields]),
      `${model} must have unique constraint (${fields.join(", ")})`,
    );
  }
}

async function verifyDatabaseConstraints() {
  const customer = await prisma.user.findFirstOrThrow({
    where: { role: UserRole.CUSTOMER },
  });
  const store = await prisma.store.findFirstOrThrow({
    where: { isJourneyEnabled: true },
  });
  const bagZone = await prisma.storeZone.findFirstOrThrow({
    where: { storeId: store.id, category: ProductCategory.BAG },
  });
  const bagProducts = await prisma.product.findMany({
    where: { category: ProductCategory.BAG },
    orderBy: { sku: "asc" },
    take: 2,
  });
  const [firstBag, secondBag] = bagProducts;
  if (!firstBag || !secondBag) {
    failures.push("Constraint verification requires two BAG products");
    return;
  }

  const rollback = new Error("VERIFY_TRANSACTION_ROLLBACK");
  try {
    await prisma.$transaction(async (transaction) => {
      await expectUniqueConstraint("User.email", () =>
        transaction.user.create({
          data: {
            email: customer.email,
            name: "Duplicate Email Probe",
            role: UserRole.CUSTOMER,
          },
        }),
      );
      await expectUniqueConstraint("Store.code", () =>
        transaction.store.create({
          data: {
            code: store.code,
            name: "Duplicate Store Probe",
            location: "Verification",
          },
        }),
      );
      await expectUniqueConstraint("Product.sku", () =>
        transaction.product.create({
          data: {
            sku: firstBag.sku,
            name: "Duplicate Product Probe",
            category: ProductCategory.BAG,
            color: "BLACK",
            priceKrw: 1,
            description: "Verification only",
            imageUrl: "/verification.png",
          },
        }),
      );
      await expectUniqueConstraint("Inventory.storeId_productId", () =>
        transaction.inventory.create({
          data: {
            storeId: store.id,
            zoneId: bagZone.id,
            productId: firstBag.id,
            quantity: 1,
            isDisplayAvailable: true,
          },
        }),
      );
      await expectUniqueConstraint("TasteProfile.userId", () =>
        transaction.tasteProfile.create({
          data: {
            userId: customer.id,
            summary: "Duplicate profile probe",
            practicalityScore: 50,
            expressionScore: 50,
            noveltyScore: 50,
            confidenceScore: 50,
            calculatedAt: new Date(),
          },
        }),
      );

      const reservationOne = await transaction.reservation.create({
        data: {
          id: "verify-reservation-1",
          userId: customer.id,
          storeId: store.id,
          reservedAt: new Date("2099-01-01T10:00:00.000Z"),
          startQuestionCode: "VERIFY_QUESTION",
          startAnswerCode: "VERIFY_ANSWER",
          startAnswerLabel: "Verification answer",
          qrToken: "verify-qr-token-1",
          reservationCode: "VRFY0001",
          status: ReservationStatus.CHECKED_IN,
        },
      });
      await expectUniqueConstraint("Reservation.reservationCode", () =>
        transaction.reservation.create({
          data: {
            id: "verify-reservation-code-duplicate",
            userId: customer.id,
            storeId: store.id,
            reservedAt: new Date("2099-01-01T10:00:00.000Z"),
            startQuestionCode: "VERIFY_QUESTION",
            startAnswerCode: "VERIFY_ANSWER",
            startAnswerLabel: "Verification answer",
            qrToken: "verify-qr-token-code-duplicate",
            reservationCode: reservationOne.reservationCode,
          },
        }),
      );
      await expectUniqueConstraint("Reservation.qrToken", () =>
        transaction.reservation.create({
          data: {
            id: "verify-reservation-qr-duplicate",
            userId: customer.id,
            storeId: store.id,
            reservedAt: new Date("2099-01-01T10:00:00.000Z"),
            startQuestionCode: "VERIFY_QUESTION",
            startAnswerCode: "VERIFY_ANSWER",
            startAnswerLabel: "Verification answer",
            qrToken: reservationOne.qrToken,
            reservationCode: "VRFY0002",
          },
        }),
      );

      const journeyOne = await transaction.journey.create({
        data: {
          id: "verify-journey-1",
          userId: customer.id,
          reservationId: reservationOne.id,
          storeId: store.id,
          status: JourneyStatus.ACTIVE,
          currentStage: JourneyStage.BAG,
          currentStepNumber: 1,
        },
      });
      await expectUniqueConstraint("Journey.reservationId", () =>
        transaction.journey.create({
          data: {
            userId: customer.id,
            reservationId: reservationOne.id,
            storeId: store.id,
          },
        }),
      );

      await transaction.journeyProfileSnapshot.create({
        data: {
          journeyId: journeyOne.id,
          longTermTasteSummary: "Verification snapshot",
          todayIntentSummary: "Verification intent",
          practicalityScore: 50,
          expressionScore: 50,
          noveltyScore: 50,
          preferencesJson: "[]",
        },
      });
      await expectUniqueConstraint("JourneyProfileSnapshot.journeyId", () =>
        transaction.journeyProfileSnapshot.create({
          data: {
            journeyId: journeyOne.id,
            longTermTasteSummary: "Duplicate snapshot",
            todayIntentSummary: "Duplicate intent",
            practicalityScore: 50,
            expressionScore: 50,
            noveltyScore: 50,
            preferencesJson: "[]",
          },
        }),
      );

      const step = await transaction.journeyStep.create({
        data: {
          id: "verify-step-1",
          journeyId: journeyOne.id,
          stepNumber: 1,
          stage: JourneyStage.BAG,
          status: JourneyStepStatus.IN_PROGRESS,
          scenarioTitle: "Verification step",
          scenarioText: "Verification only",
          zoneId: bagZone.id,
          canFinishJourney: false,
          usedFallback: true,
        },
      });
      await expectUniqueConstraint("JourneyStep.journeyId_stepNumber", () =>
        transaction.journeyStep.create({
          data: {
            journeyId: journeyOne.id,
            stepNumber: 1,
            stage: JourneyStage.BAG,
            status: JourneyStepStatus.IN_PROGRESS,
            scenarioTitle: "Duplicate step",
            scenarioText: "Verification only",
            zoneId: bagZone.id,
            canFinishJourney: false,
            usedFallback: true,
          },
        }),
      );

      await transaction.stepRecommendation.create({
        data: {
          journeyStepId: step.id,
          productId: firstBag.id,
          type: RecommendationType.MATCH,
          rank: 1,
          ruleScore: 90,
          reason: "Verification recommendation",
          isAiSelected: false,
        },
      });
      await expectUniqueConstraint(
        "StepRecommendation.journeyStepId_productId",
        () =>
          transaction.stepRecommendation.create({
            data: {
              journeyStepId: step.id,
              productId: firstBag.id,
              type: RecommendationType.COMPARE,
              rank: 2,
              ruleScore: 80,
              reason: "Duplicate product probe",
              isAiSelected: false,
            },
          }),
      );
      await expectUniqueConstraint("StepRecommendation.journeyStepId_rank", () =>
        transaction.stepRecommendation.create({
          data: {
            journeyStepId: step.id,
            productId: secondBag.id,
            type: RecommendationType.COMPARE,
            rank: 1,
            ruleScore: 80,
            reason: "Duplicate rank probe",
            isAiSelected: false,
          },
        }),
      );

      await transaction.productInteraction.create({
        data: {
          id: "verify-interaction-1",
          journeyId: journeyOne.id,
          journeyStepId: step.id,
          productId: firstBag.id,
          type: "SELECTED",
          sequence: 1,
        },
      });
      await expectUniqueConstraint("ProductInteraction.journeyId_sequence", () =>
        transaction.productInteraction.create({
          data: {
            id: "verify-interaction-2",
            journeyId: journeyOne.id,
            journeyStepId: step.id,
            productId: secondBag.id,
            type: "VIEWED",
            sequence: 1,
          },
        }),
      );

      const resultOne = await transaction.journeyResult.create({
        data: {
          id: "verify-result-1",
          journeyId: journeyOne.id,
          signatureName: "Verification Journey",
          signatureStory: "Verification only",
          finalLookSummary: "Verification only",
          staffSummary: "Verification only",
          shareToken: "verify-share-token",
          usedFallback: true,
        },
      });
      await expectUniqueConstraint("JourneyResult.journeyId", () =>
        transaction.journeyResult.create({
          data: {
            journeyId: journeyOne.id,
            signatureName: "Duplicate result",
            signatureStory: "Verification only",
            finalLookSummary: "Verification only",
            staffSummary: "Verification only",
            shareToken: "verify-share-token-duplicate-result",
            usedFallback: true,
          },
        }),
      );

      await transaction.journeyResultItem.create({
        data: {
          journeyResultId: resultOne.id,
          productId: firstBag.id,
          category: ProductCategory.BAG,
          selectionOrder: 1,
          recommendationReason: "Verification only",
        },
      });
      await expectUniqueConstraint("JourneyResultItem.product", () =>
        transaction.journeyResultItem.create({
          data: {
            journeyResultId: resultOne.id,
            productId: firstBag.id,
            category: ProductCategory.BAG,
            selectionOrder: 2,
            recommendationReason: "Duplicate product probe",
          },
        }),
      );
      await expectUniqueConstraint("JourneyResultItem.selectionOrder", () =>
        transaction.journeyResultItem.create({
          data: {
            journeyResultId: resultOne.id,
            productId: secondBag.id,
            category: ProductCategory.BAG,
            selectionOrder: 1,
            recommendationReason: "Duplicate order probe",
          },
        }),
      );

      const reservationTwo = await transaction.reservation.create({
        data: {
          id: "verify-reservation-2",
          userId: customer.id,
          storeId: store.id,
          reservedAt: new Date("2099-01-02T10:00:00.000Z"),
          startQuestionCode: "VERIFY_QUESTION",
          startAnswerCode: "VERIFY_ANSWER",
          startAnswerLabel: "Verification answer",
          qrToken: "verify-qr-token-2",
          reservationCode: "VRFY0003",
          status: ReservationStatus.CHECKED_IN,
        },
      });
      const journeyTwo = await transaction.journey.create({
        data: {
          id: "verify-journey-2",
          userId: customer.id,
          reservationId: reservationTwo.id,
          storeId: store.id,
        },
      });
      await expectUniqueConstraint("JourneyResult.shareToken", () =>
        transaction.journeyResult.create({
          data: {
            journeyId: journeyTwo.id,
            signatureName: "Duplicate share token",
            signatureStory: "Verification only",
            finalLookSummary: "Verification only",
            staffSummary: "Verification only",
            shareToken: resultOne.shareToken,
            usedFallback: true,
          },
        }),
      );

      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) {
      failures.push(`Constraint transaction failed unexpectedly: ${String(error)}`);
    }
  }
}

async function main() {
  await verifySeedData();
  await verifySchemaConstraints();
  await verifyDatabaseConstraints();

  if (failures.length > 0) {
    console.error(`Seed verification failed (${failures.length} conditions):`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  const counts = {
    customers: await prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
    staff: await prisma.user.count({ where: { role: UserRole.STAFF } }),
    stores: await prisma.store.count(),
    zones: await prisma.storeZone.count(),
    products: await prisma.product.count(),
    productTags: await prisma.productTag.count(),
    inventories: await prisma.inventory.count(),
    onlineBehaviors: await prisma.onlineBehavior.count(),
    reservations: await prisma.reservation.count(),
    journeys: await prisma.journey.count(),
  };

  console.log(`Seed verification passed (${assertionCount} checks)`, counts);
}

main()
  .catch((error: unknown) => {
    console.error("Seed verification crashed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });

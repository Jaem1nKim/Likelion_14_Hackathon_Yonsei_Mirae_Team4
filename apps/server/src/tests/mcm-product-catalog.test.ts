import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { JOURNEY_STAGE_SEQUENCE, isSupportedJourneyStage } from "../constants/journey.js";
import { ProductCategory } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { findJourneyCandidates } from "../repositories/journey-candidate-repository.js";

const webPublicDirectory = fileURLToPath(
  new URL("../../../web/public/", import.meta.url),
);

describe("imported MCM product catalog", () => {
  it("seeds the expected 32 products by category", async () => {
    const products = await prisma.product.findMany({
      where: { sku: { startsWith: "MCM-" } },
      orderBy: { sku: "asc" },
    });

    expect(products).toHaveLength(32);
    expect(products.filter(({ category }) => category === ProductCategory.BAG)).toHaveLength(14);
    expect(products.filter(({ category }) => category === ProductCategory.APPAREL)).toHaveLength(9);
    expect(products.filter(({ category }) => category === ProductCategory.ACCESSORY)).toHaveLength(4);
    expect(products.filter(({ category }) => category === ProductCategory.SHOES)).toHaveLength(5);
    expect(products.every(({ name }) => name === name.normalize("NFC"))).toBe(true);
  });

  it("stores every imported asset as a decodable WebP container", async () => {
    const products = await prisma.product.findMany({
      where: { sku: { startsWith: "MCM-" } },
      select: { sku: true, imageUrl: true },
    });

    for (const product of products) {
      const bytes = await readFile(`${webPublicDirectory}${product.imageUrl}`);
      expect(bytes.subarray(0, 4).toString("ascii"), product.sku).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString("ascii"), product.sku).toBe("WEBP");
    }
  });

  it("connects every imported product to matching store inventory and zone", async () => {
    const inventories = await prisma.inventory.findMany({
      where: { product: { is: { sku: { startsWith: "MCM-" } } } },
      include: { product: true, zone: true },
    });

    expect(inventories).toHaveLength(32);
    expect(
      inventories.every(
        ({ product, zone, quantity, isDisplayAvailable }) =>
          product.category === zone.category && quantity > 0 && isDisplayAvailable,
      ),
    ).toBe(true);
  });

  it("includes imported BAG, APPAREL, and ACCESSORY products as candidates", async () => {
    const store = await prisma.store.findFirstOrThrow({
      where: { isActive: true, isJourneyEnabled: true },
    });

    for (const [category, expectedCount] of [
      [ProductCategory.BAG, 14],
      [ProductCategory.APPAREL, 9],
      [ProductCategory.ACCESSORY, 4],
    ] as const) {
      const candidates = await findJourneyCandidates({
        storeId: store.id,
        stage: category,
        excludedProductIds: [],
      });
      expect(
        candidates.filter(({ sku }) => sku.startsWith("MCM-")),
        category,
      ).toHaveLength(expectedCount);
    }
  });

  it("keeps SHOES out of Journey candidates and the three-stage flow", async () => {
    const store = await prisma.store.findFirstOrThrow({
      where: { isActive: true, isJourneyEnabled: true },
    });

    expect(JOURNEY_STAGE_SEQUENCE).toEqual(["BAG", "APPAREL", "ACCESSORY"]);
    expect(isSupportedJourneyStage(ProductCategory.SHOES)).toBe(false);
    await expect(
      findJourneyCandidates({
        storeId: store.id,
        stage: ProductCategory.SHOES,
        excludedProductIds: [],
      }),
    ).resolves.toEqual([]);
  });
});

import {
  DEMO_USER_HEADER_NAME,
  PRODUCT_CATEGORY_VALUES,
  type DemoUser,
  type ProductView,
  type StoreProductView,
  type StoreView,
  type StoreZoneView,
  type UserProfileResponse,
} from "@mcm/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import { disconnectPrisma, prisma } from "../lib/prisma.js";

const STABLE_USER_ID = "10000000-0000-4000-8000-000000000001";
const BOLD_USER_ID = "10000000-0000-4000-8000-000000000002";
const STAFF_USER_ID = "10000000-0000-4000-8000-000000000003";
const MISSING_USER_ID = "90000000-0000-4000-8000-000000000001";
const INACTIVE_USER_ID = "90000000-0000-4000-8000-000000000002";
const NO_PROFILE_USER_ID = "90000000-0000-4000-8000-000000000003";
const STORE_ID = "20000000-0000-4000-8000-000000000001";
const INACTIVE_STORE_ID = "90000000-0000-4000-8000-000000000004";
const OTHER_ZONE_ID = "90000000-0000-4000-8000-000000000005";
const MISSING_RESOURCE_ID = "90000000-0000-4000-8000-000000000006";
const DISABLED_STORE_ID = "90000000-0000-4000-8000-000000000007";
const BAG_ZONE_ID = "30000000-0000-4000-8000-000000000001";
const BAG_PRODUCT_ID = "40000000-0000-4000-8000-000000000001";
const APPAREL_PRODUCT_ID = "40000000-0000-4000-8000-000000000004";
const ACCESSORY_PRODUCT_ID = "40000000-0000-4000-8000-000000000007";

const app = createApp();
const api = request(app);

function asDemoUser(responseBody: unknown) {
  return (responseBody as { data: DemoUser }).data;
}

function errorCode(responseBody: unknown) {
  return (responseBody as { error: { code: string } }).error.code;
}

beforeAll(async () => {
  await prisma.storeZone.deleteMany({ where: { id: OTHER_ZONE_ID } });
  await prisma.store.deleteMany({
    where: { id: { in: [INACTIVE_STORE_ID, DISABLED_STORE_ID] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [INACTIVE_USER_ID, NO_PROFILE_USER_ID] } },
  });

  await prisma.user.create({
    data: {
      id: INACTIVE_USER_ID,
      email: "inactive.user@example.demo",
      name: "Inactive Demo User",
      role: "CUSTOMER",
      isActive: false,
    },
  });
  await prisma.store.create({
    data: {
      id: INACTIVE_STORE_ID,
      code: "INACTIVE-TEST-STORE",
      name: "Inactive Test Store",
      location: "Test Location",
      isJourneyEnabled: true,
      isActive: false,
    },
  });
  await prisma.store.create({
    data: {
      id: DISABLED_STORE_ID,
      code: "JOURNEY-DISABLED-TEST-STORE",
      name: "Journey Disabled Test Store",
      location: "Test Location",
      isJourneyEnabled: false,
      isActive: true,
    },
  });
  await prisma.storeZone.create({
    data: {
      id: OTHER_ZONE_ID,
      storeId: INACTIVE_STORE_ID,
      code: "OTHER_STORE_ZONE",
      name: "Other Store Zone",
      category: "BAG",
      directionText: "Test direction",
      displayOrder: 1,
      isActive: true,
    },
  });
});

afterAll(async () => {
  await prisma.storeZone.deleteMany({ where: { id: OTHER_ZONE_ID } });
  await prisma.store.deleteMany({
    where: { id: { in: [INACTIVE_STORE_ID, DISABLED_STORE_ID] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [INACTIVE_USER_ID, NO_PROFILE_USER_ID] } },
  });
  await disconnectPrisma();
});

describe("health", () => {
  it("keeps the database-backed health endpoint working", async () => {
    const response = await api.get("/api/health").expect(200);

    expect(response.body.data.status).toBe("ok");
    expect(response.body.data.database).toBe("connected");
  });
});

describe("demo users", () => {
  it("returns all active demo users without internal fields", async () => {
    const response = await api.get("/api/demo/users").expect(200);
    const users = response.body.data as DemoUser[];

    expect(users).toHaveLength(3);
    expect(users.map((user) => user.id)).not.toContain(INACTIVE_USER_ID);
    expect(users.every((user) => !("isActive" in user))).toBe(true);
  });

  it("filters users by CUSTOMER role", async () => {
    const response = await api
      .get("/api/demo/users")
      .query({ role: "CUSTOMER" })
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(
      (response.body.data as DemoUser[]).every((user) => user.role === "CUSTOMER"),
    ).toBe(true);
  });

  it("rejects an invalid role query", async () => {
    const response = await api
      .get("/api/demo/users")
      .query({ role: "ADMIN" })
      .expect(400);

    expect(errorCode(response.body)).toBe("VALIDATION_ERROR");
    expect(response.body.error.details[0].path).toBe("query.role");
  });

  it("validates an active demo login without creating a session", async () => {
    const response = await api
      .post("/api/demo/login")
      .send({ userId: STABLE_USER_ID })
      .expect(200);

    expect(asDemoUser(response.body).id).toBe(STABLE_USER_ID);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("rejects login for a missing user", async () => {
    const response = await api
      .post("/api/demo/login")
      .send({ userId: MISSING_USER_ID })
      .expect(401);

    expect(errorCode(response.body)).toBe("DEMO_USER_NOT_FOUND");
  });

  it("rejects login for an inactive user", async () => {
    const response = await api
      .post("/api/demo/login")
      .send({ userId: INACTIVE_USER_ID })
      .expect(401);

    expect(errorCode(response.body)).toBe("DEMO_USER_NOT_FOUND");
  });
});

describe("customer profile", () => {
  it("returns the OWNER profile and deterministically ordered preferences", async () => {
    const response = await api
      .get(`/api/users/${STABLE_USER_ID}/profile`)
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(200);
    const profile = response.body.data as UserProfileResponse;

    expect(profile.user.id).toBe(STABLE_USER_ID);
    expect(profile.tasteProfile.userId).toBe(STABLE_USER_ID);
    const preferenceKeys = profile.tasteProfile.preferences.map(
      (preference) => `${preference.type}:${String(100 - preference.score).padStart(3, "0")}:${preference.value}`,
    );
    expect(preferenceKeys).toEqual([...preferenceKeys].sort());
  });

  it("requires the demo user header", async () => {
    const response = await api
      .get(`/api/users/${STABLE_USER_ID}/profile`)
      .expect(401);

    expect(errorCode(response.body)).toBe("DEMO_USER_REQUIRED");
  });

  it("rejects an unknown header user", async () => {
    const response = await api
      .get(`/api/users/${STABLE_USER_ID}/profile`)
      .set(DEMO_USER_HEADER_NAME, MISSING_USER_ID)
      .expect(401);

    expect(errorCode(response.body)).toBe("DEMO_USER_NOT_FOUND");
  });

  it("rejects a different CUSTOMER owner", async () => {
    const response = await api
      .get(`/api/users/${STABLE_USER_ID}/profile`)
      .set(DEMO_USER_HEADER_NAME, BOLD_USER_ID)
      .expect(403);

    expect(errorCode(response.body)).toBe("FORBIDDEN");
  });

  it("rejects STAFF from the customer OWNER endpoint", async () => {
    const response = await api
      .get(`/api/users/${STAFF_USER_ID}/profile`)
      .set(DEMO_USER_HEADER_NAME, STAFF_USER_ID)
      .expect(403);

    expect(errorCode(response.body)).toBe("FORBIDDEN");
  });

  it("returns 404 when an active owner has no TasteProfile", async () => {
    await prisma.user.create({
      data: {
        id: NO_PROFILE_USER_ID,
        email: "no.profile@example.demo",
        name: "No Profile User",
        role: "CUSTOMER",
        isActive: true,
      },
    });

    try {
      const response = await api
        .get(`/api/users/${NO_PROFILE_USER_ID}/profile`)
        .set(DEMO_USER_HEADER_NAME, NO_PROFILE_USER_ID)
        .expect(404);

      expect(errorCode(response.body)).toBe("RESOURCE_NOT_FOUND");
    } finally {
      await prisma.user.delete({ where: { id: NO_PROFILE_USER_ID } });
    }
  });
});

describe("stores and zones", () => {
  it("returns only active Journey-enabled stores", async () => {
    const response = await api
      .get("/api/stores")
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(200);
    const stores = response.body.data as StoreView[];

    expect(stores.map((store) => store.id)).toContain(STORE_ID);
    expect(stores.map((store) => store.id)).not.toContain(INACTIVE_STORE_ID);
    expect(stores.map((store) => store.id)).not.toContain(DISABLED_STORE_ID);
  });

  it("returns an active store detail", async () => {
    const response = await api
      .get(`/api/stores/${STORE_ID}`)
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(200);

    expect((response.body.data as StoreView).id).toBe(STORE_ID);
    expect(response.body.data.isActive).toBeUndefined();
  });

  it("returns 404 for a missing store", async () => {
    const response = await api
      .get(`/api/stores/${MISSING_RESOURCE_ID}`)
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(404);

    expect(errorCode(response.body)).toBe("RESOURCE_NOT_FOUND");
  });

  it("does not expose an inactive store", async () => {
    const response = await api
      .get(`/api/stores/${INACTIVE_STORE_ID}`)
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(404);

    expect(errorCode(response.body)).toBe("RESOURCE_NOT_FOUND");
  });

  it("orders active zones by displayOrder and then code", async () => {
    const response = await api
      .get(`/api/stores/${STORE_ID}/zones`)
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(200);
    const zones = response.body.data as StoreZoneView[];
    const keys = zones.map(
      (zone) => `${String(zone.displayOrder).padStart(4, "0")}:${zone.code}`,
    );

    expect(zones).toHaveLength(4);
    expect(keys).toEqual([...keys].sort());
    expect(zones.every((zone) => !("inventories" in zone))).toBe(true);
  });

  it("returns 404 when zoneId belongs to another store", async () => {
    const response = await api
      .get(`/api/stores/${STORE_ID}/products`)
      .query({ zoneId: OTHER_ZONE_ID })
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(404);

    expect(errorCode(response.body)).toBe("RESOURCE_NOT_FOUND");
  });
});

describe("products", () => {
  it("returns only eligible products with inventory", async () => {
    const response = await api
      .get(`/api/stores/${STORE_ID}/products`)
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(200);
    const products = response.body.data as StoreProductView[];
    const categoryIndex = new Map(
      PRODUCT_CATEGORY_VALUES.map((category, index) => [category, index]),
    );
    const expectedOrder = [...products].sort((left, right) => {
      const categoryDifference =
        (categoryIndex.get(left.category) ?? Number.MAX_SAFE_INTEGER) -
        (categoryIndex.get(right.category) ?? Number.MAX_SAFE_INTEGER);

      return (
        categoryDifference ||
        left.name.localeCompare(right.name, "en") ||
        left.id.localeCompare(right.id, "en")
      );
    });

    expect(products).toHaveLength(41);
    expect(products.every((product) => product.inventory.quantity > 0)).toBe(true);
    expect(products.map(({ id }) => id)).toEqual(expectedOrder.map(({ id }) => id));
  });

  it("filters products by category", async () => {
    const response = await api
      .get(`/api/stores/${STORE_ID}/products`)
      .query({ category: "BAG" })
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(200);

    expect(response.body.data).toHaveLength(17);
    expect(
      (response.body.data as StoreProductView[]).every(
        (product) => product.category === "BAG",
      ),
    ).toBe(true);
  });

  it("filters products by active store zone", async () => {
    const response = await api
      .get(`/api/stores/${STORE_ID}/products`)
      .query({ zoneId: BAG_ZONE_ID })
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(200);

    expect(response.body.data).toHaveLength(17);
    expect(
      (response.body.data as StoreProductView[]).every(
        (product) => product.inventory.zoneId === BAG_ZONE_ID,
      ),
    ).toBe(true);
  });

  it("rejects an invalid category", async () => {
    const response = await api
      .get(`/api/stores/${STORE_ID}/products`)
      .query({ category: "JEWELRY" })
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(400);

    expect(errorCode(response.body)).toBe("VALIDATION_ERROR");
  });

  it("excludes quantity-zero inventory and restores it", async () => {
    const original = await prisma.inventory.findUniqueOrThrow({
      where: { storeId_productId: { storeId: STORE_ID, productId: BAG_PRODUCT_ID } },
    });
    await prisma.inventory.update({
      where: { id: original.id },
      data: { quantity: 0 },
    });

    try {
      const response = await api
        .get(`/api/stores/${STORE_ID}/products`)
        .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
        .expect(200);
      expect(
        (response.body.data as StoreProductView[]).map((product) => product.id),
      ).not.toContain(BAG_PRODUCT_ID);
    } finally {
      await prisma.inventory.update({
        where: { id: original.id },
        data: { quantity: original.quantity },
      });
    }
  });

  it("excludes display-unavailable inventory and restores it", async () => {
    const original = await prisma.inventory.findUniqueOrThrow({
      where: {
        storeId_productId: { storeId: STORE_ID, productId: APPAREL_PRODUCT_ID },
      },
    });
    await prisma.inventory.update({
      where: { id: original.id },
      data: { isDisplayAvailable: false },
    });

    try {
      const response = await api
        .get(`/api/stores/${STORE_ID}/products`)
        .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
        .expect(200);
      expect(
        (response.body.data as StoreProductView[]).map((product) => product.id),
      ).not.toContain(APPAREL_PRODUCT_ID);
    } finally {
      await prisma.inventory.update({
        where: { id: original.id },
        data: { isDisplayAvailable: original.isDisplayAvailable },
      });
    }
  });

  it("excludes inactive products and restores them", async () => {
    await prisma.product.update({
      where: { id: ACCESSORY_PRODUCT_ID },
      data: { isActive: false },
    });

    try {
      const response = await api
        .get(`/api/stores/${STORE_ID}/products`)
        .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
        .expect(200);
      expect(
        (response.body.data as StoreProductView[]).map((product) => product.id),
      ).not.toContain(ACCESSORY_PRODUCT_ID);
      const detailResponse = await api
        .get(`/api/products/${ACCESSORY_PRODUCT_ID}`)
        .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
        .expect(404);
      expect(errorCode(detailResponse.body)).toBe("RESOURCE_NOT_FOUND");
    } finally {
      await prisma.product.update({
        where: { id: ACCESSORY_PRODUCT_ID },
        data: { isActive: true },
      });
    }
  });

  it("excludes products in an inactive zone and restores the zone", async () => {
    await prisma.storeZone.update({
      where: { id: BAG_ZONE_ID },
      data: { isActive: false },
    });

    try {
      const response = await api
        .get(`/api/stores/${STORE_ID}/products`)
        .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
        .expect(200);
      const products = response.body.data as StoreProductView[];

      expect(products).toHaveLength(24);
      expect(products.every((product) => product.inventory.zoneId !== BAG_ZONE_ID)).toBe(
        true,
      );
    } finally {
      await prisma.storeZone.update({
        where: { id: BAG_ZONE_ID },
        data: { isActive: true },
      });
    }
  });

  it("returns product detail with sorted tags but no inventory", async () => {
    const response = await api
      .get(`/api/products/${BAG_PRODUCT_ID}`)
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(200);
    const product = response.body.data as ProductView;
    const tagKeys = product.tags.map(
      (tag) => `${tag.type}:${String(100 - tag.score).padStart(3, "0")}:${tag.name}`,
    );

    expect(product.id).toBe(BAG_PRODUCT_ID);
    expect(product.tags.length).toBeGreaterThanOrEqual(2);
    expect(tagKeys).toEqual([...tagKeys].sort());
    expect("inventory" in product).toBe(false);
  });

  it("returns 404 for a missing product", async () => {
    const response = await api
      .get(`/api/products/${MISSING_RESOURCE_ID}`)
      .set(DEMO_USER_HEADER_NAME, STABLE_USER_ID)
      .expect(404);

    expect(errorCode(response.body)).toBe("RESOURCE_NOT_FOUND");
  });

  it("requires the demo user header", async () => {
    const response = await api.get(`/api/products/${BAG_PRODUCT_ID}`).expect(401);

    expect(errorCode(response.body)).toBe("DEMO_USER_REQUIRED");
  });
});

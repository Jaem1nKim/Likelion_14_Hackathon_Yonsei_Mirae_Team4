import type {
  ApiSuccess,
  StoreProductView,
  StoreView,
  StoreZoneView,
} from "@mcm/shared";
import type { Request, Response } from "express";

import { getValidatedInput } from "../middleware/validation-middleware.js";
import type {
  StoreIdParams,
  StoreProductsQuery,
} from "../schemas/store-schemas.js";
import { listStoreProducts } from "../services/product-service.js";
import { getStore, listStores, listStoreZones } from "../services/store-service.js";

export async function getStores(
  _request: Request,
  response: Response<ApiSuccess<StoreView[]>>,
) {
  response.status(200).json({ data: await listStores() });
}

export async function getStoreDetail(
  request: Request,
  response: Response<ApiSuccess<StoreView>>,
) {
  const { storeId } = getValidatedInput<StoreIdParams>(request, "params");
  response.status(200).json({ data: await getStore(storeId) });
}

export async function getStoreZones(
  request: Request,
  response: Response<ApiSuccess<StoreZoneView[]>>,
) {
  const { storeId } = getValidatedInput<StoreIdParams>(request, "params");
  response.status(200).json({ data: await listStoreZones(storeId) });
}

export async function getStoreProducts(
  request: Request,
  response: Response<ApiSuccess<StoreProductView[]>>,
) {
  const { storeId } = getValidatedInput<StoreIdParams>(request, "params");
  const filters = getValidatedInput<StoreProductsQuery>(request, "query");
  response.status(200).json({ data: await listStoreProducts(storeId, filters) });
}

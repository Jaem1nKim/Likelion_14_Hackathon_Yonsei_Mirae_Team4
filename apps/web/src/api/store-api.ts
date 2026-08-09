import { apiRequest } from "./api-client";
import { parseStores } from "./parsers";

export function getStores(signal?: AbortSignal) {
  return apiRequest("/stores", parseStores, { signal });
}

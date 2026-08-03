import type { DemoUserContext } from "./demo-user.js";

type ValidatedSource = "body" | "params" | "query";

declare global {
  namespace Express {
    interface Request {
      demoUser?: DemoUserContext;
      idempotencyKey?: string;
      validatedInput?: Partial<Record<ValidatedSource, unknown>>;
    }
  }
}

export {};

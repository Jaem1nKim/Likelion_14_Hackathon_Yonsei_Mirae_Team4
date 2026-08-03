import { USER_ROLE_VALUES } from "@mcm/shared";
import { z } from "zod";

import { identifierSchema } from "./common-schemas.js";

export const demoUsersQuerySchema = z.strictObject({
  role: z.enum(USER_ROLE_VALUES).optional(),
});

export const demoLoginBodySchema = z.strictObject({
  userId: identifierSchema,
});

export const userIdParamsSchema = z.strictObject({
  userId: identifierSchema,
});

export type DemoUsersQuery = z.infer<typeof demoUsersQuerySchema>;
export type DemoLoginBody = z.infer<typeof demoLoginBodySchema>;
export type UserIdParams = z.infer<typeof userIdParamsSchema>;

import { z } from "zod";

export const identifierSchema = z
  .string()
  .trim()
  .pipe(z.union([z.uuid(), z.cuid()]));

export const emptyQuerySchema = z.strictObject({});

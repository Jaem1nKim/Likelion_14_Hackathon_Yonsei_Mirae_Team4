import { z } from "zod";

const forbiddenPlainTextPattern = /<[^>]+>|\[[^\]]+\]\([^)]+\)|```|javascript:/i;

const plainText = (maximum: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maximum)
    .refine((value) => !forbiddenPlainTextPattern.test(value));

export const journeyResultAiOutputSchema = z
  .strictObject({
    signatureName: plainText(60),
    signatureStory: plainText(600),
    finalLookSummary: plainText(400),
    productReasons: z.array(
      z.strictObject({
        productId: z.string().trim().min(1),
        reason: plainText(240),
      }),
    ),
    staffSummary: plainText(500),
    sceneKey: z.string().trim().min(1).nullable(),
  })
  .strict();

export const journeyResultJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "signatureName",
    "signatureStory",
    "finalLookSummary",
    "productReasons",
    "staffSummary",
    "sceneKey",
  ],
  properties: {
    signatureName: { type: "string", minLength: 1, maxLength: 60 },
    signatureStory: { type: "string", minLength: 1, maxLength: 600 },
    finalLookSummary: { type: "string", minLength: 1, maxLength: 400 },
    productReasons: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["productId", "reason"],
        properties: {
          productId: { type: "string", minLength: 1 },
          reason: { type: "string", minLength: 1, maxLength: 240 },
        },
      },
    },
    staffSummary: { type: "string", minLength: 1, maxLength: 500 },
    sceneKey: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
  },
};

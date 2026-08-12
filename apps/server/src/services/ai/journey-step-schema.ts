import { z } from "zod";

const plainText = (maximum: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maximum)
    .refine((value) => !/<[^>]+>|\[[^\]]+\]\([^)]+\)|```/i.test(value));

export const journeyStepAiOutputSchema = z
  .strictObject({
    scenarioTitle: plainText(60),
    scenarioText: plainText(400),
    nextZoneId: z.string().trim().min(1),
    recommendedProductIds: z
      .array(z.string().trim().min(1))
      .min(1)
      .max(3)
      .superRefine((values, context) => {
        if (new Set(values).size !== values.length) {
          context.addIssue({ code: "custom", message: "Duplicate product IDs are not allowed." });
        }
      }),
    challengeProductId: z.string().trim().min(1).nullable(),
    recommendationReasons: z
      .array(
        z.strictObject({
          productId: z.string().trim().min(1),
          reason: plainText(240),
        }),
      )
      .min(1)
      .max(3),
    canFinishJourney: z.boolean(),
  })
  .strict();

export const journeyStepJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "scenarioTitle",
    "scenarioText",
    "nextZoneId",
    "recommendedProductIds",
    "challengeProductId",
    "recommendationReasons",
    "canFinishJourney",
  ],
  properties: {
    scenarioTitle: { type: "string", minLength: 1, maxLength: 60 },
    scenarioText: { type: "string", minLength: 1, maxLength: 400 },
    nextZoneId: { type: "string", minLength: 1 },
    recommendedProductIds: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: { type: "string", minLength: 1 },
    },
    challengeProductId: { anyOf: [{ type: "string", minLength: 1 }, { type: "null" }] },
    recommendationReasons: {
      type: "array",
      minItems: 1,
      maxItems: 3,
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
    canFinishJourney: { type: "boolean" },
  },
};

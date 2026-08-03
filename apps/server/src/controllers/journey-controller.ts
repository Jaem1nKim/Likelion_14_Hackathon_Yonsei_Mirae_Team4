import type {
  ApiSuccess,
  CreateInteractionRequest,
  FinishJourneyRequest,
  JourneyAggregate,
  NextJourneyRequest,
} from "@mcm/shared";
import type { Request, Response } from "express";

import { getDemoUser } from "../middleware/demo-user-middleware.js";
import { getValidatedInput } from "../middleware/validation-middleware.js";
import type { JourneyIdParams } from "../schemas/journey-schemas.js";
import { finishJourney } from "../services/journey/journey-finish-service.js";
import { createJourneyInteraction } from "../services/journey/journey-interaction-service.js";
import { advanceJourney } from "../services/journey/journey-next-service.js";
import { startJourney } from "../services/journey/journey-start-service.js";
import { getJourneyAggregateForOwner } from "../services/journey/journey-state-service.js";

function journeyId(request: Request) {
  return getValidatedInput<JourneyIdParams>(request, "params").journeyId;
}

export async function postJourneyStart(
  request: Request,
  response: Response<ApiSuccess<JourneyAggregate>>,
) {
  response.status(200).json({
    data: await startJourney(getDemoUser(request), journeyId(request)),
  });
}

export async function getJourney(
  request: Request,
  response: Response<ApiSuccess<JourneyAggregate>>,
) {
  response.status(200).json({
    data: await getJourneyAggregateForOwner(
      getDemoUser(request),
      journeyId(request),
    ),
  });
}

export async function postJourneyInteraction(
  request: Request,
  response: Response<ApiSuccess<JourneyAggregate>>,
) {
  response.status(200).json({
    data: await createJourneyInteraction(
      getDemoUser(request),
      journeyId(request),
      getValidatedInput<CreateInteractionRequest>(request, "body"),
    ),
  });
}

export async function postJourneyNext(
  request: Request,
  response: Response<ApiSuccess<JourneyAggregate>>,
) {
  response.status(200).json({
    data: await advanceJourney(
      getDemoUser(request),
      journeyId(request),
      getValidatedInput<NextJourneyRequest>(request, "body"),
    ),
  });
}

export async function postJourneyFinish(
  request: Request,
  response: Response<ApiSuccess<JourneyAggregate>>,
) {
  response.status(200).json({
    data: await finishJourney(
      getDemoUser(request),
      journeyId(request),
      getValidatedInput<FinishJourneyRequest>(request, "body"),
    ),
  });
}

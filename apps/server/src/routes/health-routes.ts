import {
  HEALTH_DATABASE_STATUS,
  HEALTH_STATUS,
  type HealthResponse,
} from "@mcm/shared";
import { Router, type Response } from "express";

import { checkDatabaseConnection } from "../lib/prisma.js";

export const healthRouter = Router();

healthRouter.get(
  "/health",
  async (_request, response: Response<HealthResponse>, next) => {
    try {
      await checkDatabaseConnection();
      response.status(200).json({
        data: {
          status: HEALTH_STATUS,
          database: HEALTH_DATABASE_STATUS,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

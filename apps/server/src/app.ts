import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/error-middleware.js";
import { demoRouter } from "./routes/demo-routes.js";
import { healthRouter } from "./routes/health-routes.js";
import { journeyRouter } from "./routes/journey-routes.js";
import { productRouter } from "./routes/product-routes.js";
import { reservationRouter } from "./routes/reservation-routes.js";
import { storeRouter } from "./routes/store-routes.js";
import { userRouter } from "./routes/user-routes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", healthRouter);
  app.use("/api/demo", demoRouter);
  app.use("/api/users", userRouter);
  app.use("/api/stores", storeRouter);
  app.use("/api/products", productRouter);
  app.use("/api/reservations", reservationRouter);
  app.use("/api/journeys", journeyRouter);

  app.use(errorMiddleware);

  return app;
}

import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { feedRouter } from "./routes/feed.js";
import { interactRouter } from "./routes/interact.js";
import { autoBuyRouter } from "./routes/autoBuy.js";
import { usersRouter } from "./routes/users.js";

/**
 * Builds the Express app without starting a listener so integration tests
 * can boot it in-process and exercise the routes via supertest-style fetch.
 */
export function createApp(): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      mode: {
        mockAi: config.useMockAi || !config.anthropicApiKey,
        mockWeather: config.useMockWeather || !config.openWeatherApiKey,
      },
    });
  });

  app.use(feedRouter);
  app.use(interactRouter);
  app.use(autoBuyRouter);
  app.use(usersRouter);

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error("[flowbuy] unhandled error:", err);
      res.status(500).json({ error: "Internal server error" });
    },
  );

  return app;
}

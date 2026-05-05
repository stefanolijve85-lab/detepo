import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { feedRouter } from "./routes/feed.js";
import { interactRouter } from "./routes/interact.js";
import { autoBuyRouter } from "./routes/autoBuy.js";
import { usersRouter } from "./routes/users.js";

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

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[flowbuy] unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`FlowBuy API listening on http://localhost:${config.port}`);
  console.log(
    `  AI: ${config.useMockAi || !config.anthropicApiKey ? "MOCK" : config.claudeModel}`,
  );
  console.log(
    `  Weather: ${config.useMockWeather || !config.openWeatherApiKey ? "MOCK" : "OpenWeather"}`,
  );
});

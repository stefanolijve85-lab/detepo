import { config } from "./config.js";
import { createApp } from "./app.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`FlowBuy API listening on http://localhost:${config.port}`);
  console.log(
    `  AI: ${config.useMockAi || !config.anthropicApiKey ? "MOCK" : config.claudeModel}`,
  );
  console.log(
    `  Weather: ${config.useMockWeather || !config.openWeatherApiKey ? "MOCK" : "OpenWeather"}`,
  );
});

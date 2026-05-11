import "dotenv/config";
import appInsights from "applicationinsights";
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING).start();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { runMigrations } from "./db/migrate";
import socialRoutes from "./routes/socialRoutes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT ?? 3003;

app.use(helmet());
// app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "social-service" }),
);

app.use("/", socialRoutes);
app.use(errorHandler);

// Note: social-service does not subscribe to Service Bus here.
// It PUBLISHES events (in socialController.ts) and calls other services directly via HTTP.
// search-service and analytics-service handle their own subscriptions.

runMigrations();
app.listen(PORT, () => console.log(`👥 Social service running on :${PORT}`));

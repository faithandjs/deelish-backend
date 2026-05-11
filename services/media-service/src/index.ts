import "dotenv/config";
import appInsights from "applicationinsights";
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING).start();
}
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { runMigrations } from "./db/migrate";
import mediaRoutes from "./routes/mediaRoutes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// app.set("trust proxy", 1);
const PORT = process.env.PORT ?? 3002;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "media-service" }),
);

app.use("/", mediaRoutes);

app.use(errorHandler);

runMigrations();
app.listen(PORT, () => console.log(`📸 Media service running on :${PORT}`));

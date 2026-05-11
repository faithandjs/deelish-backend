import "dotenv/config";
import appInsights from "applicationinsights";
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING).start();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { runMigrations } from "./db/migrate";

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT ?? 3001;

app.use(helmet());
// app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));
app.use(express.json());

// Health check
app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "auth-service" }),
);

// Routes
app.use("/", authRoutes);

// Error handler — must be last
app.use(errorHandler);

// Boot
runMigrations();
app.listen(PORT, () => console.log(`🔐 Auth service running on :${PORT}`));

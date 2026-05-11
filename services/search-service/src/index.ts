import "dotenv/config";
import appInsights from "applicationinsights";
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING).start();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { runMigrations } from "./db/migrate";
import { searchRepository } from "./db/searchRepository";
import searchRoutes from "./routes/searchRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { subscribe, closeEventBus, Events } from "@deelish-be/shared";
import type { PhotoDeletedPayload } from "@deelish-be/shared";

const app = express();

app.set("trust proxy", 1);
const PORT = process.env.PORT ?? 3005;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "search-service" }),
);

app.use("/", searchRoutes);
app.use(errorHandler);

// ─── Service Bus subscriptions ────────────────────────────────────────────────
// PHOTO_CREATED is not handled here — full metadata arrives via
// POST /search/index called directly by social-service after photo creation.

subscribe<PhotoDeletedPayload>(
  Events.PHOTO_DELETED,
  "search-sub",
  async (payload) => {
    console.log("🗑️ Removing from index:", payload.mediaId);
    searchRepository.remove(payload.mediaId);
  },
);

// ─── Graceful shutdown ────────────────────────────────────────────────────────
process.on("SIGTERM", async () => {
  await closeEventBus();
  process.exit(0);
});

runMigrations();
app.listen(PORT, () => console.log(`🔍 Search service running on :${PORT}`));

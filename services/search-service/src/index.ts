import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { runMigrations } from "./db/migrate";
import { searchRepository } from "./db/searchRepository";
import searchRoutes from "./routes/searchRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { eventBus, Events } from "@deelish-be/shared";
import type {
  PhotoCreatedPayload,
  PhotoDeletedPayload,
} from "@deelish-be/shared";

const app = express();
const PORT = process.env.PORT ?? 3005;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "search-service" }),
);

app.use("/", searchRoutes);
app.use(errorHandler);

// ─── Event bus listeners ──────────────────────────────────────────────────────

eventBus.on(Events.PHOTO_CREATED, (payload: PhotoCreatedPayload) => {
  console.log("🔍 Indexing photo:", payload.mediaId);
  // Note: at this point we only have mediaId and url from the media event.
  // The full metadata (title, caption, tags) arrives when the frontend calls
  // POST /social/photos — so Search service exposes an internal index endpoint
  // that Social service calls after creating the photo record.
  // For the mock, we index what we have and update when metadata arrives.
});

eventBus.on(Events.PHOTO_DELETED, (payload: PhotoDeletedPayload) => {
  console.log("🗑️ Removing from index:", payload.mediaId);
  searchRepository.remove(payload.mediaId);
});

runMigrations();
app.listen(PORT, () => console.log(`🔍 Search service running on :${PORT}`));

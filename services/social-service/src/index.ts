import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { runMigrations } from "./db/migrate";
import socialRoutes from "./routes/socialRoutes";
import { errorHandler } from "./middleware/errorHandler";

// Import the shared event bus from media service and listen for events
import { eventBus, Events } from "@deelish-be/shared";
import type {
  PhotoCreatedPayload,
  PhotoDeletedPayload,
} from "@deelish-be/shared";

import { photoRepository } from "./db/photoRepository";

const app = express();
const PORT = process.env.PORT ?? 3003;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "social-service" }),
);

app.use("/social", socialRoutes);
app.use(errorHandler);

// Wire event bus listeners
eventBus.on(Events.PHOTO_CREATED, (payload: PhotoCreatedPayload) => {
  console.log("📥 photo.created received:", payload.mediaId);
  // Photo record will be created when creator calls POST /social/photos
  // with the mediaId returned from media service upload
});

eventBus.on(Events.PHOTO_DELETED, (payload: PhotoDeletedPayload) => {
  console.log("🗑️ photo.deleted received:", payload.mediaId);
  photoRepository.delete(payload.mediaId);
});

runMigrations();
app.listen(PORT, () => console.log(`👥 Social service running on :${PORT}`));

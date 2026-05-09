import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { runMigrations } from "./db/migrate";
import { statsRepository } from "./db/statsRepository";
import analyticsRoutes from "./routes/analyticsRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { eventBus, Events } from "@deelish-be/shared";
import type {
  PhotoCreatedPayload,
  PhotoDeletedPayload,
} from "@deelish-be/shared";

const app = express();
const PORT = process.env.PORT ?? 3006;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "analytics-service" }),
);

app.use("/", analyticsRoutes);
app.use(errorHandler);

// ─── Event listeners ──────────────────────────────────────────────────────────

eventBus.on(Events.PHOTO_CREATED, (payload: PhotoCreatedPayload) => {
  console.log(
    "📊 photo.created → incrementing photo count for",
    payload.userId,
  );
  statsRepository.incrementPhotos(payload.userId);
});

eventBus.on(Events.PHOTO_DELETED, (payload: PhotoDeletedPayload) => {
  console.log(
    "📊 photo.deleted → decrementing photo count for",
    payload.userId,
  );
  statsRepository.decrementPhotos(payload.userId);
});

// Social service emits these — add to shared eventBus types
eventBus.on("comment.created", (payload: { photoOwnerId: string }) => {
  statsRepository.incrementComments(payload.photoOwnerId);
});

eventBus.on("rating.created", (payload: { photoOwnerId: string }) => {
  statsRepository.incrementRatings(payload.photoOwnerId);
});

runMigrations();
app.listen(PORT, () => console.log(`📊 Analytics service running on :${PORT}`));

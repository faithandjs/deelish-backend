import "dotenv/config";
import appInsights from "applicationinsights";
appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING).start();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { runMigrations } from "./db/migrate";
import { statsRepository } from "./db/statsRepository";
import analyticsRoutes from "./routes/analyticsRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { subscribe, closeEventBus, Events } from "@deelish-be/shared";
import type {
  PhotoCreatedPayload,
  PhotoDeletedPayload,
  CommentCreatedPayload,
  RatingCreatedPayload,
} from "@deelish-be/shared";

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT ?? 3006;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "analytics-service" }),
);

app.use("/", analyticsRoutes);
app.use(errorHandler);

// ─── Service Bus subscriptions ────────────────────────────────────────────────

subscribe<PhotoCreatedPayload>(
  Events.PHOTO_CREATED,
  "analytics-sub",
  async (payload) => {
    console.log(
      "📊 photo.created → incrementing photo count for",
      payload.userId,
    );
    statsRepository.incrementPhotos(payload.userId);
  },
);

subscribe<PhotoDeletedPayload>(
  Events.PHOTO_DELETED,
  "analytics-sub",
  async (payload) => {
    console.log(
      "📊 photo.deleted → decrementing photo count for",
      payload.userId,
    );
    statsRepository.decrementPhotos(payload.userId);
  },
);

subscribe<CommentCreatedPayload>(
  Events.COMMENT_CREATED,
  "analytics-sub",
  async (payload) => {
    statsRepository.incrementComments(payload.photoOwnerId);
  },
);

subscribe<RatingCreatedPayload>(
  Events.RATING_CREATED,
  "analytics-sub",
  async (payload) => {
    statsRepository.incrementRatings(payload.photoOwnerId);
  },
);

// ─── Graceful shutdown ────────────────────────────────────────────────────────
process.on("SIGTERM", async () => {
  await closeEventBus();
  process.exit(0);
});

runMigrations();
app.listen(PORT, () => console.log(`📊 Analytics service running on :${PORT}`));

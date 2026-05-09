import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import aiRoutes from "./routes/aiRoutes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT ?? 3004;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "ai-service" }),
);

app.use("/ai", aiRoutes);
app.use(errorHandler);

app.listen(PORT, () => console.log(`🤖 AI service running on :${PORT}`));

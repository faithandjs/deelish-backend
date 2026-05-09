import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
import type { IncomingMessage, ServerResponse } from "http";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { success: false, error: "Too many requests" },
});

app.use(globalLimiter);

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "gateway" });
});

function proxy(target: string) {
  return createProxyMiddleware<IncomingMessage, ServerResponse>({
    target,
    changeOrigin: true,
    on: {
      error: (err, _req, res) => {
        const response = res as Response;
        console.error(`Proxy error → ${target}:`, (err as Error).message);
        if (!response.headersSent) {
          response.status(502).json({
            success: false,
            error: "Service unavailable",
            code: "GATEWAY_ERROR",
          });
        }
      },
    },
  });
}

app.use(
  "/auth",
  proxy(process.env.AUTH_SERVICE_URL ?? "http://localhost:3001"),
);
app.use(
  "/media",
  proxy(process.env.MEDIA_SERVICE_URL ?? "http://localhost:3002"),
);
app.use(
  "/social",
  proxy(process.env.SOCIAL_SERVICE_URL ?? "http://localhost:3003"),
);
app.use("/ai", proxy(process.env.AI_SERVICE_URL ?? "http://localhost:3004"));
app.use(
  "/search",
  proxy(process.env.SEARCH_SERVICE_URL ?? "http://localhost:3005"),
);
app.use(
  "/analytics",
  proxy(process.env.ANALYTICS_SERVICE_URL ?? "http://localhost:3006"),
);

app.use((_req: Request, res: Response) => {
  res
    .status(404)
    .json({ success: false, error: "Route not found", code: "NOT_FOUND" });
});

app.listen(PORT, () => console.log(`🚪 Gateway running on :${PORT}`));

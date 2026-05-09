import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
import type { IncomingMessage, ServerResponse } from "http";
import "dotenv/config";

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

// Strip prefix middleware — removes /auth, /media etc before proxying
function stripPrefix(prefix: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.url = req.url.replace(new RegExp(`^${prefix}`), "") || "/";
    next();
  };
}

function makeProxy(target: string) {
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

const AUTH_URL = process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";
const MEDIA_URL = process.env.MEDIA_SERVICE_URL ?? "http://localhost:3002";
const SOCIAL_URL = process.env.SOCIAL_SERVICE_URL ?? "http://localhost:3003";
const AI_URL = process.env.AI_SERVICE_URL ?? "http://localhost:3004";
const SEARCH_URL = process.env.SEARCH_SERVICE_URL ?? "http://localhost:3005";
const ANALYTICS_URL =
  process.env.ANALYTICS_SERVICE_URL ?? "http://localhost:3006";

app.use("/auth", stripPrefix("/auth"), makeProxy(AUTH_URL));
app.use("/media", stripPrefix("/media"), makeProxy(MEDIA_URL));
app.use("/social", stripPrefix("/social"), makeProxy(SOCIAL_URL));
app.use("/ai", stripPrefix("/ai"), makeProxy(AI_URL));
app.use("/search", stripPrefix("/search"), makeProxy(SEARCH_URL));
app.use("/analytics", stripPrefix("/analytics"), makeProxy(ANALYTICS_URL));

app.use((_req: Request, res: Response) => {
  res
    .status(404)
    .json({ success: false, error: "Route not found", code: "NOT_FOUND" });
});

app.listen(PORT, () => console.log(`🚪 Gateway running on :${PORT}`));

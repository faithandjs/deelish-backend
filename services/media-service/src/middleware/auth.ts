import type { Request, Response, NextFunction } from "express";
import { createAuthMiddleware, requireRole } from "@deelish-be/shared";
import { getPublicKey } from "../utils/publicKey";

// Lazy-initialised middleware — public key loads before first request
let _authMiddleware: ReturnType<typeof createAuthMiddleware> | null = null;

async function ensureMiddleware() {
  if (!_authMiddleware) {
    const key = await getPublicKey();
    _authMiddleware = createAuthMiddleware(key);
  }
  return _authMiddleware;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const mw = await ensureMiddleware();
  mw(req, res, next);
}

export { requireRole };

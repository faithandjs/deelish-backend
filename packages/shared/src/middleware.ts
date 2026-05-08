import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, extractBearerToken } from "./jwt";
import type { JwtPayload, UserRole } from "./types";
import { ForbiddenError, UnauthorizedError } from "./errors";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function createAuthMiddleware(publicKey: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      req.user = verifyAccessToken(token, publicKey);
      next();
    } catch {
      next(new UnauthorizedError("Invalid or expired token"));
    }
  };
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Requires role: ${roles.join(" or ")}`));
    }
    next();
  };
}

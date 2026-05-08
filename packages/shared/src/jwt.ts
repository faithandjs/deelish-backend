import jwt from "jsonwebtoken";
import type { JwtPayload } from "./types";

export function verifyAccessToken(
  token: string,
  publicKey: string,
): JwtPayload {
  return jwt.verify(token, publicKey, { algorithms: ["RS256"] }) as JwtPayload;
}

export function extractBearerToken(authHeader: string | undefined): string {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("No bearer token");
  }
  return authHeader.slice(7);
}

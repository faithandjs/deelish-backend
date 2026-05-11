import * as jwt from "jsonwebtoken";
import type { JwtPayload, UserRole } from "@deelish-be/shared";

function loadKey(base64Env?: string, filePath?: string): Buffer {
  if (base64Env) return Buffer.from(base64Env, "base64");
  if (filePath) {
    const fs = require("fs");
    return fs.readFileSync(filePath);
  }
  throw new Error("No key source configured");
}

const privateKey = loadKey(
  process.env.JWT_PRIVATE_KEY_BASE64,
  process.env.JWT_PRIVATE_KEY_PATH,
);

const publicKey = loadKey(
  process.env.JWT_PUBLIC_KEY_BASE64,
  process.env.JWT_PUBLIC_KEY_PATH,
);

export { publicKey };

export interface TokenUser {
  id: string;
  username: string;
  role: UserRole;
}

export function issueAccessToken(user: TokenUser): string {
  return jwt.sign({ username: user.username, role: user.role }, privateKey, {
    algorithm: "RS256",
    expiresIn: "24h",
    subject: user.id,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, publicKey, { algorithms: ["RS256"] }) as JwtPayload;
}

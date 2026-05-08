import jwt from "jsonwebtoken";
import fs from "fs";
import type { JwtPayload, UserRole } from "@deelish-be/shared";

const privateKey = fs.readFileSync(process.env.JWT_PRIVATE_KEY_PATH!);
const publicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH!);

export { publicKey };

export interface TokenUser {
  id: string;
  username: string;
  role: UserRole;
}

export function issueAccessToken(user: TokenUser): string {
  return jwt.sign(
    {
      username: user.username,
      role: user.role,
    },
    privateKey,
    {
      algorithm: "RS256",
      expiresIn: "24h",
      subject: user.id,
    },
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, publicKey, {
    algorithms: ["RS256"],
  }) as JwtPayload;
}

import bcrypt from "bcryptjs";
import { userRepository } from "../db/userRepository";
import { issueAccessToken } from "../utils/token";
import { ConflictError, UnauthorizedError } from "@deelish-be/shared";
import type { RegisterInput, LoginInput } from "../utils/schema";

export const authService = {
  async register(input: RegisterInput) {
    const existing = await userRepository.findByUsername(input.username);
    if (existing) throw new ConflictError("Username already taken");

    const hashedPassword = await bcrypt.hash(
      input.password,
      Number(process.env.BCRYPT_ROUNDS ?? 10),
    );
    const user = await userRepository.create({
      ...input,
      password: hashedPassword,
    });
    const accessToken = issueAccessToken(user);

    return { accessToken, user: sanitize(user) };
  },

  async login(input: LoginInput) {
    const user = await userRepository.findByUsername(input.username);
    if (!user) throw new UnauthorizedError("Invalid credentials");

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) throw new UnauthorizedError("Invalid credentials");

    const accessToken = issueAccessToken(user);
    return { accessToken, user: sanitize(user) };
  },

  async logout() {
    return { message: "Logged out" };
  },
};

function sanitize(user: {
  id: string;
  username: string;
  role: string;
  created_at: string;
}) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.created_at,
  };
}

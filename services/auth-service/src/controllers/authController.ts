import type { Request, Response, NextFunction } from "express";
import { authService } from "../services/authService";
import { RegisterSchema, LoginSchema } from "../utils/schema";
import { ValidationError } from "@deelish-be/shared";
import { publicKey } from "../utils/token";

function validate<T>(
  schema: {
    safeParse: (d: unknown) => {
      success: boolean;
      data?: T;
      error?: { message: string };
    };
  },
  data: unknown,
): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ValidationError(result.error!.message);
  return result.data!;
}

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const input = validate(RegisterSchema, req.body);
      const result = await authService.register(input);
      res.status(201).json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const input = validate(LoginSchema, req.body);
      const result = await authService.login(input);
      res.json({ success: true, data: result });
    } catch (e) {
      next(e);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // const { refreshToken } = validate(RefreshSchema, req.body);
      // await authService.logout(refreshToken);
      // res.json({ success: true, message: "Logged out" });
    } catch (e) {
      next(e);
    }
  },

  // Exposes public key so other services can validate JWTs without calling auth on every request
  getPublicKey(_req: Request, res: Response) {
    res.json({ success: true, data: { publicKey: publicKey.toString() } });
  },
};

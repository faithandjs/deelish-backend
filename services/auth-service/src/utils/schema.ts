import { z } from "zod";

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Username: letters, numbers, underscores only"),

  password: z.string().min(8, "Password must be at least 8 characters"),

  role: z.enum(["creator", "consumer"]),
});

export const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

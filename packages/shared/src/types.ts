export type UserRole = "creator" | "consumer";

export interface User {
  id: string;
  // email: string;
  username: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  sub: string; // userId
  email: string;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface ApiResponse<T = null> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

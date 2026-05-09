export type UserRole = "creator" | "consumer";

export interface User {
  id: string;
  username: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  sub: string;
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

import type { Request, Response, NextFunction } from "express";
import { AppError } from "@deelish-be/shared";
import { MulterError } from "multer";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof MulterError) {
    return res.status(400).json({
      success: false,
      error:
        err.code === "LIMIT_FILE_SIZE"
          ? "File too large (max 10MB)"
          : err.message,
      code: "UPLOAD_ERROR",
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    code: "INTERNAL_ERROR",
  });
}

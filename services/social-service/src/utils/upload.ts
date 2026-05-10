// services/social-service/src/utils/upload.ts
import multer from "multer";
import { AppError } from "@deelish-be/shared";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 10;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          `File type not allowed. Accepted: ${ALLOWED_TYPES.join(", ")}`,
          400,
          "INVALID_FILE_TYPE",
        ),
      );
    }
  },
});

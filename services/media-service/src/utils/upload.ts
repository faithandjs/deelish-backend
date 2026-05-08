import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { AppError } from "@deelish-be/shared";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 10;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, process.env.UPLOADS_DIR ?? "./uploads");
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const upload = multer({
  storage,
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

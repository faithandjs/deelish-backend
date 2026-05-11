import multer from "multer";
import { BlobServiceClient } from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { AppError } from "@deelish-be/shared";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 10;

// ── Azure Blob client ────────────────────────────────────────────────────────
const connectionString = process.env.AZURE_BLOB_CONNECTION_STRING!;
const containerName = process.env.AZURE_BLOB_CONTAINER ?? "photos";

export const blobServiceClient =
  BlobServiceClient.fromConnectionString(connectionString);
export const containerClient =
  blobServiceClient.getContainerClient(containerName);

// ── Upload buffer to Azure Blob ──────────────────────────────────────────────
export async function uploadToBlob(
  buffer: Buffer,
  originalName: string,
  mimetype: string,
): Promise<{ filename: string; url: string }> {
  const ext = path.extname(originalName);
  const filename = `${uuidv4()}${ext}`;
  const blockBlobClient = containerClient.getBlockBlobClient(filename);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimetype },
  });

  return { filename, url: blockBlobClient.url };
}

// ── Multer — memory storage (buffer forwarded to Blob, never written to disk) ─
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

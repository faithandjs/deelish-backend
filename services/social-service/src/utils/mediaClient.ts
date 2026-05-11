// services/social-service/src/utils/mediaClient.ts

export interface MediaRecord {
  id: string;
  user_id: string;
  filename: string;
  url: string;
  original_name: string;
  mimetype: string;
  size: number;
  uploaded_at: string;
}

/**
 * Forwards a file buffer to media-service and returns the created media record.
 * Passes the creator's JWT through so media-service can auth + ownership-check.
 */
export async function uploadToMedia(
  file: Express.Multer.File,
  authHeader: string,
): Promise<MediaRecord> {
  const MEDIA_URL = process.env.MEDIA_SERVICE_URL ?? "http://localhost:3002";
  const formData = new FormData();
  const blob = new Blob([file.buffer as unknown as ArrayBuffer], {
    type: file.mimetype,
  });
  formData.append("image", blob, file.originalname);

  // formData.append("image", file.buffer, {
  //   filename: file.originalname,
  //   contentType: file.mimetype,
  // });

  const res = await fetch(`${MEDIA_URL}/upload`, {
    method: "POST",
    headers: { Authorization: authHeader }, // Content-Type set automatically by fetch
    body: formData,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `Media upload failed: ${res.status}`);
  }

  const json = (await res.json()) as { data: MediaRecord };
  return json.data; // ← this was missing entirely
}

/**
 * Tells media-service to delete a file. Fire and forget — we don't fail
 * the social delete if media is slow or temporarily down.
 */
export function deleteFromMedia(mediaId: string, authHeader: string): void {
  const MEDIA_URL = process.env.MEDIA_SERVICE_URL ?? "http://localhost:3002";
  fetch(`${MEDIA_URL}/${mediaId}`, {
    // ← /media/:id → /:id
    method: "DELETE",
    headers: { Authorization: authHeader },
  }).catch((err) => {
    console.error(`[mediaClient] Failed to delete mediaId ${mediaId}:`, err);
  });
}

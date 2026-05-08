import { db } from "./database";
import fs from "fs";

export function runMigrations() {
  // Ensure uploads folder exists
  const uploadsDir = process.env.UPLOADS_DIR ?? "./uploads";
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  db.exec(`
    CREATE TABLE IF NOT EXISTS photos (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      filename     TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mimetype     TEXT NOT NULL,
      size         INTEGER NOT NULL,
      url          TEXT NOT NULL,
      uploaded_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
  `);

  console.log("✅ Media DB migrations complete");
}

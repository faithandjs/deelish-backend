import { db } from "./database";

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS creator_stats (
      user_id       TEXT PRIMARY KEY,
      photo_count   INTEGER NOT NULL DEFAULT 0,
      total_ratings INTEGER NOT NULL DEFAULT 0,
      comment_count INTEGER NOT NULL DEFAULT 0,
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log("✅ Analytics DB migrations complete");
}

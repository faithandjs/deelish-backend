import { db } from "./database";

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS photos (
      id           TEXT PRIMARY KEY,
      media_id     TEXT UNIQUE NOT NULL,
      user_id      TEXT NOT NULL,
      username     TEXT NOT NULL,
      url          TEXT NOT NULL,
      title        TEXT NOT NULL,
      caption      TEXT,
      tags         TEXT NOT NULL DEFAULT '[]',
      location     TEXT,
      people       TEXT NOT NULL DEFAULT '[]',
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS comments (
      id         TEXT PRIMARY KEY,
      photo_id   TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      user_id    TEXT NOT NULL,
      username   TEXT NOT NULL,
      body       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id         TEXT PRIMARY KEY,
      photo_id   TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      user_id    TEXT UNIQUE NOT NULL,
      value      INTEGER NOT NULL CHECK(value BETWEEN 1 AND 5),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(photo_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_photos_user_id    ON photos(user_id);
    CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at);
    CREATE INDEX IF NOT EXISTS idx_comments_photo_id ON comments(photo_id);
    CREATE INDEX IF NOT EXISTS idx_ratings_photo_id  ON ratings(photo_id);
  `);

  console.log("✅ Social DB migrations complete");
}

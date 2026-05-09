import { db } from "./database";

export function runMigrations() {
  db.exec(`
    -- FTS5 virtual table — this IS the search index
    -- Each row is a photo document. SQLite handles tokenisation internally.
    CREATE VIRTUAL TABLE IF NOT EXISTS photos_fts USING fts5(
      photo_id,
      title,
      caption,
      tags,
      location,
      people,
      username,
      url,
      created_at UNINDEXED,
      tokenize = 'porter ascii'
    );
  `);

  console.log("✅ Search DB migrations complete");
}

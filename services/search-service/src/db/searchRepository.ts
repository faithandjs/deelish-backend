import { db } from "./database";

export interface SearchDocument {
  photo_id: string;
  title: string;
  caption: string;
  tags: string; // space-separated string for FTS
  location: string;
  people: string;
  username: string;
  url: string;
  created_at: string;
}

export interface SearchHit {
  photo_id: string;
  title: string;
  caption: string;
  tags: string;
  location: string;
  people: string;
  username: string;
  url: string;
  created_at: string;
  rank: number;
}

export const searchRepository = {
  // Called when photo.created event fires
  index(doc: SearchDocument): void {
    // Upsert — delete first, then insert
    db.prepare(`DELETE FROM photos_fts WHERE photo_id = ?`).run(doc.photo_id);
    db.prepare(
      `
      INSERT INTO photos_fts (photo_id, title, caption, tags, location, people, username, url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      doc.photo_id,
      doc.title,
      doc.caption ?? "",
      doc.tags,
      doc.location ?? "",
      doc.people,
      doc.username,
      doc.url,
      doc.created_at,
    );
  },

  // Called when photo.deleted event fires
  remove(photoId: string): void {
    db.prepare(`DELETE FROM photos_fts WHERE photo_id = ?`).run(photoId);
  },

  // Full-text query with pagination
  query(term: string, limit: number, offset: number): SearchHit[] {
    // FTS5 MATCH syntax — wrapping in quotes handles multi-word phrases
    const safeTerm = `"${term.replace(/"/g, '""')}"`;
    return db
      .prepare(
        `
      SELECT *, rank
      FROM photos_fts
      WHERE photos_fts MATCH ?
      ORDER BY rank
      LIMIT ? OFFSET ?
    `,
      )
      .all(safeTerm, limit, offset) as SearchHit[];
  },

  // Count total matches for pagination
  count(term: string): number {
    const safeTerm = `"${term.replace(/"/g, '""')}"`;
    const row = db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM photos_fts
      WHERE photos_fts MATCH ?
    `,
      )
      .get(safeTerm) as { count: number };
    return row.count;
  },
};

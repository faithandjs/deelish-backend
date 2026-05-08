import { db } from "./database";
import { v4 as uuidv4 } from "uuid";

export interface DbPhoto {
  id: string;
  media_id: string;
  user_id: string;
  username: string;
  url: string;
  title: string;
  caption: string | null;
  tags: string; // JSON string — parsed on the way out
  location: string | null;
  people: string; // JSON string
  created_at: string;
}

export interface PhotoWithStats extends DbPhoto {
  avg_rating: number;
  rating_count: number;
  comment_count: number;
}

export const photoRepository = {
  create(data: {
    mediaId: string;
    userId: string;
    username: string;
    url: string;
    title: string;
    caption?: string;
    tags: string[];
    location?: string;
    people: string[];
  }): DbPhoto {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO photos (id, media_id, user_id, username, url, title, caption, tags, location, people, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
      data.mediaId,
      data.userId,
      data.username,
      data.url,
      data.title,
      data.caption ?? null,
      JSON.stringify(data.tags),
      data.location ?? null,
      JSON.stringify(data.people),
      now,
    );
    return this.findById(id)!;
  },

  findById(id: string): DbPhoto | undefined {
    return db.prepare("SELECT * FROM photos WHERE id = ?").get(id) as
      | DbPhoto
      | undefined;
  },

  findByMediaId(mediaId: string): DbPhoto | undefined {
    return db
      .prepare("SELECT * FROM photos WHERE media_id = ?")
      .get(mediaId) as DbPhoto | undefined;
  },

  // Feed — paginated, newest first, with aggregated stats
  getFeed(limit: number, offset: number): PhotoWithStats[] {
    return db
      .prepare(
        `
      SELECT
        p.*,
        COALESCE(AVG(r.value), 0)  AS avg_rating,
        COUNT(DISTINCT r.id)        AS rating_count,
        COUNT(DISTINCT c.id)        AS comment_count
      FROM photos p
      LEFT JOIN ratings r ON r.photo_id = p.id
      LEFT JOIN comments c ON c.photo_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `,
      )
      .all(limit, offset) as PhotoWithStats[];
  },

  getTotalCount(): number {
    const row = db.prepare("SELECT COUNT(*) as count FROM photos").get() as {
      count: number;
    };
    return row.count;
  },

  // Simple keyword search across title, caption, tags
  search(query: string, limit: number, offset: number): PhotoWithStats[] {
    const term = `%${query}%`;
    return db
      .prepare(
        `
      SELECT
        p.*,
        COALESCE(AVG(r.value), 0) AS avg_rating,
        COUNT(DISTINCT r.id)       AS rating_count,
        COUNT(DISTINCT c.id)       AS comment_count
      FROM photos p
      LEFT JOIN ratings r ON r.photo_id = p.id
      LEFT JOIN comments c ON c.photo_id = p.id
      WHERE p.title   LIKE ?
         OR p.caption LIKE ?
         OR p.tags    LIKE ?
         OR p.people  LIKE ?
         OR p.location LIKE ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `,
      )
      .all(term, term, term, term, term, limit, offset) as PhotoWithStats[];
  },

  delete(mediaId: string): void {
    db.prepare("DELETE FROM photos WHERE media_id = ?").run(mediaId);
  },
};

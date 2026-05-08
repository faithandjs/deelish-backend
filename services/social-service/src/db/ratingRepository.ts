import { db } from "./database";
import { v4 as uuidv4 } from "uuid";

export interface DbRating {
  id: string;
  photo_id: string;
  user_id: string;
  value: number;
  created_at: string;
}

export const ratingRepository = {
  // Upsert — user can change their rating
  upsert(data: { photoId: string; userId: string; value: number }): DbRating {
    const existing = db
      .prepare("SELECT * FROM ratings WHERE photo_id = ? AND user_id = ?")
      .get(data.photoId, data.userId) as DbRating | undefined;

    if (existing) {
      db.prepare("UPDATE ratings SET value = ? WHERE id = ?").run(
        data.value,
        existing.id,
      );
      return db
        .prepare("SELECT * FROM ratings WHERE id = ?")
        .get(existing.id) as DbRating;
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO ratings (id, photo_id, user_id, value, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(id, data.photoId, data.userId, data.value, now);
    return db.prepare("SELECT * FROM ratings WHERE id = ?").get(id) as DbRating;
  },

  getAverage(photoId: string): { avg: number; count: number } {
    const row = db
      .prepare(
        `
      SELECT COALESCE(AVG(value), 0) as avg, COUNT(*) as count
      FROM ratings WHERE photo_id = ?
    `,
      )
      .get(photoId) as { avg: number; count: number };
    return row;
  },

  getUserRating(photoId: string, userId: string): DbRating | undefined {
    return db
      .prepare("SELECT * FROM ratings WHERE photo_id = ? AND user_id = ?")
      .get(photoId, userId) as DbRating | undefined;
  },
};

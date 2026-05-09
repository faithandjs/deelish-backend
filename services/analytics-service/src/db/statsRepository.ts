import { db } from "./database";

export interface CreatorStats {
  user_id: string;
  photo_count: number;
  total_ratings: number;
  comment_count: number;
  updated_at: string;
}

export const statsRepository = {
  // Ensures a row exists for this user
  ensure(userId: string): void {
    db.prepare(
      `
      INSERT OR IGNORE INTO creator_stats (user_id)
      VALUES (?)
    `,
    ).run(userId);
  },

  get(userId: string): CreatorStats | undefined {
    return db
      .prepare("SELECT * FROM creator_stats WHERE user_id = ?")
      .get(userId) as CreatorStats | undefined;
  },

  incrementPhotos(userId: string): void {
    this.ensure(userId);
    db.prepare(
      `
      UPDATE creator_stats
      SET photo_count = photo_count + 1,
          updated_at  = datetime('now')
      WHERE user_id = ?
    `,
    ).run(userId);
  },

  decrementPhotos(userId: string): void {
    this.ensure(userId);
    db.prepare(
      `
      UPDATE creator_stats
      SET photo_count = MAX(0, photo_count - 1),
          updated_at  = datetime('now')
      WHERE user_id = ?
    `,
    ).run(userId);
  },

  incrementRatings(userId: string): void {
    this.ensure(userId);
    db.prepare(
      `
      UPDATE creator_stats
      SET total_ratings = total_ratings + 1,
          updated_at    = datetime('now')
      WHERE user_id = ?
    `,
    ).run(userId);
  },

  incrementComments(userId: string): void {
    this.ensure(userId);
    db.prepare(
      `
      UPDATE creator_stats
      SET comment_count = comment_count + 1,
          updated_at    = datetime('now')
      WHERE user_id = ?
    `,
    ).run(userId);
  },
};

import { db } from "./database";
import { v4 as uuidv4 } from "uuid";

export interface DbComment {
  id: string;
  photo_id: string;
  user_id: string;
  username: string;
  body: string;
  created_at: string;
}

export const commentRepository = {
  create(data: {
    photoId: string;
    userId: string;
    username: string;
    body: string;
  }): DbComment {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO comments (id, photo_id, user_id, username, body, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(id, data.photoId, data.userId, data.username, data.body, now);
    return db
      .prepare("SELECT * FROM comments WHERE id = ?")
      .get(id) as DbComment;
  },

  findByPhotoId(photoId: string): DbComment[] {
    return db
      .prepare(
        `
      SELECT * FROM comments WHERE photo_id = ? ORDER BY created_at ASC
    `,
      )
      .all(photoId) as DbComment[];
  },
};

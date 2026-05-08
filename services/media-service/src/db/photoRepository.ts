import { db } from "./database";
import { v4 as uuidv4 } from "uuid";

export interface DbPhoto {
  id: string;
  user_id: string;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  url: string;
  uploaded_at: string;
}

export const photoRepository = {
  create(data: Omit<DbPhoto, "id" | "uploaded_at">): DbPhoto {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO photos (id, user_id, filename, original_name, mimetype, size, url, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
      data.user_id,
      data.filename,
      data.original_name,
      data.mimetype,
      data.size,
      data.url,
      now,
    );
    return this.findById(id)!;
  },

  findById(id: string): DbPhoto | undefined {
    return db.prepare("SELECT * FROM photos WHERE id = ?").get(id) as
      | DbPhoto
      | undefined;
  },

  findByUserId(userId: string): DbPhoto[] {
    return db
      .prepare(
        "SELECT * FROM photos WHERE user_id = ? ORDER BY uploaded_at DESC",
      )
      .all(userId) as DbPhoto[];
  },

  delete(id: string): void {
    db.prepare("DELETE FROM photos WHERE id = ?").run(id);
  },

  updateFilename(id: string, originalName: string): DbPhoto | undefined {
    db.prepare("UPDATE photos SET original_name = ? WHERE id = ?").run(
      originalName,
      id,
    );
    return this.findById(id);
  },
};

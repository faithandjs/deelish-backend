import { db } from "./database";
import { v4 as uuidv4 } from "uuid";
import type { UserRole } from "@deelish-be/shared";

export interface DbUser {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export const userRepository = {
  findById(id: string): DbUser | undefined {
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
      | DbUser
      | undefined;
  },

  findByUsername(username: string): DbUser | undefined {
    return db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as DbUser | undefined;
  },

  create(data: { username: string; password: string; role: UserRole }): DbUser {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `
      INSERT INTO users (
        id,
        username,
        password,
        role,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(id, data.username, data.password, data.role, now, now);

    return this.findById(id)!;
  },
};

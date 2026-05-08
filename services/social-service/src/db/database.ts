import DatabaseConstructor, { Database } from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = process.env.DB_PATH ?? "./data/social.db";
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db: Database = new DatabaseConstructor(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

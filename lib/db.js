import Database from 'better-sqlite3';
import path from "path";
import fs from "fs-extra";

const dbPath = path.join(
  process.cwd(),
  "data",
  "crawl.db"
);

fs.ensureDirSync(path.dirname(dbPath));

const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS crawl (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT,
  display_mode TEXT,
  video_path TEXT,
  data TEXT,
  created_at TEXT
)
`);

export default db;
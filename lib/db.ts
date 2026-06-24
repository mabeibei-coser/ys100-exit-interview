import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { initSchema } from "./ddl.mjs";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DEFAULT_DB = path.join(DATA_DIR, "ys100-exit-interview.db");
const DB_PATH = process.env.DB_PATH ?? DEFAULT_DB;

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "uploads"), { recursive: true });
  _db = new Database(DB_PATH);
  initSchema(_db); // WAL + busy_timeout + 建表（与种子脚本共用 lib/ddl.mjs）
  return _db;
}

export function now(): number {
  return Date.now();
}

// 建/重置超级管理员。用法：
//   node scripts/init-super.mjs "你的名字" "你的口令"
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { initSchema } from "../lib/ddl.mjs";

const name = process.argv[2];
const password = process.argv[3];
if (!name || !password) {
  console.error('用法: node scripts/init-super.mjs "名字" "口令"');
  process.exit(1);
}

const DB_PATH = process.env.DB_PATH ?? path.resolve(process.cwd(), "data", "ys100-exit-interview.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
initSchema(db);

const hash = bcrypt.hashSync(password, 10);
const ts = Date.now();
const existing = db.prepare("SELECT id FROM staff WHERE name = ?").get(name);
if (existing) {
  db.prepare(
    "UPDATE staff SET role='super', is_super=1, password_hash=?, active=1, updated_at=? WHERE id=?"
  ).run(hash, ts, existing.id);
  console.log(`已更新超管：${name}`);
} else {
  db.prepare(
    "INSERT INTO staff (name, role, is_super, password_hash, active, created_at, updated_at) VALUES (?, 'super', 1, ?, 1, ?, ?)"
  ).run(name, hash, ts, ts);
  console.log(`已创建超管：${name}`);
}
console.log(`数据库：${DB_PATH}`);

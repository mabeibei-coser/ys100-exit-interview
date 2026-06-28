// 建表 DDL「单一事实源」——lib/db.ts（运行时）与 scripts/*.mjs（种子/初始化）共用，
// 避免两处 schema 漂移。改表结构只改这里。
// interviews 表＝六维诊断记录：命中点/每维原话各存一个 JSON 列；改字段对 lib/schema.ts。

export const DDL = [
  // ---- staff：人员 + 权限 ----
  `CREATE TABLE IF NOT EXISTS staff (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL UNIQUE,
     role TEXT NOT NULL DEFAULT 'caller',
     is_super INTEGER NOT NULL DEFAULT 0,
     password_hash TEXT,
     active INTEGER NOT NULL DEFAULT 1,
     session_invalid_after INTEGER,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   )`,

  // ---- targets：名单 + 派工 ----
  `CREATE TABLE IF NOT EXISTS targets (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     phone TEXT,
     region TEXT,
     project TEXT,
     position TEXT,
     line TEXT,
     age_band TEXT,
     gender TEXT,
     hire_date TEXT,
     leave_date TEXT,
     tenure_months REAL,
     leave_type TEXT,
     assigned_to TEXT,
     assigned_staff_id INTEGER,
     call_status TEXT NOT NULL DEFAULT 'pending',
     interview_id INTEGER,
     import_batch TEXT,
     note TEXT,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_targets_assigned ON targets(assigned_staff_id, call_status)`,
  `CREATE INDEX IF NOT EXISTS idx_targets_batch ON targets(import_batch)`,

  // ---- interviews：六维诊断记录（与诊断表 1:1）----
  `CREATE TABLE IF NOT EXISTS interviews (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     uuid TEXT UNIQUE,
     target_id INTEGER,
     status TEXT NOT NULL DEFAULT 'draft',
     name TEXT,
     gender TEXT,
     region TEXT,
     project TEXT,
     position TEXT,
     line TEXT,
     age_band TEXT,
     hire_date TEXT,
     leave_date TEXT,
     tenure_months REAL,
     interviewer TEXT,
     contact_status TEXT,
     leave_type TEXT,
     hits_json TEXT,
     quotes_json TEXT,
     retainable TEXT,
     destination TEXT,
     top_dim TEXT,
     recorder_staff_id INTEGER,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_interviews_target ON interviews(target_id)`,
  `CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status, created_at DESC)`,
];

// 既有库（旧 9 维结构）平滑迁移：只 ADD 缺失的新列，不 DROP 旧列、不动 targets 数据。
// 旧 score_* 等列保留为死列、无害；新表读写只走下面这套列。
const ENSURE_COLUMNS = {
  targets: [["line", "TEXT"]],
  interviews: [
    ["line", "TEXT"],
    ["hits_json", "TEXT"],
    ["quotes_json", "TEXT"],
    ["top_dim", "TEXT"],
  ],
};

function ensureColumns(db) {
  for (const [table, cols] of Object.entries(ENSURE_COLUMNS)) {
    let existing;
    try {
      existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((r) => r.name));
    } catch {
      continue; // 表还不存在（CREATE 已含新列），跳过
    }
    for (const [name, type] of cols) {
      if (!existing.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
    }
  }
}

/** 在一个 better-sqlite3 Database 实例上设置 pragma、建表、补迁移列。 */
export function initSchema(db) {
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  for (const stmt of DDL) db.exec(stmt);
  ensureColumns(db);
}

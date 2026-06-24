// 建表 DDL「单一事实源」——lib/db.ts（运行时）与 scripts/*.mjs（种子/初始化）共用，
// 避免两处 schema 漂移。改表结构只改这里。

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

  // ---- interviews：访谈记录（与纸质记录表 1:1）----
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
     age_band TEXT,
     hire_date TEXT,
     leave_date TEXT,
     tenure_months REAL,
     interviewer TEXT,
     contact_status TEXT,
     leave_type TEXT,
     score_salary INTEGER,
     score_social INTEGER,
     score_schedule INTEGER,
     score_manager INTEGER,
     score_promotion INTEGER,
     score_commute INTEGER,
     score_family INTEGER,
     score_prospect INTEGER,
     score_colleague INTEGER,
     main_reason TEXT,
     pay_detail_json TEXT,
     destination TEXT,
     attraction_json TEXT,
     income_compare TEXT,
     income_gap INTEGER,
     retainable TEXT,
     retain_condition TEXT,
     recommend TEXT,
     rehire TEXT,
     verbatim_quote TEXT,
     one_line_summary TEXT,
     recorder_staff_id INTEGER,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_interviews_target ON interviews(target_id)`,
  `CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status, created_at DESC)`,
];

/** 在一个 better-sqlite3 Database 实例上设置 pragma 并建表。 */
export function initSchema(db) {
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  for (const stmt of DDL) db.exec(stmt);
}

// 造测试数据（人员 + 派工 + 六维已完成访谈），方便本机跑通 /mine、记录表、后台报告。
// 用法：node scripts/seed.mjs    （只动自己的 seed 行，不碰真实导入的名单；真上线前清空 data/ 重来）
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { initSchema } from "../lib/ddl.mjs";

const DB_PATH = process.env.DB_PATH ?? path.resolve(process.cwd(), "data", "ys100-exit-interview.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
initSchema(db);
const ts = Date.now();

// 稳定 point key（与 lib/schema.ts 对齐；seed 是纯 JS 不便 import TS，故就地维护一份）
const DIM_POINTS = {
  lead: ["lead_nocomm", "lead_noresp", "lead_nohelp", "lead_rude", "lead_unfair"],
  recruit: ["recruit_content", "recruit_pay", "recruit_schedule", "recruit_welfare", "recruit_gap"],
  onboard: ["onboard_noteach", "onboard_fake", "onboard_nostd", "onboard_nocert", "onboard_exclude", "onboard_notool"],
  appraisal: ["appraisal_nodetail", "appraisal_unfair", "appraisal_fine"],
  intensity: ["intensity_workload", "intensity_overtime", "intensity_understaff", "intensity_sudden", "intensity_external"],
  care: ["care_nopraise", "care_noreward", "care_badvibe", "care_noincome", "care_lowpay"],
  personal: ["personal_family", "personal_health", "personal_commute", "personal_career", "personal_other"],
};
const QUOTES = {
  intensity: "三天一个夜班，一个人顶仨人的活，铁打的也扛不住。",
  lead: "有事找组长永远找不着人，找着了也是“你自己看着办”，寒心。",
  care: "干一年没句表扬，增收的活儿也轮不上，到手比隔壁项目少六七百。",
  appraisal: "每月扣钱也不说为啥扣，问了还嫌烦，干着没底。",
  recruit: "招的时候说有食堂、排班固定，来了啥也没有，班还天天变。",
  onboard: "没人教，遇到不会的操作也没人管，全靠自己摸。",
  personal: "家里老人要照顾，离家又远，实在跑不动。",
};

function upsertStaff(name, role, password) {
  const hash = password ? bcrypt.hashSync(password, 10) : null;
  const isSuper = role === "super" ? 1 : 0;
  const row = db.prepare("SELECT id FROM staff WHERE name=?").get(name);
  if (row) {
    db.prepare("UPDATE staff SET role=?, is_super=?, password_hash=COALESCE(?,password_hash), active=1, updated_at=? WHERE id=?")
      .run(role, isSuper, hash, ts, row.id);
    return row.id;
  }
  return db.prepare("INSERT INTO staff (name,role,is_super,password_hash,active,created_at,updated_at) VALUES (?,?,?,?,1,?,?)")
    .run(name, role, isSuper, hash, ts, ts).lastInsertRowid;
}

upsertStaff("管理员小测", "super", "admin123");
upsertStaff("露妮", "admin", "luni123");
const callers = ["毛毛", "利丹", "小李", "小王"];
const callerIds = {};
for (const c of callers) callerIds[c] = upsertStaff(c, "caller", null);

// 项目 → 条线（考核维仅管家+工程问）
const PROJECTS = [
  ["鞍山中冶玉峦湾", "管家"],
  ["天津翰悦园", "管家"],
  ["沈阳铂悦公望", "秩序"],
  ["石家庄旭辉公元", "工程"],
  ["北京瑞悦家园", "管家"],
  ["天津于家堡", "秩序"],
];
const regions = ["华北", "华北", "东北", "华北", "华北", "华北"];
const positions = { 管家: "管家", 秩序: "秩序维护", 工程: "维修工", 环境: "保洁" };
const ages = ["25以下", "26-35", "36-45", "46-55"];
const tenures = [0.6, 1.5, 2.8, 4.5, 7, 10, 14];

function pick(arr, n) {
  const c = [...arr];
  const out = [];
  for (let i = 0; i < n && c.length; i++) out.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]);
  return out;
}
function buildHits(line) {
  const h = {};
  const maybe = (dim, prob, maxn) => {
    if (Math.random() < prob) h[dim] = pick(DIM_POINTS[dim], 1 + Math.floor(Math.random() * maxn));
  };
  maybe("intensity", 0.78, 2);
  maybe("lead", 0.55, 2);
  maybe("care", 0.62, 2);
  maybe("recruit", 0.32, 2);
  maybe("onboard", 0.28, 2);
  if (line === "管家" || line === "工程") maybe("appraisal", 0.42, 2);
  maybe("personal", 0.3, 1);
  if (!Object.keys(h).length) h.intensity = [DIM_POINTS.intensity[1]];
  return h;
}
function strongestDim(h) {
  let best = null, n = -1;
  for (const k of Object.keys(h)) if ((h[k]?.length ?? 0) > n) { n = h[k].length; best = k; }
  return best;
}

// ---- 派工名单（seed 批次）----
db.exec("DELETE FROM targets WHERE import_batch='seed'");
const insTarget = db.prepare(`INSERT INTO targets
  (name,phone,region,project,position,line,age_band,gender,hire_date,leave_date,tenure_months,leave_type,assigned_to,assigned_staff_id,call_status,import_batch,created_at,updated_at)
  VALUES (@name,@phone,@region,@project,@position,@line,@age_band,@gender,@hire_date,@leave_date,@tenure_months,@leave_type,@assigned_to,@assigned_staff_id,'pending','seed',@ts,@ts)`);

const targets = [];
const N = 30;
for (let i = 0; i < N; i++) {
  const [project, line] = PROJECTS[i % PROJECTS.length];
  const caller = callers[i % callers.length];
  const passive = i % 9 === 0; // 约 1/9 被动离职
  const t = {
    name: `测试员工${i + 1}`,
    phone: `13${String(800000000 + i).padStart(9, "0")}`,
    region: regions[i % PROJECTS.length],
    project,
    position: positions[line] ?? "一线",
    line,
    age_band: ages[i % ages.length],
    gender: i % 3 === 0 ? "女" : "男",
    hire_date: "2024-05-01",
    leave_date: "2026-05-15",
    tenure_months: tenures[i % tenures.length],
    leave_type: passive ? "项目撤场" : "主动辞职",
    assigned_to: caller,
    assigned_staff_id: callerIds[caller],
    ts,
  };
  const r = insTarget.run(t);
  targets.push({ id: r.lastInsertRowid, ...t });
}

// ---- 已完成访谈（六维示意数据，让后台报告有数据）----
db.exec("DELETE FROM interviews WHERE uuid LIKE 'seed-%'");
const insInt = db.prepare(`INSERT INTO interviews
  (uuid,target_id,status,name,gender,region,project,position,line,age_band,hire_date,leave_date,tenure_months,interviewer,contact_status,leave_type,
   hits_json,quotes_json,retainable,destination,top_dim,recorder_staff_id,created_at,updated_at)
  VALUES (@uuid,@target_id,'completed',@name,@gender,@region,@project,@position,@line,@age_band,@hire_date,@leave_date,@tenure_months,@interviewer,@contact,@leave_type,
   @hits,@quotes,@ret,@dest,@top,@rid,@ts,@ts)`);

const RET = ["改了愿留", "看情况", "铁了心走"];
const DEST = ["还干物业(同行)", "转行", "没定"];
const DONE = 22; // 完成多少条访谈
for (let i = 0; i < DONE; i++) {
  const t = targets[i];
  const deep = i % 7 !== 0; // 约 6/7 深聊，其余未深聊
  const hits = t.leave_type === "主动辞职" ? buildHits(t.line) : {};
  const top = strongestDim(hits);
  const quotes = {};
  if (deep && top && QUOTES[top] && i % 2 === 0) quotes[top] = QUOTES[top];
  insInt.run({
    uuid: `seed-${i}`,
    target_id: t.id,
    name: t.name, gender: t.gender, region: t.region, project: t.project,
    position: t.position, line: t.line, age_band: t.age_band, hire_date: t.hire_date,
    leave_date: t.leave_date, tenure_months: t.tenure_months,
    interviewer: t.assigned_to,
    contact: deep ? "深聊" : "未深聊",
    leave_type: t.leave_type,
    hits: JSON.stringify(hits),
    quotes: Object.keys(quotes).length ? JSON.stringify(quotes) : null,
    ret: RET[i % RET.length],
    dest: DEST[i % DEST.length],
    top: top || null,
    rid: t.assigned_staff_id,
    ts,
  });
  const intId = db.prepare("SELECT id FROM interviews WHERE uuid=?").get(`seed-${i}`).id;
  db.prepare("UPDATE targets SET call_status='done', interview_id=?, updated_at=? WHERE id=?").run(intId, ts, t.id);
}

console.log(`种子完成 → ${DB_PATH}`);
console.log("超管登录：管理员小测 / admin123");
console.log("管理员登录：露妮 / luni123");
console.log("回访员登录：毛毛 或 利丹 或 小李 或 小王 + 团队口令(.env 里 TEAM_PASSWORD)");
console.log(`(已生成 ${N} 条派工，其中 ${DONE} 条已完成、含六维报告测试数据)`);

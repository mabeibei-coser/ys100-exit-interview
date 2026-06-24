// 造测试数据（人员 + 派工 + 几条已完成访谈），方便本机跑通 /mine、记录表、后台报告。
// 用法：node scripts/seed.mjs    （真实上线前清空 data/ 重来即可）
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { initSchema } from "../lib/ddl.mjs";

const DB_PATH = process.env.DB_PATH ?? path.resolve(process.cwd(), "data", "exit-interview.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
initSchema(db);
const ts = Date.now();

// ---- 人员 ----
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

// ---- 派工名单 ----
const regions = ["华东", "江苏", "西部"];
const projects = ["翠湖花园", "梅园里", "江湾华庭", "滨江壹号", "阳光新城"];
const positions = ["保洁", "秩序维护", "客服", "维修"];
const ages = ["25以下", "26-35", "36-45", "46-55"];
const tenures = [0.6, 1.5, 2.8, 4.5, 7, 10, 14, 20, 30];

db.exec("DELETE FROM targets WHERE import_batch='seed'");
const insTarget = db.prepare(`INSERT INTO targets
  (name,phone,region,project,position,age_band,gender,hire_date,leave_date,tenure_months,leave_type,assigned_to,assigned_staff_id,call_status,import_batch,created_at,updated_at)
  VALUES (@name,@phone,@region,@project,@position,@age_band,@gender,@hire_date,@leave_date,@tenure_months,@leave_type,@assigned_to,@assigned_staff_id,'pending','seed',@ts,@ts)`);

const targetIds = [];
for (let i = 0; i < 24; i++) {
  const caller = callers[i % callers.length];
  const r = insTarget.run({
    name: `测试员工${i + 1}`,
    phone: `13${String(800000000 + i).padStart(9, "0")}`,
    region: regions[i % regions.length],
    project: projects[i % projects.length],
    position: positions[i % positions.length],
    age_band: ages[i % ages.length],
    gender: i % 3 === 0 ? "女" : "男",
    hire_date: "2024-05-01",
    leave_date: "2026-05-15",
    tenure_months: tenures[i % tenures.length],
    leave_type: i % 5 === 0 ? "项目撤场" : "主动辞职",
    assigned_to: caller,
    assigned_staff_id: callerIds[caller],
    ts,
  });
  targetIds.push(r.lastInsertRowid);
}

// ---- 几条已完成访谈（让后台报告有数据）----
db.exec("DELETE FROM interviews WHERE uuid LIKE 'seed-%'");
const insInt = db.prepare(`INSERT INTO interviews
  (uuid,target_id,status,name,gender,region,project,position,age_band,hire_date,leave_date,tenure_months,interviewer,contact_status,leave_type,
   score_salary,score_social,score_schedule,score_manager,score_promotion,score_commute,score_family,score_prospect,score_colleague,main_reason,
   pay_detail_json,destination,attraction_json,income_compare,income_gap,retainable,retain_condition,recommend,rehire,verbatim_quote,one_line_summary,
   recorder_staff_id,created_at,updated_at)
  VALUES (@uuid,@target_id,'completed',@name,@gender,@region,@project,@position,@age_band,@hire_date,@leave_date,@tenure_months,@interviewer,'一次通',@leave_type,
   @s1,@s2,@s3,@s4,@s5,@s6,@s7,@s8,@s9,@main,
   @pay,@dest,@attr,@inc,@gap,@ret,@retc,@rec,@reh,@quote,@one,
   @rid,@ts,@ts)`);

const quotes = [
  "底薪就那点，增收的活儿排不上我，一个月到手比隔壁项目少六七百。",
  "组长说话太冲，有事从不跟我们商量，憋了大半年实在受不了。",
  "三天一个夜班，身体真扛不住，新单位双休还不用倒班。",
  "干了一年还是保洁，看不到往上走的路，趁年轻换换。",
  "离家太远，每天通勤两个钟头，受不了。",
  "家里老人要照顾，没办法。",
];
const score = (base, i) => Math.max(0, Math.min(3, (base + (i % 3) - 1)));

for (let i = 0; i < 10; i++) {
  const tid = targetIds[i];
  const t = db.prepare("SELECT * FROM targets WHERE id=?").get(tid);
  insInt.run({
    uuid: `seed-${i}`,
    target_id: tid,
    name: t.name, gender: t.gender, region: t.region, project: t.project,
    position: t.position, age_band: t.age_band, hire_date: t.hire_date,
    leave_date: t.leave_date, tenure_months: t.tenure_months,
    interviewer: t.assigned_to, leave_type: t.leave_type,
    s1: score(3, i), s2: score(1, i), s3: score(2, i), s4: score(2, i + 1),
    s5: score(1, i + 2), s6: score(1, i), s7: score(1, i + 1), s8: score(1, i), s9: score(0, i),
    main: "工资到手额",
    pay: JSON.stringify(["底薪低", "提成少"]),
    dest: i % 3 === 0 ? "转行" : "还干物业(同行)",
    attr: JSON.stringify(["钱多", "不倒班"]),
    inc: i % 4 === 0 ? "差不多" : "低",
    gap: i % 4 === 0 ? null : 600 + (i % 3) * 100,
    ret: i % 2 === 0 ? "改了愿留" : "铁了心走",
    retc: "涨点底薪 / 别老倒班",
    rec: i % 3 === 0 ? "不愿" : "愿",
    reh: i % 2 === 0 ? "愿" : "不愿",
    quote: quotes[i % quotes.length],
    one: "钱不够 + 班太累",
    rid: t.assigned_staff_id,
    ts,
  });
  const intId = db.prepare("SELECT id FROM interviews WHERE uuid=?").get(`seed-${i}`).id;
  db.prepare("UPDATE targets SET call_status='done', interview_id=?, updated_at=? WHERE id=?").run(intId, ts, tid);
}

console.log(`种子完成 → ${DB_PATH}`);
console.log("超管登录：管理员小测 / admin123");
console.log("管理员登录：露妮 / luni123");
console.log("回访员登录：毛毛 或 利丹 或 小李 或 小王 + 团队口令(.env 里 TEAM_PASSWORD)");
console.log("(已生成 24 条派工，其中 10 条已完成、含报告测试数据)");

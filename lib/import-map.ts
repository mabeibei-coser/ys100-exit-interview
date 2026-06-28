// Excel 列名自动识别。真实表头名各异，用同义词字典兜底；识别不到的字段
// 会在预览里标出来，让管理员确认（拿到真实 Excel 后按需往字典里加词即可）。

export const IMPORT_FIELDS = [
  "name",
  "phone",
  "region",
  "project",
  "position",
  "line",
  "age_band",
  "gender",
  "hire_date",
  "leave_date",
  "tenure_months",
  "leave_type",
  "assigned_to",
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

export const FIELD_LABEL: Record<ImportField, string> = {
  name: "姓名",
  phone: "电话",
  region: "区域",
  project: "项目",
  position: "岗位",
  line: "条线",
  age_band: "年龄段",
  gender: "性别",
  hire_date: "入职日期",
  leave_date: "离职日期",
  tenure_months: "在职月数",
  leave_type: "离职类型",
  assigned_to: "分给谁(回访员)",
};

const SYNONYMS: Record<ImportField, string[]> = {
  name: ["姓名", "名字", "员工姓名", "员工", "name"],
  phone: ["电话", "手机", "手机号", "手机号码", "联系电话", "联系方式", "phone", "mobile", "tel"],
  region: ["区域", "大区", "区域公司", "所属区域", "region"],
  project: ["项目", "项目名称", "项目名", "服务项目", "所属项目", "project"],
  position: ["岗位", "职位", "工种", "岗位名称", "position"],
  line: ["条线", "业务线", "序列", "产品线", "业态", "条线分类", "板块"],
  age_band: ["年龄段", "年龄"],
  gender: ["性别", "gender"],
  hire_date: ["入职日期", "入职时间", "入职", "入职日"],
  leave_date: ["离职日期", "离职时间", "离职", "离职日", "离职月份"],
  tenure_months: ["在职月数", "在职时长", "司龄", "工龄", "在职月份", "在职(月)"],
  leave_type: ["离职类型", "离职性质", "离职原因类型", "类型"],
  assigned_to: ["分给谁", "回访员", "负责人", "分配", "跟进人", "访谈员", "分配给", "负责回访", "回访人", "电话员", "负责人员"],
};

function norm(s: unknown): string {
  return String(s ?? "").replace(/\s/g, "").trim();
}

/** 表头 → {字段: 列下标}。先精确等于，再包含匹配。 */
export function detectMapping(headers: unknown[]): Partial<Record<ImportField, number>> {
  const normd = headers.map(norm);
  const map: Partial<Record<ImportField, number>> = {};
  for (const field of IMPORT_FIELDS) {
    const syns = SYNONYMS[field];
    // 精确
    let idx = normd.findIndex((h) => h && syns.some((s) => h === s));
    // 包含
    if (idx < 0) idx = normd.findIndex((h) => h && syns.some((s) => h.includes(s)));
    if (idx >= 0) map[field] = idx;
  }
  return map;
}

export interface TargetInput {
  name: string;
  phone: string | null;
  region: string | null;
  project: string | null;
  position: string | null;
  line: string | null;
  age_band: string | null;
  gender: string | null;
  hire_date: string | null;
  leave_date: string | null;
  tenure_months: number | null;
  leave_type: string | null;
  assigned_to: string | null;
}

function cell(row: unknown[], idx: number | undefined): string | null {
  if (idx === undefined) return null;
  const v = row[idx];
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** 年龄数字 → 年龄段（与 lib/schema.ts 的 AGE_BANDS 对齐） */
function ageToBand(age: number): string {
  if (age < 26) return "25以下";
  if (age <= 35) return "26-35";
  if (age <= 45) return "36-45";
  if (age <= 55) return "46-55";
  return "55+";
}

/** 把数据行按映射转成 target 列表，并返回告警（缺关键列/跳过空行）。 */
export function buildTargets(
  dataRows: unknown[][],
  map: Partial<Record<ImportField, number>>,
  headers: unknown[] = []
): { targets: TargetInput[]; warnings: string[]; skipped: number; notes: string[] } {
  const warnings: string[] = [];
  const notes: string[] = [];
  if (map.name === undefined) warnings.push("没识别到「姓名」列，无法导入——请检查表头");
  if (map.assigned_to === undefined) warnings.push("没识别到「分给谁/回访员」列，导入后这些人会进「未派」，需手动分配");

  // 司龄/工龄列是"年"，转成"月"（系统统一按月统计）；"在职月数/月份"列本就是月
  const tenureHeader = map.tenure_months !== undefined ? norm(headers[map.tenure_months]) : "";
  const tenureIsYears = /司龄|工龄|年限/.test(tenureHeader);
  if (tenureIsYears) notes.push(`「${headers[map.tenure_months!]}」按"年"识别，已自动×12 换成月`);

  // 年龄列若是数字（如"年龄"而非"年龄段"），转成年龄段
  const ageHeader = map.age_band !== undefined ? norm(headers[map.age_band]) : "";
  const ageIsRawNumber = ageHeader === "年龄" || (ageHeader.includes("年龄") && !ageHeader.includes("年龄段"));
  if (ageIsRawNumber) notes.push(`「${headers[map.age_band!]}」按"年龄数字"识别，已自动归入年龄段`);

  const targets: TargetInput[] = [];
  let skipped = 0;
  for (const row of dataRows) {
    const name = cell(row, map.name);
    if (!name) {
      skipped++;
      continue;
    }
    // 司龄/在职时长
    const tenureRaw = cell(row, map.tenure_months);
    let tenure: number | null = null;
    if (tenureRaw !== null && Number.isFinite(Number(tenureRaw))) {
      const n = Number(tenureRaw);
      tenure = tenureIsYears ? Math.round(n * 12 * 10) / 10 : n;
    }
    // 年龄段
    const ageRaw = cell(row, map.age_band);
    let ageBand: string | null = ageRaw;
    if (ageRaw !== null && ageIsRawNumber && Number.isFinite(Number(ageRaw))) {
      ageBand = ageToBand(Number(ageRaw));
    }
    targets.push({
      name,
      phone: cell(row, map.phone),
      region: cell(row, map.region),
      project: cell(row, map.project),
      position: cell(row, map.position),
      line: cell(row, map.line),
      age_band: ageBand,
      gender: cell(row, map.gender),
      hire_date: cell(row, map.hire_date),
      leave_date: cell(row, map.leave_date),
      tenure_months: tenure,
      leave_type: cell(row, map.leave_type),
      assigned_to: cell(row, map.assigned_to),
    });
  }
  return { targets, warnings, skipped, notes };
}

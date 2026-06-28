import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/session";
import { getDb, now } from "@/lib/db";
import { detectMapping, buildTargets, FIELD_LABEL, IMPORT_FIELDS } from "@/lib/import-map";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ ok: false, error: "无权限" }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "上传格式错误" }, { status: 400 });
  }
  const file = form.get("file");
  const commit = form.get("commit") === "true";
  if (!(file instanceof Blob)) {
    return NextResponse.json({ ok: false, error: "请选择 Excel 文件" }, { status: 400 });
  }

  let rows: unknown[][];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }) as unknown[][];
  } catch {
    return NextResponse.json({ ok: false, error: "解析 Excel 失败，请确认是 .xlsx 文件" }, { status: 400 });
  }
  if (!rows.length) return NextResponse.json({ ok: false, error: "表格是空的" }, { status: 400 });

  const headers = rows[0];
  const dataRows = rows.slice(1);
  const map = detectMapping(headers);
  const { targets, warnings, skipped, notes } = buildTargets(dataRows, map, headers);

  // 识别到的列映射（给前端展示）
  const mapping = IMPORT_FIELDS.map((f) => ({
    field: f,
    label: FIELD_LABEL[f],
    column: map[f] !== undefined ? String(headers[map[f]!]) : null,
  }));

  // 按回访员统计
  const byCaller: Record<string, number> = {};
  for (const t of targets) {
    const k = t.assigned_to ?? "(未派)";
    byCaller[k] = (byCaller[k] ?? 0) + 1;
  }

  if (!commit) {
    return NextResponse.json({
      ok: true,
      preview: true,
      headers: headers.map((h) => String(h)),
      mapping,
      totalRows: targets.length,
      skipped,
      byCaller,
      sample: targets.slice(0, 6),
      warnings,
      notes,
      canImport: map.name !== undefined && targets.length > 0,
    });
  }

  // ---- 真正导入 ----
  if (map.name === undefined || targets.length === 0) {
    return NextResponse.json({ ok: false, error: "没有可导入的数据（缺姓名列或全空）" }, { status: 400 });
  }

  const db = getDb();
  const ts = now();
  const batch = "imp-" + ts;
  const createdCallers: string[] = [];

  const getStaff = db.prepare("SELECT id FROM staff WHERE name = ?");
  const insStaff = db.prepare(
    "INSERT INTO staff (name, role, is_super, active, created_at, updated_at) VALUES (?, 'caller', 0, 1, ?, ?)"
  );
  const existsTarget = db.prepare("SELECT id FROM targets WHERE name = ? AND IFNULL(phone,'') = IFNULL(?,'')");
  const insTarget = db.prepare(`INSERT INTO targets
    (name,phone,region,project,position,line,age_band,gender,hire_date,leave_date,tenure_months,leave_type,
     assigned_to,assigned_staff_id,call_status,import_batch,created_at,updated_at)
    VALUES (@name,@phone,@region,@project,@position,@line,@age_band,@gender,@hire_date,@leave_date,@tenure_months,@leave_type,
     @assigned_to,@assigned_staff_id,'pending',@batch,@ts,@ts)`);

  let imported = 0;
  let dup = 0;
  const staffCache = new Map<string, number>();

  const tx = db.transaction(() => {
    for (const t of targets) {
      // 去重：同名+同号已存在则跳过
      if (existsTarget.get(t.name, t.phone)) {
        dup++;
        continue;
      }
      let assignedId: number | null = null;
      if (t.assigned_to) {
        if (staffCache.has(t.assigned_to)) {
          assignedId = staffCache.get(t.assigned_to)!;
        } else {
          const row = getStaff.get(t.assigned_to) as { id: number } | undefined;
          if (row) {
            assignedId = row.id;
          } else {
            assignedId = Number(insStaff.run(t.assigned_to, ts, ts).lastInsertRowid);
            createdCallers.push(t.assigned_to);
          }
          staffCache.set(t.assigned_to, assignedId);
        }
      }
      insTarget.run({ ...t, assigned_staff_id: assignedId, batch, ts });
      imported++;
    }
  });
  tx();

  return NextResponse.json({ ok: true, imported, dup, createdCallers, byCaller, batch });
}

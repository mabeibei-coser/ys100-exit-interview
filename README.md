# D100 离职访谈记录工具

一线离职员工电话回访的多人在线记录工具。回访员各自登录、看到分给自己的人、边打电话边填电子记录表；管理员在后台看实时分析报告 + 明细总表 + 管人员权限。

技术栈：Next.js 16 + better-sqlite3(WAL) + iron-session + Chart.js + SheetJS/exceljs。复用自 `B100-admin-hub` 的登录/权限/并发栈。

## 角色与页面

| 路径 | 谁用 | 干什么 |
|---|---|---|
| `/login` | 全员 | 选名字 + 口令登录 |
| `/mine` | 回访员 | 我的派工：分给自己的人（待拨/已完成/未接通）+ 进度 |
| `/record/[id]` | 回访员 | 电子记录表（话术卡侧栏 + 9维打分 + 自动存草稿） |
| `/admin` | 管理员 | 实时分析报告（7 章节）+ 进度看板 |
| `/admin/records` | 管理员 | 明细总表 + 导出 Excel |
| `/admin/import` | 管理员 | 上传 Excel 一键派工 |
| `/admin/staff` | 超管 | 人员与权限（加人/升降/改口令/停用） |

## 登录两档

- **回访员**：选名字 + 共享团队口令（`TEAM_PASSWORD`），开箱即用。
- **管理员/超管**：选名字 + 各自口令（bcrypt）。谁是管理员由超管在 `/admin/staff` 设定，可多人。

## 本机运行

```bash
npm install
cp .env.example .env.local         # 填 SESSION_PASSWORD / TEAM_PASSWORD
node scripts/init-super.mjs "你的名字" "你的口令"   # 建超管
npm run dev                         # http://localhost:3100/d100/login
```

造演示数据（可选）：`node scripts/seed.mjs`
- 超管 `管理员小测 / admin123`，管理员 `露妮 / luni123`，回访员 `毛毛` 等 + 团队口令。

## 环境变量（见 .env.example）

| 变量 | 说明 |
|---|---|
| `SESSION_PASSWORD` | iron-session 加密口令，≥32 位随机串 |
| `TEAM_PASSWORD` | 回访员共享团队口令 |
| `COOKIE_SECURE` | 生产 https 置 `true` |
| `DB_PATH` | SQLite 路径，**绝不放坚果云/OneDrive 同步目录** |
| `BASE_PATH` | 子路径，默认 `/d100` |
| `PLANNED_TOTAL` | 计划回访总人数（完成率分母），默认 100 |
| `HEADCOUNT_TOTAL` | 在岗总人数（可选，给了才算真实离职率） |

## Excel 导入

后台「导入派工」上传 `.xlsx`：按表头自动识别列（姓名/电话/区域/项目/岗位/年龄/性别/入职/离职/在职月数/离职类型/分给谁），按「分给谁」列派工并自动建回访员账号。同名+同号去重。
列名识别同义词在 `lib/import-map.ts`，真实表头对不上时往字典加词即可。

## 报告口径

- 原因诊断（帕累托/热力图/管理预警）**只统计"主动辞职"**（被动离职不进原因分析）。
- 热力图单格样本 `<5` 人留空（小样本阈值，`lib/schema.ts`）。
- eNPS = 推荐"愿"% − "不愿"%；可挽回 = "改了愿留"占比。

## 部署

子路径 `/d100` + PM2 + nginx，走 `tencent-deploy` skill。生产 `.env` 设 `COOKIE_SECURE=true`、独立 `DB_PATH`、强 `SESSION_PASSWORD`/`TEAM_PASSWORD`。

## 字段单一事实源

- 记录表字段/选项/话术卡：`lib/schema.ts`（对标 HR 项目 `build_toolkit_docx.py`）
- 建表 DDL：`lib/ddl.mjs`（app 与脚本共用）

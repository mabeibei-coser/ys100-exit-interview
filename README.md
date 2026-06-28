# YS100 离职访谈记录工具

一线离职员工电话回访的多人在线记录工具。回访员各自登录、看到分给自己的人、边打电话边填电子记录表；管理员在后台看实时分析报告 + 明细总表 + 管人员权限。

口径＝集团《项目一线离职诊断》**六维**：① 项目头狼 ② 招聘 ③ 融入与培训 ④ 考核评价 ⑤ 工作强度 ⑥ 激励与关怀（+个人兜底）。离职风险 = 工作压力 ÷（物质收益 + 情绪价值）。与 HR 项目《六维访谈诊断表 / 离职分析报告》两个 HTML 同源。

技术栈：Next.js 16 + better-sqlite3(WAL) + iron-session + SheetJS/exceljs。复用自 `B100-admin-hub` 的登录/权限/并发栈。

## 角色与页面

| 路径 | 谁用 | 干什么 |
|---|---|---|
| `/login` | 全员 | 选名字 + 口令登录 |
| `/mine` | 回访员 | 我的派工：分给自己的人（待拨/已完成/未接通）+ 进度 |
| `/record/[id]` | 回访员 | 六维访谈诊断表（话术卡侧栏 + 六维问题点勾选 + 每维原话 + 自动存草稿） |
| `/admin` | 管理员 | 六维诊断报告（诊断结论 / 钻取 / 还能不能留 / 真话墙 4 段）+ 进度看板 |
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
npm run dev                         # http://localhost:3100/ys100/login
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
| `BASE_PATH` | 子路径，默认 `/ys100` |
| `PLANNED_TOTAL` | 计划回访总人数（完成率分母），默认 100 |
| `HEADCOUNT_TOTAL` | 在岗总人数（可选，给了才算真实离职率） |

## Excel 导入

后台「导入派工」上传 `.xlsx`：按表头自动识别列（姓名/电话/区域/项目/岗位/**条线**/年龄/性别/入职/离职/在职月数/离职类型/分给谁），按「分给谁」列派工并自动建回访员账号。同名+同号去重。
列名识别同义词在 `lib/import-map.ts`，真实表头对不上时往字典加词即可。**条线**（管家/秩序/工程/环境）可选：给了才能让报告把「考核维」基数收窄到管家+工程、真话墙按条线打标签；不给则全部纳入。

## 报告口径

- 原因分析**只统计"主动辞职"**（被动离职剔除），且基数＝**深聊样本**（接通情况记「未深聊」的不进真因，不编原因）。
- 命中率＝提及该维的人 ÷ 深聊样本；**考核维**基数收窄到管家+工程（有条线信息时）。多选、柱状图为提及率、不累计 100%。
- 项目×六维热力图：单项目回访 `<3` 人不显示（小样本阈值 `PROJECT_MIN_SAMPLE`，`lib/schema.ts`）。
- 真话墙＝直接摘自各维「原话摘录」，配维度·条线/项目标签。

## 部署

子路径 `/ys100` + PM2 + nginx，走 `tencent-deploy` skill。生产 `.env` 设 `COOKIE_SECURE=true`、独立 `DB_PATH`、强 `SESSION_PASSWORD`/`TEAM_PASSWORD`。

## 字段单一事实源

- 六维/问题点/选项/话术卡：`lib/schema.ts`（与 HR 项目《六维访谈诊断表》HTML 同源）
- 报告聚合（命中率/最高分细项/热力图/钻取/真话墙）：`lib/aggregate.ts`
- 建表 DDL + 旧库迁移：`lib/ddl.mjs`（app 与脚本共用；旧 9 维库平滑加列、不丢名单）

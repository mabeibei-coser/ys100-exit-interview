// 六维诊断「单一事实源」——字段、问题点、话术卡都在这里定义。
// 口径＝集团《项目一线离职诊断》六维：头狼 / 招聘 / 融入与培训 / 考核评价 / 工作强度 / 激励与关怀（+个人兜底）。
// 离职风险 = 工作压力 ÷（物质收益 + 情绪价值）。与 HR 项目《六维访谈诊断表 / 离职分析报告》两个 HTML 同源，改字段先改这里。

// 着色桶：press＝工作压力(橙) intake＝入口质量(灰) emo＝物质+精神(绿) personal＝个人兜底
export type Bucket = "press" | "intake" | "emo" | "personal";

export interface PointDef {
  key: string; // 稳定 key（存库/聚合/排序用，别改）
  label: string; // 显示文案（＝HTML 诊断表问题点，去掉 ☐）
  group?: "精神" | "物质"; // 仅 ⑥ 激励与关怀分精神/物质
}

export interface DimDef {
  key: string; // 维度稳定 key
  no: string; // ① ② …（个人兜底无编号）
  name: string; // 项目头狼
  short: string; // 头狼（热力图列名 / 标签短名）
  tag: string; // 工作压力 / 入口质量 / 物质+精神 / 其他
  bucket: Bucket;
  color: string;
  question: string; // 访谈问题（怎么问）
  note?: string; // ⚠ 仅管家+工程问 之类
  onlyLines?: readonly string[]; // 该维仅对这些条线问（考核＝管家/工程）；命中率基数按此收窄
  points: readonly PointDef[];
}

// 六维 + 个人兜底，顺序固定（表单、热力图列、钻取卡都用它）
export const DIMS: readonly DimDef[] = [
  {
    key: "lead", no: "①", name: "项目头狼", short: "头狼", tag: "工作压力",
    bucket: "press", color: "#D85A30",
    question: "咱们项目经理或主管平时跟您沟通多吗？遇到困难去找他们，能帮着解决吗？",
    points: [
      { key: "lead_nocomm", label: "平时很少沟通 / 缺乏日常工作指导" },
      { key: "lead_noresp", label: "遇到困难找不到人 / 响应迟缓" },
      { key: "lead_nohelp", label: "不帮、推诿甩锅 / 缺管理担当" },
      { key: "lead_rude", label: "态度粗暴 / 不尊重（说话冲）" },
      { key: "lead_unfair", label: "处事不公 / 偏袒特定员工" },
    ],
  },
  {
    key: "recruit", no: "②", name: "招聘", short: "招聘", tag: "入口质量",
    bucket: "intake", color: "#8a857a",
    question: "回想刚入职那会儿，招聘时跟您谈的工作内容、薪资待遇、食宿条件，后来都兑现了吗？有没有落差比较大的地方？",
    points: [
      { key: "recruit_content", label: "工作内容跟说的不一样" },
      { key: "recruit_pay", label: "薪资结构 / 待遇没兑现、比说的低" },
      { key: "recruit_schedule", label: "工作时间 / 排班与招聘说的不符" },
      { key: "recruit_welfare", label: "食宿 / 福利没兑现（说有食堂实际无）" },
      { key: "recruit_gap", label: "整体落差大" },
    ],
  },
  {
    key: "onboard", no: "③", name: "融入与培训", short: "融入", tag: "入口质量",
    bucket: "intake", color: "#8a857a",
    question: "刚来项目时，有人教您怎么干活吗？遇到不会的操作，有人管吗？",
    points: [
      { key: "onboard_noteach", label: "没人教 / 没安排带教人" },
      { key: "onboard_fake", label: "带教走形式 / 不愿教" },
      { key: "onboard_nostd", label: "缺标准指引 / 不会的没人管" },
      { key: "onboard_nocert", label: "岗前培训 / 认证没跟上" },
      { key: "onboard_exclude", label: "团队排外 / 难融入老员工圈" },
      { key: "onboard_notool", label: "缺必要工具设备、上手难" },
    ],
  },
  {
    key: "appraisal", no: "④", name: "考核评价", short: "考核", tag: "工作压力",
    bucket: "press", color: "#D85A30",
    question: "咱们每个月的考核打分，主管会跟您说明白扣分原因吗？有没有觉得不合理、或者私下罚款的情况？",
    note: "⚠ 仅管家 + 工程问；秩序岗跳过本维",
    onlyLines: ["管家", "工程"],
    points: [
      { key: "appraisal_nodetail", label: "扣分不说明原因 / 不沟通" },
      { key: "appraisal_unfair", label: "考核不合理 / 不透明" },
      { key: "appraisal_fine", label: "私下罚款" },
    ],
  },
  {
    key: "intensity", no: "⑤", name: "工作强度", short: "强度", tag: "工作压力",
    bucket: "press", color: "#D85A30",
    question: "平时工作量大吗？经常加班吗？",
    points: [
      { key: "intensity_workload", label: "绝对工作量大 / 一人干多人的活" },
      { key: "intensity_overtime", label: "频繁加班" },
      { key: "intensity_understaff", label: "长期缺编 / 满编率低连轴转" },
      { key: "intensity_sudden", label: "突发事件多 / 经常被临时叫回" },
      { key: "intensity_external", label: "历史遗留多 / 业主投诉等外界压力大" },
    ],
  },
  {
    key: "care", no: "⑥", name: "激励与关怀", short: "激励", tag: "物质+精神",
    bucket: "emo", color: "#2E7D5B",
    question: "干得好的时候，项目上有表扬或奖励吗？您知道一线增收吗？",
    points: [
      { key: "care_nopraise", label: "干得好没表扬 / 不被认可", group: "精神" },
      { key: "care_noreward", label: "没奖励 / 没评优", group: "精神" },
      { key: "care_badvibe", label: "氛围差 / 没参加过恳谈会", group: "精神" },
      { key: "care_noincome", label: "不知道有增收 / 增收很少", group: "物质" },
      { key: "care_lowpay", label: "工资低 / 加班费没兑现", group: "物质" },
    ],
  },
  {
    key: "personal", no: "", name: "兜底 · 个人", short: "个人", tag: "其他",
    bucket: "personal", color: "#262521",
    question: "是不是还有家里、身体或者个人发展上的原因？",
    points: [
      { key: "personal_family", label: "家庭 / 照顾老小" },
      { key: "personal_health", label: "健康" },
      { key: "personal_commute", label: "离家远 / 通勤" },
      { key: "personal_career", label: "个人发展 / 想换行" },
      { key: "personal_other", label: "其他" },
    ],
  },
] as const;

export type DimKey = (typeof DIMS)[number]["key"];

// 六维（不含个人兜底）——报告六维命中率排序 / 热力图 / 钻取用
export const CORE_DIMS = DIMS.filter((d) => d.key !== "personal");

// key → label 速查（聚合 / 导出 / 真话墙标签用）
export const DIM_BY_KEY: Record<string, DimDef> = Object.fromEntries(DIMS.map((d) => [d.key, d]));
export const POINT_LABEL: Record<string, string> = Object.fromEntries(
  DIMS.flatMap((d) => d.points.map((p) => [p.key, p.label]))
);
export const POINT_DIM: Record<string, DimKey> = Object.fromEntries(
  DIMS.flatMap((d) => d.points.map((p) => [p.key, d.key as DimKey]))
);

// ---- 基本信息选项 ----
export const GENDERS = ["男", "女"] as const;
export const AGE_BANDS = ["25以下", "26-35", "36-45", "46-55", "55+"] as const;
// 条线：考核维仅管家+工程问；报告真话墙按条线打标签。导入可选列，表单可选，缺省回退"全部"。
export const LINES = ["管家", "秩序", "工程", "环境", "其他"] as const;
export const APPRAISAL_LINES = ["管家", "工程"] as const; // 与 DIMS.appraisal.onlyLines 对齐

// 接通/深聊质量：原因分析只算「深聊」样本；真敷衍记「未深聊」不污染真因。
export const CONTACT_STATUS = ["深聊", "未深聊"] as const;

// 离职类型：被动离职（辞退/到期不续/撤场）不进原因分析
export const LEAVE_TYPES = ["主动辞职", "公司辞退", "合同到期不续", "项目撤场"] as const;
export const ACTIVE_LEAVE_TYPE = "主动辞职"; // 只有它进原因诊断

// ---- 收尾 ----
export const RETAINABLE = ["改了愿留", "看情况", "铁了心走"] as const;
export const DESTINATIONS = ["还干物业(同行)", "转行", "没定"] as const;

// 小样本阈值：报告热力图单项目回访不足该人数则不显示（与新版报告 MINN=3 对齐）
export const PROJECT_MIN_SAMPLE = 3;

// ---- 话术卡（record 页左侧速查；＝诊断表 开场/开口/冷场/收尾/禁忌）----
export const SCRIPT_CARD = {
  open: {
    title: "① 开场",
    hint: "照着念·别像查岗",
    body: "“喂 X 师傅您好，我是永升人力的小 X。您前阵子从 XX 项目离职了对吧？今天主要是想跟您简单聊聊，听听您的真实感受，几分钟就好。您看方便吗？”",
    sys: "姓名/项目/岗位·条线系统带出、以系统为准，不用口头核对。",
  },
  lead: {
    title: "② 开口 · 让他自己说",
    hint: "核心",
    body: "“当时主要是出于什么考虑，让您最终决定离开咱们项目的呢？”",
    tip: "先闭嘴让他说完，下面六维他没说到的挑着补问；每维命中就打勾、记原话，别替他概括。",
  },
  cold: {
    title: "③ 冷场了",
    hint: "降二选一 / 问身边人",
    lines: [
      "给二选一：“主要是因为钱，还是因为人、活儿这些？”",
      "不肯说就问：“您那项目上其他人走，一般都图个啥？”",
      "真敷衍别硬刨——记「未深聊」，别编原因。",
    ],
  },
  close: {
    title: "④ 收尾",
    hint: "",
    lines: [
      "可挽回：“当初要是这问题给您解决了，您还愿意接着干吗？”",
      "去向：“您现在去哪儿工作了？”",
      "道谢：“谢谢您 X 师傅，都记下了，会反馈上去！”",
    ],
  },
  taboo: "全程别做这 4 件事：✗ 别先报选项　✗ 别打断　✗ 别替他下结论　✗ 别辩解反驳",
} as const;

export const CALL_STATUS_LABEL: Record<string, string> = {
  pending: "待拨",
  done: "已完成",
  unreachable: "未接通",
};

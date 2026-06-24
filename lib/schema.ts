// 记录表「单一事实源」——字段、选项、9 维打分、话术卡都在这里定义。
// 与 build_toolkit_docx.py（纸质记录表）逐字段对标，改字段先改这里。

export const DIMENSIONS = [
  { key: "score_salary", label: "工资到手额" },
  { key: "score_social", label: "社保 / 公积金" },
  { key: "score_schedule", label: "排班 / 工时 / 强度" },
  { key: "score_manager", label: "直属主管 / 管理方式" },
  { key: "score_promotion", label: "晋升 / 发展空间" },
  { key: "score_commute", label: "通勤距离" },
  { key: "score_family", label: "家庭原因" },
  { key: "score_prospect", label: "公司 / 项目前景" },
  { key: "score_colleague", label: "同事关系 / 氛围" },
] as const;

export type DimensionKey = (typeof DIMENSIONS)[number]["key"];

// 帕累托图/热力图里显示的短标签（热力图行名要短）
export const DIM_SHORT: Record<DimensionKey, string> = {
  score_salary: "工资",
  score_social: "社保",
  score_schedule: "排班",
  score_manager: "主管",
  score_promotion: "晋升",
  score_commute: "通勤",
  score_family: "家庭",
  score_prospect: "前景",
  score_colleague: "同事",
};

export const SCORE_LEVELS = [
  { v: 0, label: "没影响" },
  { v: 1, label: "有点" },
  { v: 2, label: "很重要" },
  { v: 3, label: "决定性" },
] as const;

export const GENDERS = ["男", "女"] as const;
export const AGE_BANDS = ["25以下", "26-35", "36-45", "46-55", "55+"] as const;
export const CONTACT_STATUS = ["一次通", "二次通", "未接通"] as const;

// 离职类型：被动离职（公司辞退/合同到期不续/项目撤场）不进原因分析
export const LEAVE_TYPES = ["主动辞职", "公司辞退", "合同到期不续", "项目撤场"] as const;
export const ACTIVE_LEAVE_TYPE = "主动辞职"; // 只有它进原因诊断（帕累托/热力图）

export const PAY_DETAILS = ["底薪低", "提成少", "增收机会少", "社保公积金", "发放不及时"] as const;
export const DESTINATIONS = ["还干物业(同行)", "转行", "还没定"] as const;
export const ATTRACTIONS = ["钱多", "离家近", "不倒班", "领导好", "能转正/编制", "活轻松", "其他"] as const;
export const INCOME_COMPARE = ["高", "差不多", "低"] as const;
export const RETAINABLE = ["改了愿留", "看情况", "铁了心走"] as const;
export const YES_NO = ["愿", "不愿"] as const;

// 工龄分档（报告③ 按工龄切片）——单位：月
export const TENURE_BANDS = [
  { label: "≤1月", min: 0, max: 1 },
  { label: "1-3月", min: 1, max: 3 },
  { label: "3-6月", min: 3, max: 6 },
  { label: "6-12月", min: 6, max: 12 },
  { label: "1-2年", min: 12, max: 24 },
  { label: "2年+", min: 24, max: Infinity },
] as const;

// 小样本阈值：报告热力图单格不足该人数则灰掉（已与用户定为 5）
export const SMALL_SAMPLE_THRESHOLD = 5;

// 话术卡（record 页左侧速查；内容同纸质工具包 Part 1）
export const SCRIPT_CARD = {
  intro: {
    title: "① 开场 · 卸防御",
    hint: "照着念",
    body: "“喂您好，是 X 师傅吗？我是永升 HR 小 X。您前段时间从 XX 项目离开了对吧？这电话就两三分钟，不影响您工资结算、也不影响离职证明，就想听听您真实想法，帮我们把工作做得更好。方便聊两句不？”",
  },
  destination: {
    title: "② 去向破冰",
    hint: "别上来问「为啥走」",
    lines: [
      "“您现在工作落定了吗？去哪儿高就了？” → “新地方哪点最吸引您？”",
      "去向往往藏着真因——嘴上说「找更好机会」，新工作要是就钱多，真因就是钱。",
    ],
  },
  dig: {
    title: "③ 让他自己说 + 刨根追问",
    hint: "核心",
    lines: [
      "开口：“那您当时主要图个啥想换一换？” 先闭嘴，让他说完，别报选项、别打断。",
      "往下刨：“然后呢？还有别的不？” / “具体是咋回事儿？” / “这事儿对您下决心影响有多大？”",
      "例：“找到更好的了”→“哪点更好？”→“钱多点”→“这边低了多少？底薪还是提成？”",
      "例：“主要是家里”→“要是这边能解决 XX，您还会留吗？”（答“也不留”=真；“那倒可以”=借口）",
    ],
  },
  check: {
    title: "④ 必问核对点",
    hint: "他没主动提就补问",
    lines: [
      "钱：“主要是底薪低、提成少、社保公积金、还是发钱不及时？”",
      "增收：“到家／维修／租售那些增收的活儿，您之前接得上不？”",
      "人：“跟项目上主管、领导处得咋样？”",
      "挽回：“要是当初这问题能解决，您还愿意接着干吗？”",
    ],
  },
  close: {
    title: "⑤ 收尾 · 健康度",
    hint: "",
    lines: [
      "“会推荐朋友来咱这儿干不？” / “以后有合适岗位，愿意回来吗？”",
      "“谢谢您 X 师傅，您说的我都记下了，会反馈上去！”",
    ],
  },
  taboo: "全程别做这 4 件事：✗ 别先报选项　✗ 别打断　✗ 别替他下结论　✗ 别辩解反驳",
} as const;

export const CALL_STATUS_LABEL: Record<string, string> = {
  pending: "待拨",
  done: "已完成",
  unreachable: "未接通",
};

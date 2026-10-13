export const DEFAULT_VISION_TIERS = [
  { name: "初用", min_exams: 0, min_account_days: 0, quota_limit: 1, period: "lifetime", daily_limit: 1 },
  { name: "常用", min_exams: 3, min_account_days: 7, quota_limit: 5, period: "month", daily_limit: 5 },
  { name: "深入", min_exams: 10, min_account_days: 14, quota_limit: 10, period: "week", daily_limit: 10 },
  { name: "长期", min_exams: 20, min_account_days: 30, quota_limit: 20, period: "day", daily_limit: 20 },
];

const PERIOD_ORDER: Record<string, number> = { lifetime: 0, month: 1, week: 2, day: 3 };

export function validateVisionTiers(value: unknown, existing: any[] = []) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) throw new Error("阶梯需设置 1～8 档");
  let previous = { min_exams: -1, min_account_days: -1, quota_limit: 0, period: "lifetime" };
  return value.map((input, index) => {
    const name = typeof input?.name === "string" ? input.name.trim() : "";
    const integer = (key: string, min: number, max: number) => {
      const raw = input?.[key];
      const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : NaN;
      if (!Number.isInteger(n) || n < min || n > max) throw new Error(`第 ${index + 1} 档的条件或额度超出范围`);
      return n;
    };
    if (!name || [...name].length > 20) throw new Error("每档名称需为 1～20 个字符");
    // Old admin pages omit period. Preserve a matching stored tier instead of reverting it to daily.
    const stored = existing.find(r => r.name === name && Number(r.min_exams) === Number(input.min_exams) && Number(r.min_account_days) === Number(input.min_account_days)) ?? existing[index];
    const period = input.period === undefined ? (stored?.period ?? "day") : input.period;
    if (typeof period !== "string" || !Object.hasOwn(PERIOD_ORDER, period)) throw new Error("额度周期需为一次性、每月、每周或每天");
    const quotaLimit = integer(input.quota_limit === undefined ? "daily_limit" : "quota_limit", 1, 1000);
    const rule = { name, min_exams: integer("min_exams", 0, 10000), min_account_days: integer("min_account_days", 0, 3650), quota_limit: quotaLimit, period, daily_limit: quotaLimit };
    if (index === 0 && (rule.min_exams !== 0 || rule.min_account_days !== 0)) throw new Error("第一档的两个门槛都需为 0");
    if (rule.min_exams < previous.min_exams || rule.min_account_days < previous.min_account_days ||
      (index > 0 && rule.min_exams === previous.min_exams && rule.min_account_days === previous.min_account_days)) {
      throw new Error("阶梯门槛需递增，至少一个条件提高");
    }
    if (index > 0 && (PERIOD_ORDER[period] < PERIOD_ORDER[previous.period] || (period === previous.period && quotaLimit <= previous.quota_limit))) throw new Error("后档周期不能变长；相同周期的次数需增加");
    previous = rule;
    return rule;
  });
}

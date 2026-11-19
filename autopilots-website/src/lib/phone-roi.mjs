/** Transparent workload-value calculator. No revenue forecasts or provider calls. */
export const phoneRoiDefaults = {
  minutes: 3000,
  automation: 85,
  followup: 0,
  fte: 1,
  weeklyHours: 40,
  phoneShare: 100,
  costMode: "total",
  hourlyCost: 50,
  grossHourly: 22,
  holiday: 0,
  employer: 0,
  pension: 0,
  otherHourly: 0,
  implementation: null,
  management: null,
  minuteRate: 0.29,
  otherMonthly: 0,
  benefitMode: "capacity",
  avoidedPercent: 0,
};

export const phoneRoiLimits = {
  minutes: [0, 1000000],
  automation: [0, 100],
  followup: [0, 100000],
  fte: [0, 1000],
  weeklyHours: [0, 80],
  phoneShare: [0, 100],
  hourlyCost: [0, 1000],
  grossHourly: [0, 1000],
  holiday: [0, 100],
  employer: [0, 100],
  pension: [0, 100],
  otherHourly: [0, 1000],
  implementation: [0, 10000000],
  management: [0, 10000000],
  minuteRate: [0, 100],
  otherMonthly: [0, 10000000],
  avoidedPercent: [0, 100],
};

// Conservative launch assumption: half the intended AI workload in month one,
// while retaining the full entered monthly costs and any human follow-up.
export const phoneRoiFirstMonthFactor = 0.5;

/**
 * @typedef {Object} PhoneRoiResult
 * @property {boolean} valid
 * @property {boolean} complete
 * @property {string[]} errors
 * @property {string[]} missing
 * @property {number} [hourlyCost]
 * @property {number} [availableHours]
 * @property {number} [volumeHours]
 * @property {number} [baselineHours]
 * @property {number} [automatedHours]
 * @property {number} [savedHours]
 * @property {number} [remainingHours]
 * @property {number} [grossCapacityValue]
 * @property {number} [valuedBenefit]
 * @property {number} [firstMonthAutomation]
 * @property {number} [firstMonthSavedHours]
 * @property {number} [firstMonthBenefit]
 * @property {number} [firstMonthNet]
 * @property {number} [usageCost]
 * @property {number} [baselineValue]
 * @property {number} [remainingValue]
 * @property {boolean} [capacityLimited]
 * @property {boolean} [followupExceedsAutomation]
 * @property {number} [aiMonthly]
 * @property {number} [monthlyNet]
 * @property {number|null} [breakEvenMonths]
 * @property {number|null} [breakEvenWholeMonth]
 * @property {number} [yearOne]
 * @property {number} [followingYear]
 * @property {number} [withAiValue]
 * @property {number|null} [roiYearOne]
 * @property {{month:number,value:number}[]} [cumulative]
 */
const money = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/** @param {Record<string, unknown>} input @returns {PhoneRoiResult} */
export function calculatePhoneRoi(input) {
  const values = { ...phoneRoiDefaults, ...input };
  const errors = [];
  const missing = [];
  for (const [key, [min, max]] of Object.entries(phoneRoiLimits)) {
    // Inactive salary fields must not invalidate the selected cost method.
    if (
      values.costMode === "total" &&
      ["grossHourly", "holiday", "employer", "pension", "otherHourly"].includes(
        key,
      )
    )
      continue;
    if (values.costMode === "breakdown" && key === "hourlyCost") continue;
    if (values.benefitMode === "capacity" && key === "avoidedPercent") continue;
    const value = values[key];
    if (
      (key === "implementation" || key === "management") &&
      (value === null || value === "")
    ) {
      missing.push(key);
      continue;
    }
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < min ||
      value > max
    )
      errors.push(key);
  }
  if (!["total", "breakdown"].includes(values.costMode))
    errors.push("costMode");
  if (!["capacity", "cash"].includes(values.benefitMode))
    errors.push("benefitMode");
  if (errors.length) return { valid: false, complete: false, errors, missing };

  const hourlyCost = money(
    values.costMode === "total"
      ? values.hourlyCost
      : values.grossHourly *
          (1 + (values.holiday + values.employer + values.pension) / 100) +
          values.otherHourly,
  );
  const availableHours =
    (((values.fte * values.weeklyHours * 52) / 12) * values.phoneShare) / 100;
  const volumeHours = values.minutes / 60;
  // Current labour value follows the entered staff capacity. Only the hours
  // eligible for AI time savings are capped by the entered call volume.
  const baselineHours = Math.min(volumeHours, availableHours);
  const automatedHours = (baselineHours * values.automation) / 100;
  const savedHours = Math.max(0, automatedHours - values.followup);
  const remainingHours = baselineHours - automatedHours + values.followup;
  const grossCapacityValue = money(savedHours * hourlyCost);
  const netWorkloadValue = money(
    (automatedHours - values.followup) * hourlyCost,
  );
  // Cash mode never treats released employee hours as automatically avoidable payroll.
  const cashSaving = money((netWorkloadValue * values.avoidedPercent) / 100);
  const valuedBenefit =
    values.benefitMode === "cash" ? cashSaving : netWorkloadValue;
  const firstMonthAutomatedHours = automatedHours * phoneRoiFirstMonthFactor;
  const firstMonthWorkloadValue = money(
    (firstMonthAutomatedHours - values.followup) * hourlyCost,
  );
  const firstMonthBenefit =
    values.benefitMode === "cash"
      ? money((firstMonthWorkloadValue * values.avoidedPercent) / 100)
      : firstMonthWorkloadValue;
  const usageCost = money(values.minutes * values.minuteRate);
  const aiMonthly = missing.includes("management")
    ? undefined
    : money(usageCost + values.management + values.otherMonthly);
  const common = {
    valid: true,
    complete: missing.length === 0,
    errors,
    missing,
    hourlyCost,
    availableHours,
    volumeHours,
    baselineHours,
    automatedHours,
    savedHours,
    remainingHours,
    grossCapacityValue,
    valuedBenefit,
    firstMonthAutomation: values.automation * phoneRoiFirstMonthFactor,
    firstMonthSavedHours: Math.max(
      0,
      firstMonthAutomatedHours - values.followup,
    ),
    firstMonthBenefit,
    usageCost,
    aiMonthly,
    baselineValue: money(availableHours * hourlyCost),
    remainingValue: money(money(availableHours * hourlyCost) - valuedBenefit),
    capacityLimited: volumeHours > availableHours + 0.000001,
    followupExceedsAutomation: values.followup > automatedHours,
  };
  if (missing.length) return common;
  const monthlyNet = money(valuedBenefit - aiMonthly);
  const firstMonthNet = money(firstMonthBenefit - aiMonthly);
  const implementation = values.implementation;
  const breakEvenMonths =
    monthlyNet <= 0
      ? null
      : firstMonthNet >= 0 && implementation <= firstMonthNet
        ? implementation === 0
          ? 0
          : implementation / firstMonthNet
        : 1 + (implementation - firstMonthNet) / monthlyNet;
  // Respect cents-level floating-point boundaries when rounding to the first full month.
  const breakEvenWholeMonth =
    breakEvenMonths === null
      ? null
      : Math.max(0, Math.ceil(breakEvenMonths - 1e-9));
  const yearOne = money(firstMonthNet + monthlyNet * 11 - implementation);
  const yearOneCost = money(implementation + aiMonthly * 12);
  return {
    ...common,
    aiMonthly,
    monthlyNet,
    firstMonthNet,
    breakEvenMonths,
    breakEvenWholeMonth,
    yearOne,
    followingYear: money(monthlyNet * 12),
    roiYearOne: yearOneCost > 0 ? (yearOne / yearOneCost) * 100 : null,
    withAiValue: money(common.baselineValue - valuedBenefit + aiMonthly),
    cumulative: Array.from({ length: 13 }, (_, month) => ({
      month,
      value:
        month === 0
          ? -implementation
          : money(firstMonthNet + (month - 1) * monthlyNet - implementation),
    })),
  };
}

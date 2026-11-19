import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePhoneRoi,
  phoneRoiDefaults,
} from "../../src/lib/phone-roi.mjs";
const calc = (changes = {}) =>
  calculatePhoneRoi({
    ...phoneRoiDefaults,
    automation: 70,
    phoneShare: 40,
    hourlyCost: 35,
    implementation: 1000,
    management: 100,
    ...changes,
  });
test("Tim's AI quote stays fixed; 85% and 100% apply to all telephone work", () => {
  const input = {
    fte: 1,
    weeklyHours: 40,
    phoneShare: 100,
    hourlyCost: 25,
    minutes: 5000,
    minuteRate: 0.22,
    automation: 85,
    implementation: 10000,
    management: 795,
  };
  const r = calc(input);
  assert.equal(r.usageCost, 1100);
  assert.equal(r.aiMonthly, 1895);
  assert.equal(r.baselineValue, 4333.33);
  assert.equal(r.valuedBenefit, 3683.33);
  assert.equal(r.remainingHours, 26);
  assert.equal(r.remainingValue, 650);
  assert.equal(r.withAiValue, 2545);
  assert.equal(r.monthlyNet, 1788.33);
  assert.equal(r.firstMonthNet, -53.33);
  assert.equal(r.remainingValue + r.aiMonthly, r.withAiValue);
  assert.equal(
    Math.round((r.baselineValue - r.withAiValue) * 100),
    Math.round(r.monthlyNet * 100),
  );
  const partial = calc({ management: null });
  assert.equal(partial.remainingValue, 728);
  assert.equal(partial.withAiValue, undefined);
  const full = calc({ ...input, automation: 100 });
  assert.equal(full.savedHours, full.availableHours);
  assert.equal(full.remainingHours, 0);
  assert.equal(full.remainingValue, 0);
  assert.equal(full.withAiValue, full.aiMonthly);
  assert.equal(full.monthlyNet, 2438.33);
  assert.equal(full.firstMonthAutomation, 50);
  assert.equal(full.firstMonthNet, 271.67);
});
test("requested website defaults use 100% telephone time, 90% AI and EUR 20 per hour", () => {
  assert.equal(phoneRoiDefaults.phoneShare, 100);
  assert.equal(phoneRoiDefaults.automation, 90);
  assert.equal(phoneRoiDefaults.hourlyCost, 20);
  const result = calculatePhoneRoi({
    ...phoneRoiDefaults,
    implementation: 1000,
    management: 100,
  });
  assert.ok(Math.abs(result.savedHours - 156) < 1e-8);
  assert.equal(result.monthlyNet, 2150);
  assert.equal(result.firstMonthAutomation, 45);
  assert.ok(Math.abs(result.firstMonthSavedHours - 78) < 1e-8);
  assert.equal(result.firstMonthNet, 590);
  assert.equal(result.yearOne, 23240);
  assert.equal(result.breakEvenWholeMonth, 2);
});
test("known capacity example includes usage, residual work and implementation once", () => {
  const r = calc();
  assert.ok(Math.abs(r.savedHours - 48.5333333333) < 1e-8);
  assert.equal(r.usageCost, 870);
  assert.equal(r.aiMonthly, 970);
  assert.equal(r.monthlyNet, 728.67);
  assert.ok(Math.abs(r.remainingHours - 20.8) < 1e-8);
  assert.equal(r.baselineValue, 2426.67);
  assert.equal(r.withAiValue, 1698);
  assert.equal(r.firstMonthNet, -120.67);
  assert.equal(r.yearOne, 6894.7);
  assert.equal(r.followingYear, 8744.04);
  assert.equal(r.breakEvenWholeMonth, 3);
  assert.equal(r.cumulative[0].value, -1000);
  assert.equal(r.cumulative[12].value, r.yearOne);
});
test("phone-work value and potential time savings scale with fractional FTE and contract hours", () => {
  const input = { ...phoneRoiDefaults, implementation: 1000, management: 100 };
  const base = calculatePhoneRoi(input);
  const fractional = calculatePhoneRoi({ ...input, fte: 1.2 });
  const longerWeek = calculatePhoneRoi({ ...input, weeklyHours: 48 });
  assert.equal(base.baselineValue, 3466.67);
  assert.equal(fractional.availableHours, 208);
  assert.equal(fractional.baselineValue, 4160);
  assert.equal(longerWeek.baselineValue, 4160);
  for (const result of [fractional, longerWeek]) {
    assert.equal(result.savedHours, 187.2);
    assert.equal(result.monthlyNet, 2774);
    assert.equal(result.usageCost, 870);
    assert.equal(
      Math.round((result.baselineValue - result.withAiValue) * 100),
      277400,
    );
  }
  assert.equal(
    calculatePhoneRoi({ ...input, phoneShare: 50 }).baselineValue,
    1733.33,
  );
  assert.equal(calculatePhoneRoi({ ...input, fte: 0 }).baselineValue, 0);
});
test("missing proposal costs produce no fictional ROI; explicit zero is accepted", () => {
  const r = calculatePhoneRoi(phoneRoiDefaults);
  assert.equal(r.complete, false);
  assert.equal(r.monthlyNet, undefined);
  assert.deepEqual(r.missing, ["implementation", "management"]);
  assert.equal(calc({ implementation: 0, management: 0 }).complete, true);
});

test("known monthly AI costs remain visible even before implementation is entered", () => {
  const partial = calc({ implementation: null, management: 100 });
  assert.equal(partial.complete, false);
  assert.equal(partial.aiMonthly, 970);
  assert.equal(partial.monthlyNet, undefined);
  assert.equal(calc({ management: null }).aiMonthly, undefined);
});
test("positive billable minutes only affect cost, and unrelated work is never included", () => {
  const r = calc({
    fte: 0.25,
    weeklyHours: 24,
    phoneShare: 50,
    minutes: 6000,
    automation: 100,
  });
  assert.equal(r.availableHours, 13);
  assert.equal(r.savedHours, 13);
  assert.equal(r.remainingHours, 0);
  assert.equal(r.usageCost, 1740);
  const lowUsage = calc({
    fte: 0.25,
    weeklyHours: 24,
    phoneShare: 50,
    minutes: 300,
    automation: 100,
  });
  assert.equal(lowUsage.savedHours, r.savedHours);
  assert.equal(lowUsage.baselineValue, r.baselineValue);
  assert.equal(lowUsage.withAiValue, 187);
  assert.equal(calc({ fte: 0 }).savedHours, 0);
  assert.equal(calc({ phoneShare: 0 }).savedHours, 0);
  const noUsage = calc({ minutes: 0, automation: 100 });
  assert.equal(noUsage.savedHours, 0);
  assert.equal(noUsage.fullAutomation, 0);
  assert.equal(noUsage.firstMonthAutomation, 0);
  assert.equal(noUsage.remainingHours, noUsage.availableHours);
});
test("cash mode only counts the explicitly avoidable share of released workload", () => {
  assert.equal(
    calc({ benefitMode: "cash", avoidedPercent: 0 }).monthlyNet,
    -970,
  );
  assert.equal(
    calc({ benefitMode: "cash", avoidedPercent: 50 }).monthlyNet,
    -120.66,
  );
  assert.equal(
    calc({ benefitMode: "cash", avoidedPercent: 100 }).monthlyNet,
    728.67,
  );
});
test("human follow-up is retained and excessive follow-up creates a warning, not savings", () => {
  const r = calc({ followup: 60 });
  assert.equal(r.savedHours, 0);
  assert.equal(r.valuedBenefit, -401.33);
  assert.equal(r.followupExceedsAutomation, true);
  assert.equal(r.monthlyNet, -1371.33);
});
test("salary breakdown adds each percentage to gross hourly pay, never to the loaded rate", () => {
  const r = calc({
    costMode: "breakdown",
    grossHourly: 20,
    holiday: 8,
    employer: 20,
    pension: 5,
    otherHourly: 2,
    hourlyCost: 999,
  });
  assert.equal(r.hourlyCost, 28.6);
  assert.equal(
    calc({ costMode: "total", hourlyCost: 35, holiday: 100 }).hourlyCost,
    35,
  );
});
test("no positive advantage has no payback; zero implementation and exact month boundaries", () => {
  assert.equal(calc({ management: 828.67 }).breakEvenMonths, null);
  assert.equal(calc({ management: 1000 }).breakEvenMonths, null);
  assert.equal(calc({ implementation: 0 }).breakEvenWholeMonth, 2);
  assert.equal(calc({ implementation: 608 }).breakEvenWholeMonth, 2);
  assert.equal(calc({ implementation: 608.01 }).breakEvenWholeMonth, 3);
  assert.equal(
    calc({ minutes: 0, implementation: 0, management: 0 }).breakEvenWholeMonth,
    null,
  );
});
test("reject malformed, negative, infinite, excessive and unknown-mode input", () => {
  for (const v of [-1, Infinity, NaN, "3000", 1000001])
    assert.equal(calc({ minutes: v }).valid, false);
  assert.equal(calc({ automation: 101 }).valid, false);
  assert.equal(calc({ benefitMode: "profit" }).valid, false);
  assert.equal(calc({ implementation: -1 }).valid, false);
});

test("first-year ROI uses all AI costs and is undefined for a zero-cost scenario", () => {
  const r = calc();
  assert.ok(Math.abs(r.roiYearOne - (6894.7 / 12640) * 100) < 1e-9);
  assert.equal(
    calc({ implementation: 0, management: 0, minuteRate: 0 }).roiYearOne,
    null,
  );
  assert.equal(
    calc({ implementation: 1000, management: 0, minutes: 0 }).roiYearOne,
    -100,
  );
});

test("launch month halves automated work, keeps full costs and reconciles every chart point", () => {
  const r = calc({ followup: 2 });
  assert.equal(r.firstMonthAutomation, 35);
  assert.ok(Math.abs(r.firstMonthSavedHours - 22.2666666667) < 1e-8);
  assert.equal(r.firstMonthBenefit, 779.33);
  assert.equal(r.firstMonthNet, -190.67);
  assert.equal(r.aiMonthly, 970);
  assert.equal(r.cumulative[0].value, -1000);
  assert.equal(r.cumulative[1].value, -1190.67);
  assert.equal(r.cumulative[2].value, -532);
  assert.equal(r.cumulative[12].value, r.yearOne);
  assert.equal(r.followingYear, 7904.04);
  const m = r.breakEvenWholeMonth;
  assert.ok(r.firstMonthNet + (m - 2) * r.monthlyNet - 1000 < 0);
  assert.ok(r.firstMonthNet + (m - 1) * r.monthlyNet - 1000 >= 0);
  const cash = calc({ benefitMode: "cash", avoidedPercent: 50 });
  assert.equal(cash.firstMonthBenefit, 424.67);
  assert.equal(cash.firstMonthNet, -545.33);
});

test("payback within month one and zero setup use the launch month instead of the steady month", () => {
  const base = {
    weeklyHours: 30,
    automation: 100,
    hourlyCost: 30,
    management: 100,
  };
  assert.equal(
    calculatePhoneRoi({ ...base, implementation: 980 }).breakEvenWholeMonth,
    1,
  );
  assert.equal(
    calculatePhoneRoi({ ...base, implementation: 980.01 }).breakEvenWholeMonth,
    2,
  );
  assert.equal(
    calculatePhoneRoi({ ...base, implementation: 490 }).breakEvenMonths,
    0.5,
  );
  assert.equal(
    calculatePhoneRoi({ ...base, implementation: 0 }).breakEvenWholeMonth,
    0,
  );
});

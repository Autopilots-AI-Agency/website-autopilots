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
test("Tim's EUR 1895 AI quote remains separate from EUR 4457.50 combined workload value", () => {
  const r = calc({
    fte: 1,
    weeklyHours: 40,
    phoneShare: 100,
    hourlyCost: 25,
    minutes: 5000,
    minuteRate: 0.22,
    automation: 85,
    implementation: 10000,
    management: 795,
  });
  assert.equal(r.usageCost, 1100);
  assert.equal(r.aiMonthly, 1895);
  assert.equal(r.baselineValue, 4333.33);
  assert.equal(r.valuedBenefit, 1770.83);
  assert.equal(r.remainingValue, 2562.5);
  assert.equal(r.withAiValue, 4457.5);
  assert.equal(r.monthlyNet, -124.17);
  assert.equal(r.remainingValue + r.aiMonthly, r.withAiValue);
  assert.equal(
    Math.round((r.baselineValue - r.withAiValue) * 100),
    Math.round(r.monthlyNet * 100),
  );
  const partial = calc({ management: null });
  assert.equal(partial.remainingValue, 1201.67);
  assert.equal(partial.withAiValue, undefined);
});
test("requested website defaults use 100% telephone time, 85% AI and EUR 50 per hour", () => {
  assert.equal(phoneRoiDefaults.phoneShare, 100);
  assert.equal(phoneRoiDefaults.automation, 85);
  assert.equal(phoneRoiDefaults.hourlyCost, 50);
  const result = calculatePhoneRoi({
    ...phoneRoiDefaults,
    implementation: 1000,
    management: 100,
  });
  assert.equal(result.savedHours, 42.5);
  assert.equal(result.monthlyNet, 1155);
  assert.equal(result.firstMonthAutomation, 42.5);
  assert.equal(result.firstMonthSavedHours, 21.25);
  assert.equal(result.firstMonthNet, 92.5);
  assert.equal(result.yearOne, 11797.5);
  assert.equal(result.breakEvenWholeMonth, 2);
});
test("known capacity example includes usage, residual work and implementation once", () => {
  const r = calc();
  assert.equal(r.baselineHours, 50);
  assert.equal(r.savedHours, 35);
  assert.equal(r.usageCost, 870);
  assert.equal(r.aiMonthly, 970);
  assert.equal(r.monthlyNet, 255);
  assert.equal(r.remainingHours, 15);
  assert.equal(r.baselineValue, 2426.67);
  assert.equal(r.withAiValue, 2171.67);
  assert.equal(r.firstMonthNet, -357.5);
  assert.equal(r.yearOne, 1447.5);
  assert.equal(r.followingYear, 3060);
  assert.equal(r.breakEvenWholeMonth, 7);
  assert.equal(r.cumulative[0].value, -1000);
  assert.equal(r.cumulative[12].value, r.yearOne);
});
test("current labour value scales with fractional FTE and contract hours without inflating AI savings", () => {
  const input = { ...phoneRoiDefaults, implementation: 1000, management: 100 };
  const base = calculatePhoneRoi(input);
  const fractional = calculatePhoneRoi({ ...input, fte: 1.2 });
  const longerWeek = calculatePhoneRoi({ ...input, weeklyHours: 48 });
  assert.equal(base.baselineValue, 8666.67);
  assert.equal(fractional.availableHours, 208);
  assert.equal(fractional.baselineValue, 10400);
  assert.equal(longerWeek.baselineValue, 10400);
  for (const result of [base, fractional, longerWeek]) {
    assert.equal(result.savedHours, 42.5);
    assert.equal(result.monthlyNet, 1155);
    assert.equal(result.usageCost, 870);
    assert.equal(
      Math.round((result.baselineValue - result.withAiValue) * 100),
      115500,
    );
  }
  assert.equal(
    calculatePhoneRoi({ ...input, phoneShare: 50 }).baselineValue,
    4333.33,
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
test("available telephone FTE hours cap savings and never double-count FTE plus minutes", () => {
  const r = calc({
    fte: 0.25,
    weeklyHours: 24,
    phoneShare: 50,
    minutes: 6000,
    automation: 100,
  });
  assert.equal(r.baselineHours, 13);
  assert.equal(r.savedHours, 13);
  assert.equal(r.capacityLimited, true);
  assert.equal(r.usageCost, 1740);
  assert.equal(calc({ fte: 0 }).savedHours, 0);
});
test("cash mode only counts the explicitly avoidable share of released workload", () => {
  assert.equal(
    calc({ benefitMode: "cash", avoidedPercent: 0 }).monthlyNet,
    -970,
  );
  assert.equal(
    calc({ benefitMode: "cash", avoidedPercent: 50 }).monthlyNet,
    -357.5,
  );
  assert.equal(
    calc({ benefitMode: "cash", avoidedPercent: 100 }).monthlyNet,
    255,
  );
});
test("human follow-up is retained and excessive follow-up creates a warning, not savings", () => {
  const r = calc({ followup: 40 });
  assert.equal(r.savedHours, 0);
  assert.equal(r.valuedBenefit, -175);
  assert.equal(r.followupExceedsAutomation, true);
  assert.equal(r.monthlyNet, -1145);
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
  assert.equal(calc({ management: 355 }).breakEvenMonths, null);
  assert.equal(calc({ management: 1000 }).breakEvenMonths, null);
  assert.equal(calc({ implementation: 0 }).breakEvenWholeMonth, 3);
  assert.equal(calc({ implementation: 765 }).breakEvenWholeMonth, 6);
  assert.equal(calc({ implementation: 152.5 }).breakEvenWholeMonth, 3);
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
  assert.ok(Math.abs(r.roiYearOne - (1447.5 / 12640) * 100) < 1e-9);
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
  assert.equal(r.firstMonthSavedHours, 15.5);
  assert.equal(r.firstMonthBenefit, 542.5);
  assert.equal(r.firstMonthNet, -427.5);
  assert.equal(r.aiMonthly, 970);
  assert.equal(r.cumulative[0].value, -1000);
  assert.equal(r.cumulative[1].value, -1427.5);
  assert.equal(r.cumulative[2].value, -1242.5);
  assert.equal(r.cumulative[12].value, r.yearOne);
  assert.equal(r.followingYear, 12 * r.monthlyNet);
  const m = r.breakEvenWholeMonth;
  assert.ok(r.firstMonthNet + (m - 2) * r.monthlyNet - 1000 < 0);
  assert.ok(r.firstMonthNet + (m - 1) * r.monthlyNet - 1000 >= 0);
  const cash = calc({ benefitMode: "cash", avoidedPercent: 50 });
  assert.equal(cash.firstMonthBenefit, 306.25);
  assert.equal(cash.firstMonthNet, -663.75);
});

test("payback within month one and zero setup use the launch month instead of the steady month", () => {
  const base = { ...phoneRoiDefaults, management: 100 };
  assert.equal(
    calculatePhoneRoi({ ...base, implementation: 92.5 }).breakEvenWholeMonth,
    1,
  );
  assert.equal(
    calculatePhoneRoi({ ...base, implementation: 92.51 }).breakEvenWholeMonth,
    2,
  );
  assert.equal(
    calculatePhoneRoi({ ...base, implementation: 46.25 }).breakEvenMonths,
    0.5,
  );
  assert.equal(
    calculatePhoneRoi({ ...base, implementation: 0 }).breakEvenWholeMonth,
    0,
  );
});

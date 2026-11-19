import { calculatePhoneRoi, phoneRoiDefaults } from "../lib/phone-roi.mjs";

const container = document.querySelector<HTMLElement>("#ap-phone-calculator");
if (container) {
  const root = container;
  const form = root.querySelector<HTMLFormElement>("#rc-form")!;
  const status = root.querySelector<HTMLElement>("#rc-status")!;
  let announcement: ReturnType<typeof setTimeout>;
  const currency = (n: number) =>
    new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);
  const number = (n: number) =>
    new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 }).format(n);
  const set = (selector: string, value: string) => {
    root.querySelectorAll(selector).forEach((el) => (el.textContent = value));
  };
  const output = (key: string, value: string) =>
    set(`[data-output="${key}"]`, value);
  const resultState = (key: string, value: number | null = null) => {
    root
      .querySelectorAll<HTMLElement>(`[data-output="${key}"]`)
      .forEach((el) => {
        el.dataset.resultState =
          value === null || value === 0
            ? "neutral"
            : value > 0
              ? "positive"
              : "negative";
      });
  };
  const visible = (selector: string, show: boolean) => {
    const el = root.querySelector<HTMLElement>(selector)!;
    el.hidden = !show;
    el.querySelectorAll<HTMLInputElement>("input").forEach(
      (input) => (input.disabled = !show),
    );
  };
  function render() {
    const costMode = (form.elements.namedItem("costMode") as HTMLSelectElement)
      .value;
    visible("[data-salary-total]", costMode === "total");
    visible("[data-salary-breakdown]", costMode === "breakdown");
    const input: Record<string, unknown> = {
      ...phoneRoiDefaults,
      benefitMode: "capacity",
    };
    for (const [key, value] of new FormData(form))
      input[key] =
        key === "costMode"
          ? String(value)
          : String(value).trim() === ""
            ? null
            : Number(value);
    const result = calculatePhoneRoi(input);
    form
      .querySelectorAll<HTMLInputElement>("input")
      .forEach((field) =>
        field.setAttribute(
          "aria-invalid",
          String(result.errors.includes(field.name)),
        ),
      );
    const messages: string[] = [];
    if (!result.valid) messages.push("Controleer de gemarkeerde velden.");
    else {
      if (!result.complete)
        messages.push(
          "Vul inrichting en maandbeheer in. Niet van toepassing? Vul 0 in.",
        );
      if (result.capacityLimited)
        messages.push(
          "Tijdwinst is begrensd door jullie beschikbare telefonie-uren.",
        );
      if (result.followupExceedsAutomation)
        messages.push("Extra opvolging vraagt meer tijd dan de AI vrijmaakt.");
      if (result.complete && result.monthlyNet! < 0)
        messages.push(
          "De AI-kosten zijn hoger dan de waarde van de berekende tijdwinst.",
        );
    }
    clearTimeout(announcement);
    announcement = setTimeout(() => {
      status.textContent = messages.join(" ");
      status.dataset.error = String(!result.valid);
      status.hidden = messages.length === 0;
    }, 350);
    for (const key of [
      "net",
      "with",
      "payback",
      "yearOne",
      "followingYear",
      "ai",
      "setup",
      "minutes",
      "minuteRate",
      "management",
      "otherMonthly",
      "firstAutomation",
      "fullAutomation",
    ])
      output(key, "—");
    for (const key of ["net", "yearOne", "followingYear"]) resultState(key);
    if (result.valid) {
      output("firstAutomation", `${number(result.firstMonthAutomation!)}%`);
      output("fullAutomation", `${number(Number(input.automation))}%`);
      output("minutes", number(Number(input.minutes)));
      output(
        "minuteRate",
        new Intl.NumberFormat("nl-NL", {
          style: "currency",
          currency: "EUR",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(Number(input.minuteRate)),
      );
      output(
        "management",
        input.management === null
          ? "Nog invullen"
          : currency(Number(input.management)),
      );
      output("otherMonthly", currency(Number(input.otherMonthly)));
      output(
        "setup",
        input.implementation === null
          ? "Nog invullen"
          : currency(Number(input.implementation)),
      );
      output(
        "ai",
        result.aiMonthly === undefined
          ? "Nog invullen"
          : currency(result.aiMonthly),
      );
      output("hours", `${number(result.savedHours!)} uur`);
      output("current", currency(result.baselineValue!));
      output("remaining", currency(result.remainingValue!));
      output(
        "hourly",
        new Intl.NumberFormat("nl-NL", {
          style: "currency",
          currency: "EUR",
          minimumFractionDigits: 2,
        }).format(result.hourlyCost!),
      );
      output("available", `${number(result.availableHours!)} uur`);
      output("baseline", `${number(result.baselineHours!)} uur`);
      output("gross", currency(result.valuedBenefit!));
      output("usage", currency(result.usageCost!));
    } else
      for (const key of [
        "hours",
        "current",
        "remaining",
        "hourly",
        "available",
        "baseline",
        "gross",
        "usage",
      ])
        output(key, "—");
    if (result.valid && result.complete) {
      output("net", currency(result.monthlyNet!));
      resultState("net", result.monthlyNet!);
      resultState("yearOne", result.yearOne!);
      resultState("followingYear", result.followingYear!);
      output("with", currency(result.withAiValue!));
      output("ai", currency(result.aiMonthly!));
      output("setup", currency(Number(input.implementation)));
      output("yearOne", currency(result.yearOne!));
      output("followingYear", currency(result.followingYear!));
      output(
        "payback",
        result.breakEvenWholeMonth === null
          ? "Geen"
          : result.breakEvenWholeMonth === 0
            ? "Direct"
            : `${number(result.breakEvenWholeMonth!)} ${result.breakEvenWholeMonth === 1 ? "maand" : "maanden"}`,
      );
      set(
        "[data-payback-note]",
        result.breakEvenWholeMonth === null
          ? "Geen terugverdientijd met deze invoer."
          : "Inclusief de opstartmaand, op basis van tijdwaarde.",
      );
      set(
        "[data-chart-caption]",
        `Na 12 maanden: ${currency(result.yearOne!)} tijdwaarde, na inrichting en opstart.`,
      );
      const points = result.cumulative!;
      const low = Math.min(0, ...points.map((p) => p.value));
      const high = Math.max(0, ...points.map((p) => p.value));
      const span = Math.max(high - low, 1);
      const x = (month: number) => 24 + (month / 12) * 592;
      const y = (value: number) => 190 - ((value - low) / span) * 158;
      const path = points
        .map(
          (p, i) =>
            `${i ? "L" : "M"}${x(p.month).toFixed(2)},${y(p.value).toFixed(2)}`,
        )
        .join(" ");
      root.querySelector("[data-chart-line]")!.setAttribute("d", path);
      root
        .querySelector("[data-chart-area]")!
        .setAttribute("d", `${path} L616,${y(0)} L24,${y(0)} Z`);
      const zero = root.querySelector("[data-zero-line]")!;
      zero.setAttribute("y1", String(y(0)));
      zero.setAttribute("y2", String(y(0)));
      root
        .querySelector("[data-zero-label]")!
        .setAttribute("y", String(y(0) - 9));
      const dot = root.querySelector<SVGElement>("[data-chart-dot]")!;
      const payback = result.breakEvenMonths;
      dot.toggleAttribute(
        "hidden",
        payback === null || payback === undefined || payback > 12,
      );
      if (payback !== null && payback !== undefined && payback <= 12) {
        dot.setAttribute("cx", String(x(payback)));
        dot.setAttribute("cy", String(y(0)));
      }
      set(
        "#rc-chart-desc",
        `De lijn start op ${currency(-Number(input.implementation))}. Netto capaciteitswaarde in maand 1: ${currency(result.firstMonthNet!)}. Vanaf maand 2: ${currency(result.monthlyNet!)} per maand. Na twaalf maanden: ${currency(result.yearOne!)}. ${result.breakEvenWholeMonth === null ? "Geen terugverdientijd." : `Terugverdiend in ${result.breakEvenWholeMonth} volledige maanden.`}`,
      );
    } else {
      root.querySelector("[data-chart-line]")!.removeAttribute("d");
      root.querySelector("[data-chart-area]")!.removeAttribute("d");
      root.querySelector("[data-chart-dot]")!.setAttribute("hidden", "");
      set(
        "[data-chart-caption]",
        "Vul de ontbrekende kosten in voor jullie jaaroverzicht.",
      );
      set(
        "#rc-chart-desc",
        "Nog geen complete, geldige invoer. Er wordt geen voordeel berekend.",
      );
      set("[data-payback-note]", "Vul de ontbrekende kosten in.");
    }
  }
  root.addEventListener("input", render);
  root.addEventListener("change", render);
  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("reset", () => {
    requestAnimationFrame(render);
  });
  render();
}

export function setupBranchDropdown(
  form: HTMLFormElement,
  select: HTMLSelectElement,
) {
  const root = form.querySelector<HTMLElement>(".sp-dropdown")!;
  const trigger = root.querySelector<HTMLButtonElement>(
    ".sp-dropdown-trigger",
  )!;
  const panel = root.querySelector<HTMLElement>(".sp-dropdown-panel")!;
  const search = root.querySelector<HTMLInputElement>(".sp-branch-search")!;
  const options = [
    ...root.querySelectorAll<HTMLButtonElement>(".sp-branch-choice"),
  ];
  const empty = root.querySelector<HTMLElement>(".sp-branch-empty")!;
  const count = root.querySelector<HTMLElement>(".sp-search-count")!;
  const visible = () => options.filter((option) => !option.hidden);
  function filter() {
    const query = search.value.trim().toLocaleLowerCase("nl");
    options.forEach(
      (option) =>
        (option.hidden = !option.dataset
          .branch!.toLocaleLowerCase("nl")
          .includes(query)),
    );
    empty.hidden = visible().length > 0;
    count.textContent = `${visible().length} branches gevonden`;
  }
  function close(restore = false) {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (restore) trigger.focus({ preventScroll: true });
  }
  function open() {
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    search.value = "";
    filter();
    // Keep the search and the bounded list visible, including above a mobile keyboard.
    search.focus({ preventScroll: true });
    panel.scrollIntoView({ block: "nearest", behavior: "instant" });
  }
  trigger.addEventListener("click", () => (panel.hidden ? open() : close()));
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      open();
    }
  });
  search.addEventListener("input", filter);
  options.forEach((option) =>
    option.addEventListener("click", () => {
      select.value = option.dataset.branch!;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      close(true);
    }),
  );
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key === "Enter" && event.target === search) {
      event.preventDefault();
      visible()[0]?.click();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    if (event.target === search && ["Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const choices = visible();
    const current = choices.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? choices.length - 1
          : event.key === "ArrowDown"
            ? Math.min(current + 1, choices.length - 1)
            : current <= 0
              ? -1
              : current - 1;
    if (next < 0) search.focus();
    else choices[next]?.focus();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!root.contains(event.target as Node)) close();
  });
  root.addEventListener("focusout", (event) => {
    if (!root.contains(event.relatedTarget as Node | null)) close();
  });
  return {
    close,
    focus: () => trigger.focus({ preventScroll: true }),
    sync(branch: string) {
      root.querySelector("#sp-branch-value")!.textContent =
        branch || "Zoek jullie branche in de lijst";
      options.forEach((option) =>
        option.setAttribute(
          "aria-pressed",
          String(option.dataset.branch === branch),
        ),
      );
    },
  };
}

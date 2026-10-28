export function siteOrigin(value = "https://auto-pilots.io") {
  if (!["https://auto-pilots.io", "https://www.auto-pilots.io"].includes(value)) {
    throw new Error("Unsupported Autopilots publication origin");
  }
  return value;
}

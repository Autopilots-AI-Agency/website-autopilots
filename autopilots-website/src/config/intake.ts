export const intake = {
  path: "/ontwerpen/intake/",
  label: "Ontdek jouw mogelijkheden",
  compactLabel: "Start de quiz",
  home: "/nl/",
} as const;

export const campaignKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
];

export function withCampaign(path: string, search: string) {
  const query = new URLSearchParams(search);
  const destination = new URL(path, "https://auto-pilots.io");
  campaignKeys.forEach((key) => {
    const value = query.get(key);
    if (value && !destination.searchParams.has(key))
      destination.searchParams.set(key, value);
  });
  return destination.pathname + destination.search + destination.hash;
}

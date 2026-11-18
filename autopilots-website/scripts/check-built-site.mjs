import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, normalize, relative, resolve } from "node:path";

const root = resolve("dist");
const htmlFiles = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name === "index.html" || entry.name === "404.html")
      htmlFiles.push(path);
  }
};
walk(root);

const errors = [];
const checked = new Set();
const seenTitles = new Map();
const seenCanonicals = new Map();
const decodeHtml = (value) =>
  value
    ?.replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, code) =>
      String.fromCodePoint(
        code[0].toLowerCase() === "x"
          ? parseInt(code.slice(1), 16)
          : Number(code),
      ),
    )
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
const shareImagePath = "/og/autopilots-social-20261118.png";
const shareImageUrl = `https://auto-pilots.io${shareImagePath}`;
const shareImage = readFileSync(join(root, shareImagePath));
if (
  shareImage.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
  shareImage.readUInt32BE(16) !== 1200 ||
  shareImage.readUInt32BE(20) !== 630 ||
  shareImage.length > 5 * 1024 * 1024
)
  errors.push("Deelafbeelding moet een PNG van 1200x630 onder 5 MB zijn.");
const publicBuildTerms =
  /\b(lorem ipsum|placeholder|previewpagina|demo content|interne notitie)\b|\bTODO\s*:/i;

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const page = `/${relative(root, file)
    .replaceAll("\\", "/")
    .replace(/index\.html$/, "")}`;
  const h1Count = (html.match(/<h1(?:\s|>)/g) || []).length;
  const redirect = html.includes('http-equiv="refresh"');
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const lang = html.match(/<html[^>]+lang="([^"]+)"/)?.[1] ?? "unknown";
  const titleKey = `${lang}:${title}`;
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (h1Count !== 1 && !redirect)
    errors.push(`${page}: verwacht 1 H1, gevonden ${h1Count}`);
  if (!title && !redirect) errors.push(`${page}: title ontbreekt`);
  if (!/<meta name="description" content="[^"]+"/.test(html) && !redirect)
    errors.push(`${page}: meta description ontbreekt`);
  if (!redirect) {
    // Inspect server-rendered head tags: social crawlers do not run page scripts.
    const head = html.match(/<head[\s>][\s\S]*?<\/head>/)?.[0] ?? "";
    const metadata = new Map();
    for (const tag of head.match(/<meta\b[^>]*>/g) ?? []) {
      const key = tag.match(/(?:name|property)="([^"]+)"/)?.[1];
      const value = tag.match(/content="([^"]*)"/)?.[1];
      if (key) metadata.set(key, [...(metadata.get(key) ?? []), value]);
    }
    const expected = {
      "og:site_name": "Autopilots",
      "og:title": title,
      "og:description": metadata.get("description")?.[0],
      "og:url": canonical,
      "og:image": shareImageUrl,
      "og:image:secure_url": shareImageUrl,
      "og:image:type": "image/png",
      "og:image:width": "1200",
      "og:image:height": "630",
      "og:image:alt": "Autopilots",
      "twitter:card": "summary_large_image",
      "twitter:title": title,
      "twitter:description": metadata.get("description")?.[0],
      "twitter:image": shareImageUrl,
      "twitter:image:alt": "Autopilots",
    };
    for (const [key, value] of Object.entries(expected)) {
      const values = metadata.get(key) ?? [];
      if (
        !value ||
        values.length !== 1 ||
        decodeHtml(values[0]) !== decodeHtml(value)
      )
        errors.push(`${page}: onjuiste of dubbele deelmetadata ${key}`);
    }
    if (!canonical?.startsWith("https://auto-pilots.io/"))
      errors.push(
        `${page}: canonical moet een absolute publieke HTTPS-URL zijn`,
      );
    if (head.includes("/og/autopilots-og.svg"))
      errors.push(`${page}: verouderde SVG in metadata of structured data`);
  }
  const noindex = html.includes('content="noindex');
  if (!canonical && !redirect && !noindex)
    errors.push(`${page}: canonical ontbreekt`);
  if (!redirect && !noindex) {
    if (title && seenTitles.has(titleKey))
      errors.push(
        `${page}: dubbele title binnen ${lang} met ${seenTitles.get(titleKey)}`,
      );
    if (canonical && seenCanonicals.has(canonical))
      errors.push(
        `${page}: dubbele canonical met ${seenCanonicals.get(canonical)}`,
      );
    if (title) seenTitles.set(titleKey, page);
    if (canonical) seenCanonicals.set(canonical, page);
  }
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ");
  if (publicBuildTerms.test(visibleText))
    errors.push(`${page}: publieke bouwterm gevonden`);
  if (!redirect && !/<html[^>]+lang="[^"]+"/.test(html))
    errors.push(`${page}: html-lang ontbreekt`);
  if (/tabindex="[1-9]/.test(html))
    errors.push(`${page}: positieve tabindex gevonden`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length)
    errors.push(`${page}: dubbele id ${[...new Set(duplicateIds)].join(", ")}`);
  for (const tag of html.match(/<img\b[^>]*>/g) || [])
    if (!/\balt="[^"]*"/.test(tag))
      errors.push(`${page}: afbeelding zonder alt`);
  for (const tag of html.match(/<iframe\b[^>]*>/g) || [])
    if (!/\btitle="[^"]+"/.test(tag))
      errors.push(`${page}: iframe zonder titel`);
  for (const tag of html.match(/<a\b[^>]*target="_blank"[^>]*>/g) || [])
    if (!/\brel="[^"]*noopener/.test(tag))
      errors.push(`${page}: externe nieuwe tab zonder noopener`);

  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1].replaceAll("&#38;", "&amp;").replaceAll("&amp;", "&");
    if (!href || /^(https?:|mailto:|tel:|javascript:)/.test(href)) continue;
    if (href.startsWith("#")) {
      const id = decodeURIComponent(href.slice(1));
      if (id && !html.includes(`id="${id}"`))
        errors.push(`${page}: kapot anker ${href}`);
      continue;
    }
    const key = `${page} -> ${href}`;
    if (checked.has(key)) continue;
    checked.add(key);
    const clean = href.split("#")[0].split("?")[0];
    const sourceUrl = new URL(
      page,
      process.env.PUBLIC_SITE_URL || "https://auto-pilots.io",
    );
    const targetUrl = new URL(clean, sourceUrl);
    let target = join(root, decodeURIComponent(targetUrl.pathname));
    if (targetUrl.pathname.endsWith("/")) target = join(target, "index.html");
    else if (!extname(target)) target = join(target, "index.html");
    if (!existsSync(normalize(target)))
      errors.push(`${page}: kapotte link ${href}`);
    else if (href.includes("#")) {
      const id = decodeURIComponent(href.split("#")[1] || "");
      if (id && !readFileSync(normalize(target), "utf8").includes(`id="${id}"`))
        errors.push(`${page}: kapot anker ${href}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(
  `OK: ${htmlFiles.length} HTML-pagina's, ${checked.size} interne links, metadata en H1-structuur gecontroleerd.`,
);

import { scanLocale } from "./intake-i18n.mjs";
import { intakeMailCopy } from "./intake-mail-i18n.mjs";
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

// Transactional confirmation only; never include raw website content or AI HTML.
export function intakeConfirmation({
  name,
  bookingUrl,
  locale: language = "nl",
}) {
  const locale = scanLocale(language);
  const copy = intakeMailCopy(locale);
  const url = new URL(bookingUrl);
  if (
    url.protocol !== "https:" ||
    !["auto-pilots.io", "api.leadconnectorhq.com"].includes(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new Error("Invalid booking URL");
  }
  const greeting =
    String(name || "")
      .trim()
      .slice(0, 100) || copy.fallback;
  const subject = copy.subject;
  const salutation = [copy.hello, greeting].filter(Boolean).join(" ") + ",";
  const text = [
    salutation,
    copy.thanks,
    copy.intro,
    copy.invitation,
    url.href,
    copy.booked,
    copy.terms,
    copy.team,
    "https://auto-pilots.io/" + locale + "/",
  ].join("\n\n");
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(subject)}</title></head>
<body style="margin:0;background:#101e25;color:#f5f1eb;font-family:'Public Sans',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${escape(copy.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#101e25;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr><td style="padding:0 0 32px;color:#f5f1eb;font-size:23px;font-weight:700;letter-spacing:4px;">AUTOPILOTS</td></tr>
<tr><td style="padding:32px 26px;background:#1b303a;border:1px solid #40515a;border-radius:20px;">
<p style="margin:0 0 20px;color:#c39068;font-size:12px;letter-spacing:2px;font-weight:700;">${escape(copy.eyebrow)}</p>
<h1 style="margin:0 0 24px;font-size:34px;line-height:1.15;color:#f5f1eb;">${escape(copy.heading)}<br><span style="color:#c39068;">${escape(copy.accent)}</span></h1>
<p style="font-size:16px;line-height:26px;color:#f5f1eb;">${escape(salutation)}</p>
<p style="font-size:16px;line-height:26px;color:#c0cdd1;">${escape(copy.thanks)}</p>
<p style="font-size:16px;line-height:26px;color:#c0cdd1;">${escape(copy.intro)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr><td bgcolor="#8f573a" style="border-radius:10px;"><a href="${escape(url.href)}" style="display:inline-block;padding:17px 24px;color:#fffaf5;font-size:16px;font-weight:700;text-decoration:none;">${escape(copy.cta)} &rarr;</a></td></tr></table>
<p style="font-size:14px;line-height:23px;color:#c0cdd1;">${escape(copy.booked)}</p>
<p style="margin:24px 0 0;padding-top:24px;border-top:1px solid #40515a;font-size:14px;line-height:23px;color:#c0cdd1;">${escape(copy.terms)}</p>
</td></tr><tr><td style="padding:26px 4px;font-size:13px;line-height:22px;color:#a9b9c0;">${escape(copy.team)}<br>${escape(copy.tagline)}<br><br>${escape(copy.reason)}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}

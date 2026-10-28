import { escapeMarkup, type ShowcaseProfile } from "./showcase-profiles";
import { translateDemoHtml } from "./showcase-i18n";
import type { SupportedLocale } from "../../i18n/languages";
const wave = Array.from(
  { length: 21 },
  (_, i) => `<i style="height:${12 + Math.sin(i * 1.7) ** 2 * 26}px"></i>`,
).join("");
export const showcaseExamples = [
  `<div class="sx-agent sx-scene">
 <div class="sx-phone"><div class="sx-island"></div><span class="sx-phone-time">09:41</span><div class="sx-contact"><span>JV</span><small>INKOMENDE KLANTVRAAG</small><strong>Joris van Dijk</strong><p data-dx-call>Inkomend gesprek</p></div><div class="sx-voice">${wave}</div><div class="dx-switch"><button data-dx-channel="phone" aria-pressed="true">Telefonie</button><button data-dx-channel="chat" aria-pressed="false">Chat</button></div><div class="sx-transcript"><small>KLANT</small><p data-customer-line>“Ik wil een kennismaking plannen.”</p><div class="dx-reveal" data-dx-at=".2"><small>AUTOPILOTS / AI-MEDEWERKER</small><p data-agent-line>“Natuurlijk. Vertel eens over je project.”</p></div></div><div class="sx-call-end" aria-hidden="true">⌁</div></div>
 <div class="sx-agent-work"><div class="sx-console-head"><span class="sx-live-dot"></span> VAN GESPREK NAAR ACTIE <small>VOORBEELD</small></div><h3>Luistert.<br>Begrijpt.<br><em>Voert uit.</em></h3><div class="sx-intelligence dx-reveal" data-dx-at=".3"><span class="sx-step">01</span><div><small>VRAAG HERKEND</small><strong>Een woning laten ontwerpen</strong><p>Kennismaken · nieuw project</p></div><b>✓</b></div><div class="sx-intelligence dx-reveal" data-dx-at=".52"><span class="sx-step">02</span><div><small>KLANTDOSSIER AANGEVULD</small><strong>Joris van Dijk</strong><p>Gesprek + projectwens bij elkaar</p></div><b>✓</b></div><div class="sx-intelligence dx-reveal" data-dx-at=".75"><span class="sx-step">03</span><div><small>VERVOLG VOORBEREID</small><strong>Je team kan verder</strong><p>Klant krijgt een ontvangstbevestiging</p></div><b>✓</b></div><p class="sx-control-note">Jij bepaalt de acties. Je team kan overnemen.</p></div>
</div>`,
  `<div class="sx-software sx-scene dx-planner"><aside class="sx-sidebar"><b>A<span> / WORKSPACE</span></b><span class="sx-side-active">Overzicht</span><span>Klanten</span><span>Projecten</span><span>Documenten</span><span>Team</span><small>GEBOUWD RONDOM JOUW WERK</small></aside><div class="sx-workspace"><header><span>JOUW BEDRIJF / PROJECTEN</span><b>JD</b></header><div class="sx-workspace-title"><h3>Van losse informatie.<br><em>Naar één werkplek.</em></h3><span class="sx-live-dot"></span></div><div class="sx-module-row"><div><small>KLANT</small><strong>Joris van Dijk</strong><span>Nieuw project</span></div><div class="dx-reveal" data-dx-at=".15"><small>PROJECT</small><strong>Duinvilla</strong><span>Ontwerp & realisatie</span></div><div class="dx-reveal" data-dx-at=".3"><small>DOCUMENTEN</small><strong>Briefing.pdf</strong><span>Gekoppeld aan project</span></div></div><div class="sx-project-board"><div class="sx-board-head"><strong>Van aanvraag naar uitvoering</strong><span>JOUW PROCES</span></div><div class="sx-board-columns"><div><small>01 / AANVRAAG</small><article><i>JV</i><strong>Duinvilla</strong><p>Wensen ontvangen</p><span>Architectuur</span></article></div><div class="dx-reveal" data-dx-at=".42"><small>02 / VOORBEREIDING</small><article class="sx-working"><strong>Ontwerp voorbereiden</strong><p>Briefing compleet</p><div class="sx-avatars"><i>LS</i><i>MK</i><span>Team toegewezen</span></div><div class="sx-mini-progress"><i></i></div></article></div><div class="dx-reveal" data-dx-at=".66"><small>03 / KLANTPORTAAL</small><article class="sx-customer-portal"><small>WELKOM JORIS</small><strong>Je project is gestart.</strong><p>Bekijk je documenten en volgende stap.</p><span>✓ Dezelfde informatie. Direct bijgewerkt.</span></article></div></div></div><div class="sx-sync dx-reveal" data-dx-at=".82"><span>↳</span><strong>Eén wijziging. Overal het juiste overzicht.</strong><small>Team ↔ klantportaal</small></div></div></div>`,
  `<div class="dx-heading sx-site-label"><span>03 / WEBSITES & BACKENDS</span></div><div class="dx-site dx-atelier sx-architecture"><div class="dx-address"><i></i> ATELIER NOORD · CONCEPTWEBSITE <span>↗</span></div><div class="dx-atelier-nav"><b>NOORD<span>®</span></b><span>Architectuur voor een andere manier van leven.</span><i>MENU +</i></div><div class="sx-architecture-hero"><div class="dx-atelier-copy"><small>ONTWORPEN VOOR HET LEVEN.</small><h4>Bijzonder wonen.<br><em>Van nature.</em></h4><p>Van eerste lijn tot een plek die helemaal klopt.</p></div><div class="sx-house-stage"><canvas data-house-canvas aria-label="Driedimensionale villa die tijdens het scrollen wordt opgebouwd"></canvas><div class="sx-house-fallback">Contour → constructie → gevel → glas → landschap</div><span class="sx-house-index">01 — DUINVILLA</span><div class="sx-house-phase"><i></i><span data-house-phase>Van eerste lijn tot thuis</span></div></div><div class="sx-project-details"><span>DUINLANDSCHAP / NEDERLAND</span><span>LICHT. RUIMTE. RUST.</span><b>Ontdek het ontwerp ↗</b></div></div><div class="dx-atelier-bottom"><span>Een eigen visie.<br><b>Een website die je laat voelen.</b></span><div class="dx-submit">Start je project <span>↗</span></div></div></div><div class="dx-pipeline sx-website-pipeline"><div class="dx-reveal" data-dx-at=".68"><i>✓</i><span>Aanvraag opgeslagen<small>Eigen backend</small></span></div><b>→</b><div class="dx-reveal" data-dx-at=".85"><i>✓</i><span>Bij jouw team<small>Alles verbonden</small></span></div></div>`,
];

// Replace whole template tokens in a single pass: user text can never become markup
// or accidentally match a later replacement. The original no-JS demo stays intact.
export function renderShowcase(
  profile: ShowcaseProfile,
  locale: SupportedLocale = "nl",
): string[] {
  const siteAction: Record<string, string> = {
    automotive: "Vraag een proefrit aan",
    construction: "Bespreek je verbouwplan",
    installation: "Vraag advies aan",
    property: "Vraag een bezichtiging aan",
    business: "Plan een kennismaking",
    beauty: "Vraag een afspraak aan",
  };
  const replacements: Record<string, string> = {
    "Start je project": siteAction[profile.id] || "Start je project",
    "Ontdek het ontwerp ↗":
      profile.id === "automotive"
        ? "Ontdek deze auto ↗"
        : profile.id === "beauty"
          ? "Ontdek de salon ↗"
          : "Ontdek de mogelijkheden ↗",
    "Ik wil een kennismaking plannen.": profile.question,
    "Natuurlijk. Vertel eens over je project.": profile.reply,
    "Een woning laten ontwerpen": profile.intent,
    "Kennismaken · nieuw project": profile.context,
    "Je team kan verder": profile.action,
    "Gesprek + projectwens bij elkaar": profile.context,
    Duinvilla: profile.project,
    DUINVILLA: profile.project.toLocaleUpperCase("nl"),
    "Briefing.pdf": profile.document,
    "Ontwerp & realisatie": profile.context,
    "Ontwerp voorbereiden": profile.preparation,
    Architectuur: profile.label,
    "Je project is gestart.": profile.portal,
    "JOUW BEDRIJF / PROJECTEN": `JOUW BEDRIJF / ${profile.module.toLocaleUpperCase("nl")}`,
    Projecten: profile.module,
    "ATELIER NOORD · CONCEPTWEBSITE": `${profile.brand} · CONCEPTWEBSITE`,
    NOORD: profile.brand,
    "Architectuur voor een andere manier van leven.": profile.tagline,
    "ONTWORPEN VOOR HET LEVEN.": profile.label.toLocaleUpperCase("nl"),
    "Bijzonder wonen.": profile.title,
    "Van nature.": profile.emphasis,
    "Van eerste lijn tot een plek die helemaal klopt.": profile.description,
    "Driedimensionale villa die tijdens het scrollen wordt opgebouwd":
      locale === "nl"
        ? `Driedimensionaal ${profile.label.toLocaleLowerCase("nl")}-voorbeeld dat zich opbouwt tijdens het scrollen`
        : `${profile.label}: ${profile.phases.join(", ")}`,
    "Van eerste lijn tot thuis": profile.phases[0],
    "Contour → constructie → gevel → glas → landschap":
      profile.phases.join(" → "),
    "DUINLANDSCHAP / NEDERLAND": profile.label.toLocaleUpperCase("nl"),
    "LICHT. RUIMTE. RUST.": "JOUW VERHAAL. IN BEELD.",
  };
  const pattern = new RegExp(
    Object.keys(replacements)
      .sort((a, b) => b.length - a.length)
      .map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|"),
    "g",
  );
  return showcaseExamples.map((template) =>
    translateDemoHtml(
      template.replace(pattern, (key) => escapeMarkup(replacements[key])),
      locale,
    ).replace(/[→↓↗↻]/g, ""),
  );
}

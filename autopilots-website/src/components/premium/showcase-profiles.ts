export type VisualKind =
  "house" | "car" | "energy" | "interior" | "office" | "salon";
export type ShowcaseProfile = {
  id: string;
  label: string;
  branch: string;
  aliases: string[];
  icon: string;
  question: string;
  chat: string;
  reply: string;
  intent: string;
  context: string;
  action: string;
  project: string;
  document: string;
  module: string;
  preparation: string;
  portal: string;
  brand: string;
  tagline: string;
  title: string;
  emphasis: string;
  description: string;
  visual: VisualKind;
  phases: string[];
  accent: string;
  flow: string[];
};
export const generalProfile: ShowcaseProfile = {
  id: "general",
  label: "Algemeen voorbeeld",
  branch: "",
  aliases: [],
  icon: "↗",
  question: "Ik wil een kennismaking plannen.",
  chat: "Kunnen jullie mijn woning ontwerpen?",
  reply: "Natuurlijk. Vertel eens over je project.",
  intent: "Een woning laten ontwerpen",
  context: "Kennismaken · nieuw project",
  action: "Je team kan verder",
  project: "Duinvilla",
  document: "Briefing.pdf",
  module: "Projecten",
  preparation: "Ontwerp voorbereiden",
  portal: "Je project is gestart.",
  brand: "NOORD",
  tagline: "Architectuur voor een andere manier van leven.",
  title: "Bijzonder wonen.",
  emphasis: "Van nature.",
  description: "Van eerste lijn tot een plek die helemaal klopt.",
  visual: "house",
  phases: [
    "Eerste lijnen",
    "Fundering & volume",
    "Gevels & glas",
    "Dak & landschap",
    "Een plek om te leven",
  ],
  accent: "#314235",
  flow: ["Websiteaanvraag", "AI vraagt door", "Project aangemaakt"],
};
export const showcaseProfiles: ShowcaseProfile[] = [
  {
    ...generalProfile,
    id: "automotive",
    label: "Autobedrijven",
    branch: "Autobedrijven",
    aliases: ["garage", "auto", "dealer", "autobedrijf"],
    icon: "↗",
    question: "Kan ik zaterdag een proefrit maken?",
    chat: "Is de elektrische SUV nog beschikbaar?",
    reply:
      "Welke auto heb je op het oog? Dan bereid ik je proefritaanvraag voor.",
    intent: "Proefrit met een elektrische SUV",
    context: "Voertuig + voorkeursmoment",
    action: "Proefritaanvraag bij verkoop",
    project: "Elektrische SUV",
    document: "Voertuiggegevens",
    module: "Voorraad",
    preparation: "Proefrit voorbereiden",
    portal: "Je proefritaanvraag staat klaar.",
    brand: "VELO",
    tagline: "Auto’s met karakter. Service met aandacht.",
    title: "Vooruit. Op jouw manier.",
    emphasis: "Elektrisch karakter.",
    description: "Ontdek je volgende auto. Van eerste blik tot eerste rit.",
    visual: "car",
    phases: [
      "De eerste contour",
      "Het onderstel",
      "De carrosserie",
      "Glas & details",
      "Klaar voor een proefrit",
    ],
    accent: "#304c67",
    flow: ["Proefritaanvraag", "AI verzamelt je wensen", "Verkoop kan verder"],
  },
  {
    ...generalProfile,
    id: "construction",
    label: "Bouw & renovatie",
    branch: "Bouw & renovatie",
    aliases: [
      "Architecten",
      "Dakdekkers",
      "Glaszetters",
      "Kozijnenbedrijven",
      "Vloerenleggers",
      "bouw",
      "aannemer",
      "renovatie",
    ],
    icon: "⌂",
    question: "Kunnen jullie onze woning verbouwen?",
    chat: "Ik wil meer ruimte en een uitbouw.",
    reply:
      "Wat wil je veranderen? Ik verzamel je wensen voor de werkvoorbereider.",
    intent: "Woning uitbreiden en verduurzamen",
    context: "Wensen + locatie + gewenste start",
    action: "Opname voorbereiden met je team",
    project: "Uitbouw familie Van Dijk",
    document: "Wensen & foto’s",
    module: "Bouwprojecten",
    preparation: "Opname voorbereiden",
    portal: "Je verbouwplan krijgt vorm.",
    brand: "FORMA",
    tagline: "Bouwen aan de manier waarop je wilt leven.",
    title: "Meer ruimte.",
    emphasis: "Meer thuis.",
    description: "Van eerste schets tot laatste detail. Gebouwd rondom jou.",
    flow: [
      "Verbouwaanvraag",
      "AI verzamelt projectwensen",
      "Werkvoorbereiding gestart",
    ],
  },
  {
    ...generalProfile,
    id: "installation",
    label: "Installatiebedrijven",
    branch: "Installatiebedrijven",
    aliases: [
      "Zonnepanelenbedrijven",
      "installatie",
      "warmtepomp",
      "elektricien",
    ],
    icon: "⌁",
    question: "Is mijn huis geschikt voor een warmtepomp?",
    chat: "Ik wil advies over een warmtepomp en zonnepanelen.",
    reply:
      "Wat voor woning heb je en hoe verwarm je nu? Ik zet dit klaar voor je adviseur.",
    intent: "Advies over een duurzame installatie",
    context: "Woningtype + huidige verwarming",
    action: "Adviesaanvraag voor je installateur",
    project: "Warmtepomp Van Dijk",
    document: "Woninggegevens",
    module: "Werkbonnen",
    preparation: "Technische opname",
    portal: "Je installatie, helder in beeld.",
    brand: "VOLT",
    tagline: "Comfortabel wonen. Slim omgaan met energie.",
    title: "Comfort voor nu.",
    emphasis: "Energie voor morgen.",
    description:
      "Een installatie die past bij jouw woning en manier van leven.",
    visual: "energy",
    phases: [
      "Jouw woning",
      "De installatie",
      "Zonne-energie",
      "Alles verbonden",
      "Comfort in balans",
    ],
    accent: "#526347",
    flow: [
      "Adviesaanvraag",
      "AI verzamelt woninggegevens",
      "Opname wordt voorbereid",
    ],
  },
  {
    ...generalProfile,
    id: "property",
    label: "Vastgoed & makelaars",
    branch: "Makelaars",
    aliases: [
      "Vastgoedbeheerders",
      "Woningcorporaties",
      "vastgoed",
      "makelaar",
    ],
    icon: "▱",
    question: "Kan ik deze woning bezichtigen?",
    chat: "Ik wil meer weten over de woning aan de Parklaan.",
    reply:
      "Wat zoek je in een woning? Ik verzamel je voorkeuren voor de makelaar.",
    intent: "Bezichtiging Parklaan 24",
    context: "Woonwensen + beschikbaarheid",
    action: "Bezichtigingsaanvraag bij je makelaar",
    project: "Parklaan 24",
    document: "Woningdossier",
    module: "Woningaanbod",
    preparation: "Bezichtiging voorbereiden",
    portal: "Jouw volgende stap naar thuis.",
    brand: "MAISON",
    tagline: "Bijzondere plekken. Een persoonlijk verhaal.",
    title: "Hier begint",
    emphasis: "jouw volgende hoofdstuk.",
    description:
      "Ontdek de ruimte, het licht en de mogelijkheden van jouw nieuwe thuis.",
    visual: "interior",
    phases: [
      "De plattegrond",
      "De leefruimtes",
      "Jouw inrichting",
      "Licht & ruimte",
      "Welkom thuis",
    ],
    accent: "#6a5847",
    flow: [
      "Bezichtigingsaanvraag",
      "AI brengt woonwensen in kaart",
      "Makelaar heeft het overzicht",
    ],
  },
  {
    ...generalProfile,
    id: "business",
    label: "Zakelijke dienstverlening",
    branch: "Zakelijke dienstverlening",
    aliases: [
      "Coaching",
      "Verzekeraars",
      "advies",
      "consultancy",
      "accountant",
    ],
    icon: "⊞",
    question: "Kunnen jullie ons helpen met onze groei?",
    chat: "Ik zoek advies voor de volgende stap van ons bedrijf.",
    reply:
      "Waar loop je nu tegenaan? Ik bereid een gerichte kennismaking voor.",
    intent: "Adviestraject voor een groeiend bedrijf",
    context: "Uitdaging + doel + betrokken team",
    action: "Intake voor de juiste adviseur",
    project: "Groeitraject Van Dijk",
    document: "Intake & doelen",
    module: "Trajecten",
    preparation: "Plan van aanpak",
    portal: "Je traject. Samen vooruit.",
    brand: "STUDIO NEXT",
    tagline: "Heldere richting. Ruimte om te groeien.",
    title: "Een nieuwe blik.",
    emphasis: "Een volgende stap.",
    description: "Van ambitie naar een helder plan dat je team verder brengt.",
    visual: "office",
    phases: [
      "Een helder vertrekpunt",
      "Mensen & expertise",
      "Jouw werkplek",
      "Samen aan tafel",
      "Ruimte om te groeien",
    ],
    accent: "#48516a",
    flow: [
      "Adviesvraag",
      "AI bereidt de intake voor",
      "Traject krijgt structuur",
    ],
  },
  {
    ...generalProfile,
    id: "beauty",
    label: "Beauty & salons",
    branch: "Beauty & salons",
    aliases: ["Kapperszaken", "salon", "kapper", "beauty"],
    icon: "✦",
    question: "Welke behandeling past bij mijn wensen?",
    chat: "Kan ik een kennismaking in de salon aanvragen?",
    reply:
      "Wat zou je graag willen? Ik leg je wensen vast voor een persoonlijk advies.",
    intent: "Persoonlijk advies in de salon",
    context: "Wensen + behandeling + voorkeurstijd",
    action: "Afspraakaanvraag voor je salonteam",
    project: "Adviesafspraak Joris",
    document: "Wensen & voorkeuren",
    module: "Behandelingen",
    preparation: "Advies voorbereiden",
    portal: "Jouw moment wordt voorbereid.",
    brand: "LUMIÈRE",
    tagline: "Aandacht die je ziet. Rust die je voelt.",
    title: "Even helemaal",
    emphasis: "voor jezelf.",
    description:
      "Een persoonlijke ervaring, vanaf je eerste bezoek tot in de salon.",
    visual: "salon",
    phases: [
      "Een rustige basis",
      "De salon ontstaat",
      "Jouw plek",
      "De finishing touch",
      "Tijd voor jezelf",
    ],
    accent: "#805e61",
    flow: [
      "Afspraakaanvraag",
      "AI verzamelt je wensen",
      "Salonteam goed voorbereid",
    ],
  },
];
export function profileForBranch(branch: string): ShowcaseProfile {
  const value = branch.trim().toLocaleLowerCase("nl");
  return (
    showcaseProfiles.find((p) =>
      [p.branch, p.label, ...p.aliases].some(
        (alias) => alias.toLocaleLowerCase("nl") === value,
      ),
    ) || generalProfile
  );
}
export function escapeMarkup(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}

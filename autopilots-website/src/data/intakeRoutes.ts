export function intakeRoute(goals: string[]) {
  const website = goals.includes("Een nieuwe of betere website");
  const software = goals.some((g) =>
    [
      "Software op maat laten bouwen",
      "Werkprocessen automatiseren",
      "Planning en administratie vereenvoudigen",
    ].includes(g),
  );
  const ai = goals.some((g) =>
    [
      "Klantcontact met AI verbeteren",
      "Meer uit aanvragen en leads halen",
    ].includes(g),
  );
  if (Number(website) + Number(software) + Number(ai) > 1) return "combined";
  return website ? "website" : software ? "software" : "ai";
}
export const routeQuestions = {
  website: [
    {
      title: "Wat moet jouw website mogelijk maken?",
      help: "Kies de doelen waarvoor we de website ontwerpen.",
      options: [
        "Een sterke eerste indruk",
        "Meer passende aanvragen",
        "Online afspraken boeken",
        "Producten of diensten verkopen",
        "Een klantportaal of login",
        "Samen de richting bepalen",
      ],
    },
    {
      title: "Waar staat je website nu?",
      help: "Zo weten we of we beginnen met een nieuw ontwerp, verbetering of uitbreiding.",
      options: [
        "Ik heb nog geen website",
        "Mijn website is aan vernieuwing toe",
        "Ik wil meer resultaat uit mijn website",
        "Ik wil nieuwe functies of koppelingen",
        "Ik heb een volledig nieuw concept",
      ],
    },
    {
      title: "Wat moet je website verbinden?",
      help: "Kies wat de website straks moet ondersteunen.",
      options: [
        "CRM en contactformulieren",
        "Agenda en boekingen",
        "Betalingen of een webshop",
        "Voorraad of bedrijfssoftware",
        "Een sterke website zonder koppelingen",
        "Dat bepalen we samen",
      ],
    },
  ],
  software: [
    {
      title: "Voor wie bouwen we de software?",
      help: "Kies wie er straks mee gaat werken. Dat bepaalt de opzet en de toegang.",
      options: [
        "Mijn eigen team",
        "Mijn klanten",
        "Partners of leveranciers",
        "Meerdere bedrijven of locaties",
        "Dat wil ik samen uitwerken",
      ],
    },
    {
      title: "Wat is het vertrekpunt voor de software?",
      help: "Een goed idee is genoeg om te beginnen. We kijken hoe ver het al is uitgewerkt.",
      options: [
        "Een idee dat we willen uitwerken",
        "Spreadsheets en handmatig werk vervangen",
        "Bestaande software uitbreiden",
        "Een eigen platform of SaaS bouwen",
        "Een bestaand proces volledig vernieuwen",
      ],
    },
    {
      title: "Wat moet de software kunnen?",
      help: "Kies de onderdelen die je nu al voor ogen hebt.",
      options: [
        "Planning en werkprocessen",
        "Dossiers, klanten of projecten beheren",
        "Een portaal met rollen en rechten",
        "Systemen en gegevens koppelen",
        "AI als onderdeel van de software",
        "Dat bepalen we samen",
      ],
    },
  ],
  combined: [
    {
      title: "Wat wil je met elkaar verbinden?",
      help: "Kies de onderdelen die samen één oplossing moeten vormen.",
      options: [
        "Website en online aanvragen",
        "Interne processen en administratie",
        "Eigen software of een klantportaal",
        "AI voor klantcontact of opvolging",
        "Planning en afspraken",
        "Samen de samenhang bepalen",
      ],
    },
    {
      title: "Hoe ziet jullie vertrekpunt eruit?",
      help: "We beginnen bij wat er al is en bouwen daarop verder.",
      options: [
        "We beginnen met een nieuw idee",
        "We werken vooral met losse systemen",
        "We willen bestaande oplossingen verbeteren",
        "We zoeken één samenhangende oplossing",
        "We willen eerst een duidelijk plan",
      ],
    },
    {
      title: "Wat moet straks goed samenwerken?",
      help: "Kies de systemen en onderdelen die belangrijk zijn voor jouw bedrijf.",
      options: [
        "Website en formulieren",
        "CRM of klantensysteem",
        "Agenda en planningssoftware",
        "Betalingen of webshop",
        "Branche- of bedrijfssoftware",
        "Spreadsheets en interne processen",
      ],
    },
  ],
  ai: [
    {
      title: "Waar komen klanten bij je binnen?",
      help: "Kies de kanalen die jullie gebruiken.",
      options: [
        "Telefoon",
        "E-mail",
        "WhatsApp",
        "Website of contactformulier",
        "Social media",
        "Via mijn team of netwerk",
      ],
    },
    {
      title: "Hoeveel contactmomenten hebben jullie?",
      help: "Een schatting per week is genoeg voor een passend eerste advies.",
      options: [
        "Minder dan 25",
        "25–100",
        "100–500",
        "Meer dan 500",
        "Dat weet ik nog niet",
      ],
    },
    {
      title: "Hoe is het nu geregeld?",
      help: "Kies wat je herkent in jullie dagelijkse werk.",
      options: [
        "CRM of klantensysteem",
        "Agenda of planningssoftware",
        "Branche- of bedrijfssoftware",
        "Spreadsheets en losse lijsten",
        "Vooral handmatig",
        "Dat wil ik samen uitzoeken",
      ],
    },
  ],
};

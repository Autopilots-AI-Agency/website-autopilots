import { scanLocale, scanTranslator } from "./intake-i18n.mjs";
const copy = {
  nl: {
    subject: "Je aanvraag is ontvangen — Autopilots",
    hello: "Hi",
    fallback: "daar",
    preheader:
      "Jouw volgende digitale stap begint hier. Bekijk wat er nu volgt.",
    eyebrow: "JE AANVRAAG IS ONTVANGEN",
    heading: "Een helder vertrekpunt.",
    accent: "Voor jouw volgende stap.",
    thanks:
      "Bedankt voor het invullen van de AI-scan. Je aanvraag is ontvangen.",
    intro:
      "Je scan is een eerste vertrekpunt. Samen bespreken we waar AI-medewerkers, maatwerksoftware of een website jouw bedrijf kunnen helpen — los of in combinatie.",
    invitation:
      "Wil je de mogelijkheden bespreken? Kies een moment voor een kennismaking:",
    cta: "Plan je kennismaking",
    booked: "Al een afspraak gepland? Dan hoef je niets te doen.",
    terms:
      "Een voorstel maken we op maat: eenmalige implementatie en maandelijkse kosten, beide op aanvraag. Je zit nergens aan vast.",
    team: "Team Autopilots",
    tagline: "AI-medewerkers. Maatwerksoftware. Websites.",
    reason:
      "Je ontvangt deze bevestiging omdat je een aanvraag hebt ingediend bij Autopilots.",
  },
  en: {
    subject: "We have received your request — Autopilots",
    hello: "Hi",
    fallback: "there",
    preheader: "Your next digital step starts here. See what comes next.",
    eyebrow: "YOUR REQUEST HAS BEEN RECEIVED",
    heading: "A clear starting point.",
    accent: "For your next step.",
    thanks:
      "Thank you for completing the AI scan. We have received your request.",
    intro:
      "Your scan is an initial starting point. Together, we can discuss how AI employees, custom software or a website could help your business — individually or combined.",
    invitation:
      "Would you like to explore the possibilities? Choose a time for an introduction:",
    cta: "Book an introduction",
    booked:
      "Already booked an appointment? You do not need to do anything else.",
    terms:
      "We prepare a tailored proposal: a one-off implementation fee and monthly costs, both quoted on request. There is no obligation.",
    team: "The Autopilots team",
    tagline: "AI employees. Custom software. Websites.",
    reason:
      "You are receiving this confirmation because you submitted a request to Autopilots.",
  },
  es: {
    subject: "Hemos recibido tu solicitud — Autopilots",
    hello: "Hola",
    fallback: "",
    preheader:
      "Tu próximo paso digital empieza aquí. Descubre qué viene ahora.",
    eyebrow: "HEMOS RECIBIDO TU SOLICITUD",
    heading: "Un punto de partida claro.",
    accent: "Para tu próximo paso.",
    thanks:
      "Gracias por completar el análisis de IA. Hemos recibido tu solicitud.",
    intro:
      "Tu análisis es un primer punto de partida. Juntos podemos comentar cómo los empleados de IA, el software a medida o un sitio web podrían ayudar a tu empresa, por separado o en conjunto.",
    invitation:
      "¿Quieres explorar las posibilidades? Elige un horario para conocernos:",
    cta: "Reserva una conversación",
    booked: "¿Ya has reservado una cita? No necesitas hacer nada más.",
    terms:
      "Preparamos una propuesta a medida: un coste único de implementación y costes mensuales, ambos bajo presupuesto. Sin compromiso.",
    team: "El equipo de Autopilots",
    tagline: "Empleados de IA. Software a medida. Sitios web.",
    reason:
      "Recibes esta confirmación porque has enviado una solicitud a Autopilots.",
  },
  de: {
    subject: "Deine Anfrage ist eingegangen — Autopilots",
    hello: "Hallo",
    fallback: "",
    preheader:
      "Dein nächster digitaler Schritt beginnt hier. Erfahre, wie es weitergeht.",
    eyebrow: "DEINE ANFRAGE IST EINGEGANGEN",
    heading: "Ein klarer Ausgangspunkt.",
    accent: "Für deinen nächsten Schritt.",
    thanks:
      "Vielen Dank, dass du den KI-Scan ausgefüllt hast. Deine Anfrage ist eingegangen.",
    intro:
      "Dein Scan ist ein erster Ausgangspunkt. Gemeinsam besprechen wir, wie KI-Mitarbeiter, individuelle Software oder eine Website dein Unternehmen unterstützen können — einzeln oder kombiniert.",
    invitation:
      "Möchtest du die Möglichkeiten besprechen? Wähle einen Termin zum Kennenlernen:",
    cta: "Kennenlerngespräch buchen",
    booked: "Schon einen Termin gebucht? Dann musst du nichts weiter tun.",
    terms:
      "Wir erstellen ein individuelles Angebot: einmalige Implementierungskosten und monatliche Kosten, beides auf Anfrage. Unverbindlich.",
    team: "Dein Autopilots-Team",
    tagline: "KI-Mitarbeiter. Individuelle Software. Websites.",
    reason:
      "Du erhältst diese Bestätigung, weil du eine Anfrage an Autopilots gesendet hast.",
  },
  it: {
    subject: "Abbiamo ricevuto la tua richiesta — Autopilots",
    hello: "Ciao",
    fallback: "",
    preheader:
      "Il tuo prossimo passo digitale inizia qui. Scopri cosa succede ora.",
    eyebrow: "ABBIAMO RICEVUTO LA TUA RICHIESTA",
    heading: "Un punto di partenza chiaro.",
    accent: "Per il tuo prossimo passo.",
    thanks:
      "Grazie per aver completato l’analisi IA. Abbiamo ricevuto la tua richiesta.",
    intro:
      "La tua analisi è un primo punto di partenza. Insieme possiamo valutare come collaboratori IA, software su misura o un sito web possano aiutare la tua azienda, singolarmente o in combinazione.",
    invitation:
      "Vuoi esplorare le possibilità? Scegli un orario per conoscerci:",
    cta: "Prenota un incontro",
    booked: "Hai già prenotato un appuntamento? Non devi fare altro.",
    terms:
      "Prepariamo una proposta su misura: un costo iniziale di implementazione e costi mensili, entrambi su preventivo. Senza impegno.",
    team: "Il team Autopilots",
    tagline: "Collaboratori IA. Software su misura. Siti web.",
    reason:
      "Ricevi questa conferma perché hai inviato una richiesta ad Autopilots.",
  },
  fr: {
    subject: "Votre demande a bien été reçue — Autopilots",
    hello: "Bonjour",
    fallback: "",
    preheader:
      "Votre prochaine étape numérique commence ici. Découvrez la suite.",
    eyebrow: "VOTRE DEMANDE A BIEN ÉTÉ REÇUE",
    heading: "Un point de départ clair.",
    accent: "Pour votre prochaine étape.",
    thanks:
      "Merci d’avoir rempli le diagnostic IA. Nous avons bien reçu votre demande.",
    intro:
      "Votre diagnostic est un premier point de départ. Ensemble, nous pourrons voir comment des collaborateurs IA, un logiciel sur mesure ou un site web pourraient aider votre entreprise, séparément ou en combinaison.",
    invitation:
      "Vous souhaitez explorer les possibilités ? Choisissez un créneau pour faire connaissance :",
    cta: "Planifier un entretien",
    booked:
      "Vous avez déjà pris rendez-vous ? Vous n’avez rien d’autre à faire.",
    terms:
      "Nous préparons une proposition sur mesure : des frais de mise en place uniques et des coûts mensuels, tous deux sur devis. Sans engagement.",
    team: "L’équipe Autopilots",
    tagline: "Collaborateurs IA. Logiciels sur mesure. Sites web.",
    reason:
      "Vous recevez cette confirmation parce que vous avez envoyé une demande à Autopilots.",
  },
};
export function intakeMailCopy(locale) {
  return copy[scanLocale(locale)];
}
// Separate export makes it possible to check the shared website/email language contract.
export function confirmationLabel(locale) {
  return scanTranslator(locale)("Je aanvraag is ontvangen.");
}

import { generalProfile, type ShowcaseProfile } from "./showcase-profiles";
import { translator } from "./showcase-i18n";
import type { SupportedLocale } from "../../i18n/languages";

// id | language | customer question | reply | intent | project | module | title | emphasis | description | five construction phases
const rows = `
nonprofit|en|How can I help as a volunteer?|What would you like to do and when are you available? I’ll pass this to the coordinator.|Volunteer introduction|Volunteer application|Applications|Together we make|more possible.|Discover our work, contribute or volunteer.|A shared purpose;Meeting people;A place for everyone;Around the table;Moving forward together
nonprofit|es|¿Cómo puedo ayudar como voluntario?|¿Qué te gustaría hacer y cuándo estás disponible? Se lo comunicaré al coordinador.|Presentación como voluntario|Solicitud de voluntariado|Solicitudes|Juntos hacemos|más posible.|Descubre nuestro trabajo, colabora o hazte voluntario.|Un propósito compartido;Conocer personas;Un lugar para todos;Alrededor de la mesa;Avanzar juntos
nonprofit|de|Wie kann ich ehrenamtlich helfen?|Was möchtest du tun und wann hast du Zeit? Ich gebe es an die Koordination weiter.|Kennenlernen im Ehrenamt|Ehrenamtsanmeldung|Anmeldungen|Gemeinsam machen wir|mehr möglich.|Entdecke unsere Arbeit, unterstütze uns oder engagiere dich.|Ein gemeinsames Ziel;Menschen begegnen;Platz für alle;Gemeinsam am Tisch;Zusammen weiter
nonprofit|it|Come posso aiutare come volontario?|Cosa vorresti fare e quando sei disponibile? Informerò il coordinatore.|Primo incontro come volontario|Candidatura volontario|Candidature|Insieme rendiamo|possibile di più.|Scopri il nostro lavoro, contribuisci o diventa volontario.|Un obiettivo comune;Incontrare persone;Un posto per tutti;Intorno al tavolo;Avanti insieme
nonprofit|fr|Comment puis-je aider comme bénévole ?|Que souhaitez-vous faire et quand êtes-vous disponible ? Je transmets au coordinateur.|Premier échange bénévole|Candidature bénévole|Candidatures|Ensemble, ouvrons|plus de possibilités.|Découvrez notre travail, contribuez ou devenez bénévole.|Un objectif commun;Rencontrer des personnes;Une place pour chacun;Autour de la table;Avancer ensemble
healthcare|en|Can I request an appointment?|Which days are you available? The practice team will review your request.|Request a first appointment|Appointment request|Appointments|Space for care.|Close to you.|Meet the practice and easily request an appointment.|A calm foundation;The practice takes shape;A place for care;Light and space;Welcome to the practice
healthcare|es|¿Puedo solicitar una cita?|¿Qué días estás disponible? El equipo revisará tu solicitud.|Solicitar una primera cita|Solicitud de cita|Citas|Espacio para cuidarte.|Cerca de ti.|Conoce la consulta y solicita una cita fácilmente.|Una base tranquila;La consulta toma forma;Un lugar para cuidar;Luz y espacio;Bienvenido a la consulta
healthcare|de|Kann ich einen Termin anfragen?|An welchen Tagen hast du Zeit? Das Praxisteam prüft deine Anfrage.|Einen ersten Termin anfragen|Terminanfrage|Termine|Raum für Zuwendung.|In deiner Nähe.|Lerne die Praxis kennen und frage einfach einen Termin an.|Eine ruhige Basis;Die Praxis entsteht;Ein Ort der Zuwendung;Licht und Raum;Willkommen in der Praxis
healthcare|it|Posso richiedere un appuntamento?|In quali giorni sei disponibile? Il team valuterà la richiesta.|Richiedere un primo appuntamento|Richiesta appuntamento|Appuntamenti|Spazio alla cura.|Vicino a te.|Conosci lo studio e richiedi facilmente un appuntamento.|Una base tranquilla;Lo studio prende forma;Un luogo di cura;Luce e spazio;Benvenuto nello studio
healthcare|fr|Puis-je demander un rendez-vous ?|Quels jours êtes-vous disponible ? L’équipe du cabinet examinera votre demande.|Demander un premier rendez-vous|Demande de rendez-vous|Rendez-vous|Une place pour le soin.|Près de vous.|Découvrez le cabinet et demandez simplement un rendez-vous.|Une base apaisante;Le cabinet prend forme;Un lieu de soin;Lumière et espace;Bienvenue au cabinet
general|en|I’d like to arrange an introduction.|Of course. Tell me about your project.|Designing a new home|Dune villa|Projects|Exceptional living.|Naturally.|From the first sketch to a place that feels right.|First lines;Foundation and volume;Facades and glass;Roof and landscape;A place to live
general|es|Quiero concertar una primera reunión.|Claro. Cuéntame sobre tu proyecto.|Diseñar una vivienda|Villa en las dunas|Proyectos|Vivir de otra manera.|Al natural.|Del primer boceto a un lugar donde todo encaja.|Primeras líneas;Cimientos y volumen;Fachadas y cristal;Tejado y paisaje;Un lugar para vivir
general|de|Ich möchte ein erstes Gespräch vereinbaren.|Gerne. Erzähl mir von deinem Projekt.|Ein Haus entwerfen lassen|Dünenvilla|Projekte|Besonders wohnen.|Ganz natürlich.|Von der ersten Skizze zu einem Ort, an dem alles stimmt.|Erste Linien;Fundament und Volumen;Fassaden und Glas;Dach und Landschaft;Ein Ort zum Leben
general|it|Vorrei fissare un primo incontro.|Certo. Raccontami del tuo progetto.|Progettare una casa|Villa sulle dune|Progetti|Abitare in modo speciale.|Per natura.|Dal primo schizzo a un luogo in cui tutto è al posto giusto.|Prime linee;Fondamenta e volumi;Facciate e vetri;Tetto e paesaggio;Un luogo da vivere
general|fr|Je souhaite organiser un premier échange.|Bien sûr. Parlez-moi de votre projet.|Concevoir une maison|Villa des dunes|Projets|Habiter autrement.|Naturellement.|De la première esquisse à un lieu où tout trouve sa place.|Premières lignes;Fondations et volumes;Façades et vitrages;Toit et paysage;Un lieu de vie
automotive|en|Can I book a test drive for Saturday?|Which car are you interested in? I’ll prepare your request for the sales team.|Test drive in an electric SUV|Electric SUV|Vehicle stock|Forward. Your way.|Electric character.|Discover your next car, from first impression to first drive.|First outline;The chassis;The bodywork;Glass and details;Ready for a test drive
automotive|es|¿Puedo probar el coche el sábado?|¿Qué coche te interesa? Prepararé tu solicitud para el equipo de ventas.|Prueba de un SUV eléctrico|SUV eléctrico|Vehículos|Avanza. A tu manera.|Carácter eléctrico.|Descubre tu próximo coche, de la primera mirada al primer trayecto.|Primer contorno;El chasis;La carrocería;Cristal y detalles;Listo para probar
automotive|de|Kann ich am Samstag eine Probefahrt machen?|Welches Auto interessiert dich? Ich bereite deine Anfrage für den Verkauf vor.|Probefahrt mit einem Elektro-SUV|Elektro-SUV|Fahrzeugbestand|Vorwärts. Auf deine Art.|Elektrischer Charakter.|Entdecke dein nächstes Auto, vom ersten Eindruck bis zur ersten Fahrt.|Erste Kontur;Das Fahrwerk;Die Karosserie;Glas und Details;Bereit zur Probefahrt
automotive|it|Posso fare un test drive sabato?|Quale auto ti interessa? Preparo la richiesta per il team vendite.|Test drive con un SUV elettrico|SUV elettrico|Veicoli|Avanti. A modo tuo.|Carattere elettrico.|Scopri la tua prossima auto, dal primo sguardo al primo viaggio.|Primo contorno;Il telaio;La carrozzeria;Vetri e dettagli;Pronta per un test drive
automotive|fr|Puis-je faire un essai samedi ?|Quelle voiture vous intéresse ? Je prépare votre demande pour l’équipe commerciale.|Essai d’un SUV électrique|SUV électrique|Véhicules|Avancez. À votre façon.|Un caractère électrique.|Découvrez votre prochaine voiture, du premier regard au premier trajet.|Première silhouette;Le châssis;La carrosserie;Vitrages et détails;Prête pour un essai
construction|en|Could you renovate our home?|What would you like to change? I’ll collect your requirements for the project team.|Extending and improving a home|Van Dijk home extension|Building projects|More space.|More home.|From the first sketch to the final detail. Built around you.|First sketch;Foundation and volume;Walls and glass;Roof and garden;Ready to live in
construction|es|¿Podéis reformar nuestra vivienda?|¿Qué te gustaría cambiar? Recogeré tus necesidades para el equipo de obra.|Ampliar y mejorar una vivienda|Ampliación de vivienda Van Dijk|Obras|Más espacio.|Más hogar.|Del primer boceto al último detalle. Construido a tu medida.|Primer boceto;Cimientos y volumen;Muros y cristal;Tejado y jardín;Lista para vivir
construction|de|Könnt ihr unser Haus umbauen?|Was möchtest du ändern? Ich sammle deine Wünsche für das Projektteam.|Ein Haus erweitern und modernisieren|Anbau Familie Van Dijk|Bauprojekte|Mehr Raum.|Mehr Zuhause.|Von der ersten Skizze bis ins letzte Detail. Für dich gebaut.|Erste Skizze;Fundament und Volumen;Wände und Glas;Dach und Garten;Bereit zum Wohnen
construction|it|Potete ristrutturare la nostra casa?|Cosa vorresti cambiare? Raccolgo le tue esigenze per il team di progetto.|Ampliare e migliorare una casa|Ampliamento casa Van Dijk|Cantieri|Più spazio.|Più casa.|Dal primo schizzo all’ultimo dettaglio. Costruito intorno a te.|Primo schizzo;Fondamenta e volumi;Pareti e vetri;Tetto e giardino;Pronta da abitare
construction|fr|Pouvez-vous rénover notre maison ?|Que souhaitez-vous changer ? Je rassemble vos besoins pour l’équipe projet.|Agrandir et améliorer une maison|Extension maison Van Dijk|Chantiers|Plus d’espace.|Plus de chez-soi.|De la première esquisse au dernier détail. Construit autour de vous.|Première esquisse;Fondations et volumes;Murs et vitrages;Toit et jardin;Prête à vivre
installation|en|Is my house suitable for a heat pump?|What kind of home do you have, and how do you heat it now? I’ll prepare the details for your adviser.|Advice on a sustainable installation|Van Dijk heat pump|Work orders|Comfort today.|Energy for tomorrow.|An installation that fits your home and your way of life.|Your home;The installation;Solar energy;Everything connected;Balanced comfort
installation|es|¿Es mi casa adecuada para una bomba de calor?|¿Qué tipo de vivienda tienes y cómo la calientas ahora? Prepararé los datos para el asesor.|Asesoramiento sobre una instalación sostenible|Bomba de calor Van Dijk|Órdenes de trabajo|Confort para hoy.|Energía para mañana.|Una instalación adaptada a tu vivienda y a tu forma de vivir.|Tu vivienda;La instalación;Energía solar;Todo conectado;Confort en equilibrio
installation|de|Ist mein Haus für eine Wärmepumpe geeignet?|Was für ein Haus hast du und wie heizt du derzeit? Ich bereite die Angaben für die Beratung vor.|Beratung zu einer nachhaltigen Installation|Wärmepumpe Van Dijk|Arbeitsaufträge|Komfort für heute.|Energie für morgen.|Eine Anlage, die zu deinem Zuhause und deinem Leben passt.|Dein Zuhause;Die Installation;Solarenergie;Alles verbunden;Komfort im Gleichgewicht
installation|it|La mia casa è adatta a una pompa di calore?|Che tipo di casa hai e come la riscaldi ora? Preparo i dettagli per il consulente.|Consulenza su un impianto sostenibile|Pompa di calore Van Dijk|Ordini di lavoro|Comfort per oggi.|Energia per domani.|Un impianto adatto alla tua casa e al tuo modo di vivere.|La tua casa;L’impianto;Energia solare;Tutto collegato;Comfort in equilibrio
installation|fr|Ma maison est-elle adaptée à une pompe à chaleur ?|Quel type de logement avez-vous et comment le chauffez-vous ? Je prépare les détails pour le conseiller.|Conseil pour une installation durable|Pompe à chaleur Van Dijk|Bons de travail|Le confort aujourd’hui.|L’énergie de demain.|Une installation adaptée à votre logement et à votre mode de vie.|Votre logement;L’installation;L’énergie solaire;Tout est connecté;Un confort équilibré
property|en|Can I arrange a viewing of this property?|What are you looking for in a home? I’ll collect your preferences for the estate agent.|Viewing at Park Lane 24|Park Lane 24|Properties|This is where|your next chapter begins.|Discover the space, light and possibilities of your new home.|The floor plan;Living spaces;Your interior;Light and space;Welcome home
property|es|¿Puedo visitar esta vivienda?|¿Qué buscas en una vivienda? Recogeré tus preferencias para el agente.|Visita a Parklaan 24|Parklaan 24|Inmuebles|Aquí empieza|tu próximo capítulo.|Descubre el espacio, la luz y las posibilidades de tu nuevo hogar.|El plano;Espacios para vivir;Tu interior;Luz y espacio;Bienvenido a casa
property|de|Kann ich diese Immobilie besichtigen?|Was suchst du in einem Zuhause? Ich sammle deine Wünsche für den Makler.|Besichtigung Parklaan 24|Parklaan 24|Immobilien|Hier beginnt|dein nächstes Kapitel.|Entdecke Raum, Licht und Möglichkeiten in deinem neuen Zuhause.|Der Grundriss;Die Wohnräume;Deine Einrichtung;Licht und Raum;Willkommen zu Hause
property|it|Posso visitare questo immobile?|Cosa cerchi in una casa? Raccolgo le tue preferenze per l’agente.|Visita a Parklaan 24|Parklaan 24|Immobili|Qui inizia|il tuo prossimo capitolo.|Scopri gli spazi, la luce e le possibilità della tua nuova casa.|La planimetria;Gli spazi abitativi;I tuoi interni;Luce e spazio;Benvenuto a casa
property|fr|Puis-je visiter ce logement ?|Que recherchez-vous dans un logement ? Je rassemble vos préférences pour l’agent.|Visite de Parklaan 24|Parklaan 24|Biens immobiliers|Ici commence|votre prochain chapitre.|Découvrez l’espace, la lumière et les possibilités de votre nouveau chez-vous.|Le plan;Les pièces à vivre;Votre intérieur;Lumière et espace;Bienvenue chez vous
business|en|Can you help our business grow?|What is holding you back? I’ll prepare a focused first meeting.|Advice for a growing business|Van Dijk growth programme|Engagements|A fresh perspective.|A next step.|Turn ambition into a clear plan that moves your team forward.|A clear starting point;People and expertise;Your workspace;Around the table;Room to grow
business|es|¿Podéis ayudarnos a crecer?|¿Qué dificultades tienes? Prepararé una primera reunión centrada en tus necesidades.|Asesoramiento para una empresa en crecimiento|Programa de crecimiento Van Dijk|Consultorías|Una nueva perspectiva.|Un siguiente paso.|Convierte tu ambición en un plan claro que impulse a tu equipo.|Un punto de partida claro;Personas y experiencia;Tu espacio de trabajo;En torno a la mesa;Espacio para crecer
business|de|Könnt ihr uns beim Wachstum helfen?|Was hält euch gerade auf? Ich bereite ein gezieltes Erstgespräch vor.|Beratung für ein wachsendes Unternehmen|Wachstumsprogramm Van Dijk|Mandate|Ein neuer Blick.|Ein nächster Schritt.|Von der Ambition zu einem klaren Plan, der dein Team weiterbringt.|Ein klarer Ausgangspunkt;Menschen und Expertise;Dein Arbeitsplatz;Gemeinsam am Tisch;Raum zum Wachsen
business|it|Potete aiutarci a crescere?|Quali ostacoli stai affrontando? Preparo un primo incontro mirato.|Consulenza per un’azienda in crescita|Percorso di crescita Van Dijk|Consulenze|Una nuova prospettiva.|Un prossimo passo.|Dall’ambizione a un piano chiaro che fa avanzare il tuo team.|Un punto di partenza chiaro;Persone e competenze;Il tuo spazio di lavoro;Intorno al tavolo;Spazio per crescere
business|fr|Pouvez-vous nous aider à grandir ?|Quels obstacles rencontrez-vous ? Je prépare un premier échange ciblé.|Conseil pour une entreprise en croissance|Programme de croissance Van Dijk|Missions|Un nouveau regard.|Une prochaine étape.|De l’ambition à un plan clair qui fait avancer votre équipe.|Un point de départ clair;Personnes et expertise;Votre espace de travail;Autour de la table;De l’espace pour grandir
beauty|en|Which treatment would suit me?|What would you like? I’ll collect your wishes for a personal consultation.|Personal advice at the salon|Joris consultation|Treatments|A moment just|for you.|A personal experience, from the first visit to your time in the salon.|A calm foundation;The salon takes shape;Your place;Finishing touches;Time for yourself
beauty|es|¿Qué tratamiento me conviene?|¿Qué te gustaría? Recogeré tus preferencias para un asesoramiento personal.|Asesoramiento personal en el salón|Consulta de Joris|Tratamientos|Un momento solo|para ti.|Una experiencia personal, desde la primera visita hasta el salón.|Una base tranquila;El salón toma forma;Tu lugar;Los últimos detalles;Tiempo para ti
beauty|de|Welche Behandlung passt zu mir?|Was wünschst du dir? Ich halte deine Wünsche für eine persönliche Beratung fest.|Persönliche Beratung im Salon|Beratung Joris|Behandlungen|Ein Moment ganz|für dich.|Ein persönliches Erlebnis, vom ersten Besuch bis zum Termin im Salon.|Eine ruhige Basis;Der Salon entsteht;Dein Platz;Der letzte Schliff;Zeit für dich
beauty|it|Quale trattamento fa per me?|Cosa desideri? Raccolgo le tue preferenze per una consulenza personale.|Consulenza personale in salone|Consulenza Joris|Trattamenti|Un momento tutto|per te.|Un’esperienza personale, dalla prima visita fino al salone.|Una base tranquilla;Il salone prende forma;Il tuo posto;Gli ultimi dettagli;Tempo per te
beauty|fr|Quel soin me conviendrait ?|Que souhaitez-vous ? Je recueille vos envies pour un conseil personnalisé.|Conseil personnalisé au salon|Consultation de Joris|Soins|Un moment rien que|pour vous.|Une expérience personnelle, de la première visite jusqu’au salon.|Une base apaisante;Le salon prend forme;Votre place;La touche finale;Du temps pour vous
`;
const data = rows
  .trim()
  .split("\n")
  .map((row) => row.split("|"));
for (const row of data)
  if (row.length !== 11)
    throw new Error(`Invalid profile translation: ${row[0]} ${row[1]}`);
const shared = {
  en: [
    "Requirements and preferences",
    "Prepare the next step",
    "Your request is being prepared.",
    "Project details",
    "Website request",
    "AI collects the details",
    "Your team is ready",
  ],
  es: [
    "Necesidades y preferencias",
    "Preparar el siguiente paso",
    "Tu solicitud se está preparando.",
    "Datos del proyecto",
    "Solicitud web",
    "La IA recoge los datos",
    "Tu equipo está preparado",
  ],
  de: [
    "Anforderungen und Wünsche",
    "Nächsten Schritt vorbereiten",
    "Deine Anfrage wird vorbereitet.",
    "Projektdaten",
    "Websiteanfrage",
    "KI sammelt die Angaben",
    "Dein Team ist bereit",
  ],
  it: [
    "Esigenze e preferenze",
    "Preparare il prossimo passo",
    "La tua richiesta è in preparazione.",
    "Dati del progetto",
    "Richiesta dal sito",
    "L’IA raccoglie i dettagli",
    "Il tuo team è pronto",
  ],
  fr: [
    "Besoins et préférences",
    "Préparer la prochaine étape",
    "Votre demande est en préparation.",
    "Détails du projet",
    "Demande du site",
    "L’IA recueille les détails",
    "Votre équipe est prête",
  ],
};
export function localizedProfile(
  profile: ShowcaseProfile = generalProfile,
  locale: SupportedLocale = "nl",
): ShowcaseProfile {
  if (locale === "nl") return profile;
  const row = data.find((row) => row[0] === profile.id && row[1] === locale)!;
  const [
    ,
    ,
    question,
    reply,
    intent,
    project,
    module,
    title,
    emphasis,
    description,
    phases,
  ] = row;
  const s = shared[locale];
  const t = translator(locale);
  return {
    ...profile,
    label: t(profile.label),
    question,
    chat: question,
    reply,
    intent,
    project,
    module,
    title,
    emphasis,
    description,
    tagline: description,
    phases: phases.split(";"),
    context: s[0],
    action: t("Je team kan verder"),
    document: s[3],
    preparation: s[1],
    portal: s[2],
    flow: s.slice(4),
  };
}

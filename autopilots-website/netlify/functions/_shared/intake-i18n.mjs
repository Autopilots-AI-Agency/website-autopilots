// Stable Dutch answer values are retained for routing. Only presentation is translated.
export const scanLocales = ["nl", "en", "es", "de", "it", "fr"];
export const languageNames = {
  nl: "Dutch",
  en: "English",
  es: "Spanish",
  de: "German",
  it: "Italian",
  fr: "French",
};
export function scanLocale(value) {
  return scanLocales.includes(value) ? value : "nl";
}
// Each row: source | English | Spanish | German | Italian | French.
const rows = `
Jouw volgende digitale stap |Your next digital step|Tu próximo paso digital|Dein nächster digitaler Schritt|Il tuo prossimo passo digitale|Votre prochaine étape numérique
Ontdek met een persoonlijke intake en websiteanalyse waar AI en software jouw bedrijf verder kunnen helpen.|Discover how AI and software can help your business with a personal assessment and website analysis.|Descubre cómo la IA y el software pueden ayudar a tu empresa con una evaluación personal y un análisis web.|Entdecke mit einer persönlichen Bestandsaufnahme und Websiteanalyse, wie KI und Software dein Unternehmen unterstützen können.|Scopri come IA e software possono aiutare la tua azienda con una valutazione personale e un’analisi del sito.|Découvrez comment l’IA et les logiciels peuvent aider votre entreprise grâce à un bilan personnalisé et une analyse de votre site.
Ga naar de vragen|Skip to the questions|Ir a las preguntas|Zu den Fragen|Vai alle domande|Aller aux questions
Jouw bedrijf. Jouw volgende stap.|Your business. Your next step.|Tu empresa. Tu próximo paso.|Dein Unternehmen. Dein nächster Schritt.|La tua azienda. Il tuo prossimo passo.|Votre entreprise. Votre prochaine étape.
← Terug|← Back|← Volver|← Zurück|← Indietro|← Retour
Persoonlijke intake|Personal assessment|Evaluación personal|Persönliche Bestandsaufnahme|Valutazione personale|Bilan personnalisé
Voortgang van de vragen|Question progress|Progreso del cuestionario|Fortschritt der Fragen|Avanzamento delle domande|Progression du questionnaire
Jouw vertrekpunt|Your starting point|Tu punto de partida|Dein Ausgangspunkt|Il tuo punto di partenza|Votre point de départ
Jouw website|Your website|Tu sitio web|Deine Website|Il tuo sito web|Votre site web
Een paar keuzes. Een helder vertrekpunt.|A few choices. A clear starting point.|Unas elecciones. Un punto de partida claro.|Ein paar Entscheidungen. Ein klarer Ausgangspunkt.|Poche scelte. Un punto di partenza chiaro.|Quelques choix. Un point de départ clair.
Een paar keuzes. Jouw prioriteiten.|A few choices. Your priorities.|Unas elecciones. Tus prioridades.|Ein paar Entscheidungen. Deine Prioritäten.|Poche scelte. Le tue priorità.|Quelques choix. Vos priorités.
In welke branche werkt jouw bedrijf?|Which industry is your business in?|¿En qué sector trabaja tu empresa?|In welcher Branche ist dein Unternehmen tätig?|In quale settore opera la tua azienda?|Dans quel secteur travaille votre entreprise ?
Kies jouw branche. Zo maken we het advies passend bij jouw dagelijkse praktijk.|Choose your industry so we can tailor the advice to your everyday work.|Elige tu sector para adaptar el asesoramiento a tu trabajo diario.|Wähle deine Branche, damit die Beratung zu deinem Arbeitsalltag passt.|Scegli il tuo settore per adattare i consigli al tuo lavoro quotidiano.|Choisissez votre secteur pour adapter les conseils à votre quotidien.
Zoek je branche|Search your industry|Busca tu sector|Branche suchen|Cerca il tuo settore|Recherchez votre secteur
Bijvoorbeeld dakdekkers of tandartsen|For example roofers or dentists|Por ejemplo, tejados o dentistas|Zum Beispiel Dachdecker oder Zahnärzte|Ad esempio, coperture o dentisti|Par exemple, couvreurs ou dentistes
Andere branche|Other industry|Otro sector|Andere Branche|Altro settore|Autre secteur
branche gevonden|industry found|sector encontrado|Branche gefunden|settore trovato|secteur trouvé
branches gevonden|industries found|sectores encontrados|Branchen gefunden|settori trovati|secteurs trouvés
Je branche niet gevonden? Kies Andere branche.|Industry not found? Choose Other industry.|¿No encuentras tu sector? Elige Otro sector.|Branche nicht gefunden? Wähle Andere Branche.|Non trovi il settore? Scegli Altro settore.|Secteur introuvable ? Choisissez Autre secteur.
Alle {count} branches van Autopilots|All {count} Autopilots industries|Los {count} sectores de Autopilots|Alle {count} Branchen von Autopilots|Tutti i {count} settori di Autopilots|Les {count} secteurs d’Autopilots
Hoe groot is je team?|How large is your team?|¿Cuántas personas forman tu equipo?|Wie groß ist dein Team?|Quanto è grande il tuo team?|Quelle est la taille de votre équipe ?
Zo maken we het advies passend bij de mensen die ermee gaan werken.|This helps us tailor the advice to the people who will use the solution.|Así adaptamos el asesoramiento a las personas que utilizarán la solución.|So stimmen wir die Beratung auf die Menschen ab, die damit arbeiten werden.|Così adattiamo i consigli alle persone che useranno la soluzione.|Cela nous permet d’adapter les conseils aux personnes qui utiliseront la solution.
Ik werk zelfstandig|I work on my own|Trabajo por mi cuenta|Ich arbeite allein|Lavoro da solo|Je travaille seul
2–10 mensen|2–10 people|2–10 personas|2–10 Personen|2–10 persone|2–10 personnes
11–50 mensen|11–50 people|11–50 personas|11–50 Personen|11–50 persone|11–50 personnes
51–200 mensen|51–200 people|51–200 personas|51–200 Personen|51–200 persone|51–200 personnes
Meer dan 200 mensen|More than 200 people|Más de 200 personas|Mehr als 200 Personen|Più di 200 persone|Plus de 200 personnes
Wat wil je voor jouw bedrijf realiseren?|What would you like to achieve for your business?|¿Qué quieres conseguir para tu empresa?|Was möchtest du für dein Unternehmen erreichen?|Cosa vuoi realizzare per la tua azienda?|Que souhaitez-vous réaliser pour votre entreprise ?
Kies maximaal drie ambities. We stemmen de vervolgvragen hierop af.|Choose up to three goals. We will adapt the next questions accordingly.|Elige hasta tres objetivos. Adaptaremos las siguientes preguntas.|Wähle bis zu drei Ziele. Darauf stimmen wir die nächsten Fragen ab.|Scegli fino a tre obiettivi. Adatteremo le domande successive.|Choisissez jusqu’à trois objectifs. Nous adapterons les questions suivantes.
Software op maat laten bouwen|Build custom software|Desarrollar software a medida|Individuelle Software entwickeln lassen|Sviluppare software su misura|Développer un logiciel sur mesure
Een nieuwe of betere website|A new or improved website|Un sitio web nuevo o mejorado|Eine neue oder bessere Website|Un sito web nuovo o migliore|Un site web nouveau ou amélioré
Werkprocessen automatiseren|Automate work processes|Automatizar procesos de trabajo|Arbeitsabläufe automatisieren|Automatizzare i processi di lavoro|Automatiser les processus de travail
Klantcontact met AI verbeteren|Improve customer contact with AI|Mejorar la atención al cliente con IA|Kundenkontakt mit KI verbessern|Migliorare il contatto con i clienti con l’IA|Améliorer la relation client avec l’IA
Planning en administratie vereenvoudigen|Simplify scheduling and administration|Simplificar la planificación y la administración|Planung und Verwaltung vereinfachen|Semplificare pianificazione e amministrazione|Simplifier la planification et l’administration
Meer uit aanvragen en leads halen|Get more from enquiries and leads|Aprovechar mejor las consultas y los contactos|Mehr aus Anfragen und Leads machen|Valorizzare richieste e contatti|Mieux exploiter les demandes et les prospects
Wanneer wil je de volgende stap zetten?|When would you like to take the next step?|¿Cuándo quieres dar el siguiente paso?|Wann möchtest du den nächsten Schritt machen?|Quando vuoi fare il prossimo passo?|Quand souhaitez-vous passer à l’étape suivante ?
We stemmen het vervolg af op jouw tempo.|We will move forward at your pace.|Avanzaremos a tu ritmo.|Wir richten uns nach deinem Tempo.|Procederemo al tuo ritmo.|Nous avancerons à votre rythme.
Zo snel mogelijk|As soon as possible|Lo antes posible|So bald wie möglich|Il prima possibile|Dès que possible
Binnen 1–3 maanden|Within 1–3 months|En 1–3 meses|Innerhalb von 1–3 Monaten|Entro 1–3 mesi|Dans 1 à 3 mois
Later dit jaar|Later this year|Más adelante este año|Später in diesem Jahr|Più avanti quest’anno|Plus tard cette année
Ik verken eerst de mogelijkheden|I am exploring the possibilities first|Primero estoy explorando las posibilidades|Ich erkunde erst die Möglichkeiten|Per ora esploro le possibilità|J’explore d’abord les possibilités
Laat ons jouw vertrekpunt zien.|Show us your starting point.|Muéstranos tu punto de partida.|Zeig uns deinen Ausgangspunkt.|Mostraci il tuo punto di partenza.|Montrez-nous votre point de départ.
Vul je websiteadres in of geef aan dat je nog geen website hebt. We verbinden dit met jouw ambities.|Enter your website address or tell us you do not have one yet. We will connect this with your goals.|Introduce tu sitio web o indica que aún no tienes uno. Lo relacionaremos con tus objetivos.|Gib deine Website an oder wähle aus, dass du noch keine hast. Wir verbinden das mit deinen Zielen.|Inserisci il tuo sito web o indica che non ne hai ancora uno. Lo collegheremo ai tuoi obiettivi.|Indiquez votre site web ou précisez que vous n’en avez pas encore. Nous ferons le lien avec vos objectifs.
De website van je bedrijf|Your business website|El sitio web de tu empresa|Die Website deines Unternehmens|Il sito web della tua azienda|Le site web de votre entreprise
jouwbedrijf.nl|yourbusiness.com|tuempresa.es|deinunternehmen.de|tuaazienda.it|votreentreprise.fr
Ik heb nog geen website. Gebruik mijn antwoorden als vertrekpunt.|I do not have a website yet. Use my answers as the starting point.|Todavía no tengo sitio web. Utiliza mis respuestas como punto de partida.|Ich habe noch keine Website. Nutze meine Antworten als Ausgangspunkt.|Non ho ancora un sito web. Usa le mie risposte come punto di partenza.|Je n’ai pas encore de site web. Utilisez mes réponses comme point de départ.
Ik geef toestemming om mijn antwoorden en website-inhoud met OpenAI te verwerken voor dit advies. Ik voeg alleen informatie toe die hiervoor gebruikt mag worden.|I consent to processing my answers and website content with OpenAI for this advice. I only provide information that may be used for this purpose.|Doy mi consentimiento para procesar mis respuestas y el contenido de mi web con OpenAI para este asesoramiento. Solo aporto información cuyo uso esté autorizado para este fin.|Ich stimme zu, dass meine Antworten und Website-Inhalte mit OpenAI für diese Beratung verarbeitet werden. Ich gebe nur Informationen an, die dafür verwendet werden dürfen.|Acconsento al trattamento delle mie risposte e dei contenuti del sito con OpenAI per questi consigli. Fornisco solo informazioni utilizzabili a tale scopo.|J’accepte le traitement de mes réponses et du contenu de mon site avec OpenAI pour ces conseils. Je fournis uniquement des informations dont l’utilisation est autorisée à cette fin.
Jouw gegevens blijven privé. We bewaren je intake pas bij Autopilots wanneer je zelf een gesprek aanvraagt.|Your details stay private. We only save your assessment at Autopilots when you request a conversation.|Tus datos son privados. Solo guardamos tu evaluación en Autopilots cuando solicitas una conversación.|Deine Daten bleiben privat. Wir speichern deine Bestandsaufnahme bei Autopilots erst, wenn du ein Gespräch anfragst.|I tuoi dati restano privati. Salviamo la valutazione presso Autopilots solo quando richiedi un colloquio.|Vos données restent privées. Nous enregistrons votre bilan chez Autopilots uniquement lorsque vous demandez un entretien.
Maak mijn persoonlijke analyse|Create my personal analysis|Crear mi análisis personal|Meine persönliche Analyse erstellen|Crea la mia analisi personale|Créer mon analyse personnalisée
Verder|Continue|Continuar|Weiter|Continua|Continuer
Een moment voor jouw volgende stap|A moment for your next step|Un momento para tu próximo paso|Ein Moment für deinen nächsten Schritt|Un momento per il tuo prossimo passo|Un instant pour votre prochaine étape
Schenk gerust|Feel free to|Puedes servirte|Gönn dir ruhig|Concediti pure|Prenez le temps de
een koffie in.|pour a coffee.|un café.|einen Kaffee.|un caffè.|prendre un café.
Wij kijken hoe software, een website of AI jouw bedrijf verder kan helpen. Met aandacht voor je website, je mensen en de keuzes die je net hebt gemaakt.|We are exploring how software, a website or AI could help your business, considering your website, your team and the choices you just made.|Analizamos cómo el software, un sitio web o la IA pueden ayudar a tu empresa, teniendo en cuenta tu web, tu equipo y tus elecciones.|Wir prüfen, wie Software, eine Website oder KI dein Unternehmen unterstützen können. Dabei berücksichtigen wir deine Website, dein Team und deine Entscheidungen.|Valutiamo come software, un sito web o l’IA possano aiutare la tua azienda, tenendo conto del sito, del team e delle tue scelte.|Nous étudions comment un logiciel, un site web ou l’IA pourraient aider votre entreprise, en tenant compte de votre site, de votre équipe et de vos choix.
Je website en antwoorden vormen samen het vertrekpunt.|Your website and answers form our starting point.|Tu sitio web y tus respuestas son nuestro punto de partida.|Deine Website und Antworten bilden unseren Ausgangspunkt.|Il tuo sito e le tue risposte sono il nostro punto di partenza.|Votre site et vos réponses constituent notre point de départ.
Een goede oplossing begint bij begrijpen hoe je werkt.|A good solution starts with understanding how you work.|Una buena solución empieza por entender cómo trabajas.|Eine gute Lösung beginnt damit, deine Arbeitsweise zu verstehen.|Una buona soluzione parte dalla comprensione del tuo lavoro.|Une bonne solution commence par comprendre votre façon de travailler.
We zoeken een passende eerste stap, met heldere voorwaarden.|We are looking for a suitable first step with clear conditions.|Buscamos un primer paso adecuado, con condiciones claras.|Wir suchen einen passenden ersten Schritt mit klaren Voraussetzungen.|Cerchiamo un primo passo adatto, con condizioni chiare.|Nous cherchons une première étape adaptée, avec des conditions claires.
Software, websites en AI. Gebouwd rondom jouw manier van werken.|Software, websites and AI. Built around the way you work.|Software, sitios web e IA. Creados para tu forma de trabajar.|Software, Websites und KI. Entwickelt für deine Arbeitsweise.|Software, siti web e IA. Costruiti intorno al tuo modo di lavorare.|Logiciels, sites web et IA. Conçus autour de votre façon de travailler.
Neem even de tijd. Je advies verschijnt hier vanzelf.|Take a moment. Your advice will appear here automatically.|Tómate un momento. Tu asesoramiento aparecerá aquí automáticamente.|Nimm dir einen Moment. Deine Beratung erscheint hier automatisch.|Prenditi un momento. I consigli appariranno qui automaticamente.|Patientez un instant. Vos conseils s’afficheront ici automatiquement.
Het duurt iets langer. We zijn nog bezig met je advies.|This is taking a little longer. We are still preparing your advice.|Está tardando un poco más. Seguimos preparando tu asesoramiento.|Es dauert etwas länger. Wir arbeiten noch an deiner Beratung.|Ci vuole un po’ più di tempo. Stiamo ancora preparando i tuoi consigli.|Cela prend un peu plus de temps. Nous préparons encore vos conseils.
Met aandacht voor jouw bedrijf|With your business in mind|Pensando en tu empresa|Mit Blick auf dein Unternehmen|Pensando alla tua azienda|En pensant à votre entreprise
EVEN EEN MOMENT|ONE MOMENT|UN MOMENTO|EINEN MOMENT|UN MOMENTO|UN INSTANT
Jouw persoonlijke verkenning|Your personal exploration|Tu exploración personal|Deine persönliche Orientierung|La tua esplorazione personale|Votre exploration personnalisée
Een eerste persoonlijk advies op basis van wat je hebt gedeeld. De haalbaarheid en koppelingen bevestigen we samen.|Initial advice based on what you shared. We will confirm feasibility and integrations together.|Un primer asesoramiento basado en lo que has compartido. Confirmaremos juntos la viabilidad y las integraciones.|Eine erste Beratung auf Basis deiner Angaben. Machbarkeit und Anbindungen klären wir gemeinsam.|Primi consigli basati su quanto hai condiviso. Confermeremo insieme fattibilità e integrazioni.|De premiers conseils fondés sur vos informations. Nous confirmerons ensemble la faisabilité et les intégrations.
Wat we op je website hebben gevonden|What we found on your website|Lo que encontramos en tu sitio web|Was wir auf deiner Website gefunden haben|Cosa abbiamo trovato sul tuo sito|Ce que nous avons trouvé sur votre site
Dit willen we nog samen controleren|What we still need to check together|Lo que debemos comprobar juntos|Was wir noch gemeinsam klären möchten|Cosa dobbiamo ancora verificare insieme|Ce que nous devons encore vérifier ensemble
Bespreek mijn analyse|Discuss my analysis|Comentar mi análisis|Meine Analyse besprechen|Parliamo della mia analisi|Discuter de mon analyse
Download mijn advies ↓|Download my advice ↓|Descargar mi asesoramiento ↓|Meine Beratung herunterladen ↓|Scarica i miei consigli ↓|Télécharger mes conseils ↓
Laten we de volgende stap bepalen.|Let’s decide on the next step.|Decidamos el siguiente paso.|Lass uns den nächsten Schritt festlegen.|Definiamo il prossimo passo.|Définissons la prochaine étape.
We bewaren je antwoorden en advies bij je aanvraag, zodat het gesprek direct over jouw bedrijf gaat.|We save your answers and advice with your request so the conversation can focus on your business.|Guardamos tus respuestas y asesoramiento con tu solicitud para centrar la conversación en tu empresa.|Wir speichern deine Antworten und Beratung mit deiner Anfrage, damit es im Gespräch direkt um dein Unternehmen geht.|Salviamo risposte e consigli con la tua richiesta, così il colloquio può concentrarsi sulla tua azienda.|Nous enregistrons vos réponses et conseils avec votre demande pour centrer l’entretien sur votre entreprise.
Je naam|Your name|Tu nombre|Dein Name|Il tuo nome|Votre nom
Zakelijk e-mailadres|Business email address|Correo electrónico profesional|Geschäftliche E-Mail-Adresse|Email aziendale|Adresse e-mail professionnelle
Autopilots mag mijn intake bewaren en contact opnemen over mijn aanvraag.|Autopilots may save my assessment and contact me about my request.|Autopilots puede guardar mi evaluación y contactarme sobre mi solicitud.|Autopilots darf meine Bestandsaufnahme speichern und mich zu meiner Anfrage kontaktieren.|Autopilots può salvare la mia valutazione e contattarmi in merito alla richiesta.|Autopilots peut conserver mon bilan et me contacter au sujet de ma demande.
Verstuur mijn aanvraag|Send my request|Enviar mi solicitud|Meine Anfrage senden|Invia la mia richiesta|Envoyer ma demande
Je aanvraag is ontvangen.|Your request has been received.|Hemos recibido tu solicitud.|Deine Anfrage ist eingegangen.|Abbiamo ricevuto la tua richiesta.|Votre demande a bien été reçue.
Je intake en advies zijn bij je aanvraag opgeslagen. Kies hieronder een moment voor het gesprek.|Your assessment and advice have been saved with your request. Choose a time for a conversation below.|Tu evaluación y asesoramiento se han guardado con tu solicitud. Elige abajo un horario para conversar.|Deine Bestandsaufnahme und Beratung wurden mit deiner Anfrage gespeichert. Wähle unten einen Gesprächstermin.|Valutazione e consigli sono stati salvati con la richiesta. Scegli qui sotto un orario per il colloquio.|Votre bilan et vos conseils ont été enregistrés avec votre demande. Choisissez un créneau ci-dessous pour l’entretien.
Kies een gespreksmoment ↗|Choose a time to talk ↗|Elige un horario para conversar ↗|Gesprächstermin wählen ↗|Scegli un orario per il colloquio ↗|Choisir un créneau ↗
Opnieuw beginnen ↻|Start again ↻|Empezar de nuevo ↻|Neu beginnen ↻|Ricomincia ↻|Recommencer ↻
Strategie. AI-implementatie. Software.|Strategy. AI implementation. Software.|Estrategia. Implementación de IA. Software.|Strategie. KI-Implementierung. Software.|Strategia. Implementazione IA. Software.|Stratégie. Mise en œuvre de l’IA. Logiciels.
Privacy|Privacy|Privacidad|Datenschutz|Privacy|Confidentialité
Kies maximaal drie prioriteiten.|Choose up to three priorities.|Elige hasta tres prioridades.|Wähle bis zu drei Prioritäten.|Scegli fino a tre priorità.|Choisissez jusqu’à trois priorités.
Kies minstens één optie.|Choose at least one option.|Elige al menos una opción.|Wähle mindestens eine Option.|Scegli almeno un’opzione.|Choisissez au moins une option.
Vul je websiteadres in of kies ‘Ik heb nog geen website’.|Enter your website or choose ‘I do not have a website yet’.|Introduce tu web o elige «Todavía no tengo sitio web».|Gib deine Website ein oder wähle „Ich habe noch keine Website“.|Inserisci il sito o scegli «Non ho ancora un sito web».|Indiquez votre site ou choisissez «Je n’ai pas encore de site web».
Bevestig de toestemming om je analyse te maken.|Confirm your consent to create the analysis.|Confirma tu consentimiento para crear el análisis.|Bestätige deine Einwilligung zur Erstellung der Analyse.|Conferma il consenso per creare l’analisi.|Confirmez votre consentement pour créer l’analyse.
De analyse is niet beschikbaar. Probeer opnieuw.|The analysis is unavailable. Please try again.|El análisis no está disponible. Inténtalo de nuevo.|Die Analyse ist nicht verfügbar. Bitte versuche es erneut.|L’analisi non è disponibile. Riprova.|L’analyse est indisponible. Veuillez réessayer.
Waar dit advies op is gebaseerd|What this advice is based on|En qué se basa este asesoramiento|Worauf diese Beratung basiert|Su cosa si basano questi consigli|Sur quoi reposent ces conseils
Jouw persoonlijke advies|Your personal advice|Tu asesoramiento personal|Deine persönliche Beratung|I tuoi consigli personali|Vos conseils personnalisés
COMPLEET|COMPLETE|COMPLETO|ABGESCHLOSSEN|COMPLETATO|TERMINÉ
Wat hiervoor nodig is|What this requires|Qué se necesita|Was dafür erforderlich ist|Cosa serve|Ce qui est nécessaire
bron(nen)|source(s)|fuente(s)|Quelle(n)|fonte/i|source(s)
Op basis van jouw antwoorden|Based on your answers|Basado en tus respuestas|Auf Basis deiner Antworten|In base alle tue risposte|D’après vos réponses
Voorlopig persoonlijk advies. Haalbaarheid samen bevestigen.|Preliminary personal advice. Feasibility to be confirmed together.|Asesoramiento personal preliminar. Viabilidad pendiente de confirmar juntos.|Vorläufige persönliche Beratung. Machbarkeit gemeinsam bestätigen.|Consigli personali preliminari. Fattibilità da confermare insieme.|Conseils personnalisés préliminaires. Faisabilité à confirmer ensemble.
Voorwaarden:|Conditions:|Condiciones:|Voraussetzungen:|Condizioni:|Conditions :
Nog te controleren:|Still to verify:|Pendiente de verificar:|Noch zu prüfen:|Da verificare:|À vérifier :
Bronnen:|Sources:|Fuentes:|Quellen:|Fonti:|Sources :
Jouw antwoorden:|Your answers:|Tus respuestas:|Deine Antworten:|Le tue risposte:|Vos réponses :
Je aanvraag wordt opgeslagen…|Saving your request…|Guardando tu solicitud…|Deine Anfrage wird gespeichert…|Salvataggio della richiesta…|Enregistrement de votre demande…
Controleer je naam, e-mailadres en toestemming.|Check your name, email address and consent.|Comprueba tu nombre, correo y consentimiento.|Prüfe deinen Namen, deine E-Mail-Adresse und deine Einwilligung.|Controlla nome, email e consenso.|Vérifiez votre nom, votre e-mail et votre consentement.
Je aanvraag kon niet worden opgeslagen. Probeer opnieuw.|Your request could not be saved. Please try again.|No se ha podido guardar tu solicitud. Inténtalo de nuevo.|Deine Anfrage konnte nicht gespeichert werden. Bitte versuche es erneut.|Impossibile salvare la richiesta. Riprova.|Votre demande n’a pas pu être enregistrée. Veuillez réessayer.
Jouw bedrijf|Your business|Tu empresa|Dein Unternehmen|La tua azienda|Votre entreprise
AI Inboxmedewerker|AI inbox assistant|Asistente de bandeja de entrada con IA|KI-Postfachassistent|Assistente IA per la posta|Assistant IA de messagerie
AI Telefoniste|AI phone assistant|Asistente telefónico con IA|KI-Telefonassistent|Assistente telefonico IA|Assistant téléphonique IA
AI Leadopvolger|AI lead follow-up assistant|Asistente de seguimiento comercial con IA|KI-Assistent für Lead-Nachverfolgung|Assistente IA per il follow-up commerciale|Assistant IA de suivi commercial
Software op maat|Custom software|Software a medida|Individuelle Software|Software su misura|Logiciel sur mesure
Website op maat|Custom website|Sitio web a medida|Individuelle Website|Sito web su misura|Site web sur mesure
Procesadvies|Process advice|Asesoramiento de procesos|Prozessberatung|Consulenza sui processi|Conseil en processus
We konden de website-informatie niet voldoende bevestigen. Dit eerste voorstel is daarom gebaseerd op jouw antwoorden. We bespreken de details samen.|We could not sufficiently verify the website information. This initial proposal is therefore based on your answers. We will discuss the details together.|No hemos podido verificar suficientemente la información de la web. Esta primera propuesta se basa en tus respuestas. Comentaremos los detalles juntos.|Wir konnten die Website-Informationen nicht ausreichend bestätigen. Dieser erste Vorschlag basiert daher auf deinen Antworten. Die Details besprechen wir gemeinsam.|Non abbiamo potuto verificare a sufficienza le informazioni del sito. Questa prima proposta si basa quindi sulle tue risposte. Discuteremo insieme i dettagli.|Nous n’avons pas pu vérifier suffisamment les informations du site. Cette première proposition repose donc sur vos réponses. Nous discuterons des détails ensemble.
Dit eerste voorstel is gebaseerd op jouw antwoorden. Je hebt nog geen website aangeleverd.|This initial proposal is based on your answers. You have not provided a website yet.|Esta primera propuesta se basa en tus respuestas. Aún no has facilitado un sitio web.|Dieser erste Vorschlag basiert auf deinen Antworten. Du hast noch keine Website angegeben.|Questa prima proposta si basa sulle tue risposte. Non hai ancora fornito un sito web.|Cette première proposition repose sur vos réponses. Vous n’avez pas encore fourni de site web.
Dit eerste voorstel is gebaseerd op je antwoorden en de informatie die we op je website konden bevestigen.|This initial proposal is based on your answers and the information we could verify on your website.|Esta primera propuesta se basa en tus respuestas y en la información que pudimos verificar en tu web.|Dieser erste Vorschlag basiert auf deinen Antworten und den Informationen, die wir auf deiner Website bestätigen konnten.|Questa prima proposta si basa sulle tue risposte e sulle informazioni che abbiamo potuto verificare sul tuo sito.|Cette première proposition repose sur vos réponses et les informations que nous avons pu vérifier sur votre site.
Jouw intake — nog geen website|Your assessment — no website yet|Tu evaluación — aún sin sitio web|Deine Bestandsaufnahme — noch keine Website|La tua valutazione — ancora senza sito web|Votre bilan — pas encore de site web
Start de AI-scan|Start the AI scan|Iniciar el análisis de IA|KI-Scan starten|Avvia l’analisi IA|Lancer le diagnostic IA
Ontdek jouw mogelijkheden|Explore your possibilities|Descubre tus posibilidades|Entdecke deine Möglichkeiten|Scopri le tue possibilità|Découvrez vos possibilités
Start de quiz|Start the quiz|Iniciar el cuestionario|Quiz starten|Inizia il questionario|Commencer le questionnaire
Taal|Language|Idioma|Sprache|Lingua|Langue
De taal wijzigen begint een nieuwe scan.|Changing language starts a new scan.|Cambiar el idioma inicia un nuevo análisis.|Ein Sprachwechsel startet einen neuen Scan.|Cambiare lingua avvia una nuova analisi.|Changer de langue démarre un nouveau diagnostic.
Vul een geldige website in.|Enter a valid website.|Introduce un sitio web válido.|Gib eine gültige Website ein.|Inserisci un sito web valido.|Indiquez un site web valide.
Gebruik een openbare https-website.|Use a public HTTPS website.|Utiliza un sitio HTTPS público.|Verwende eine öffentliche HTTPS-Website.|Usa un sito HTTPS pubblico.|Utilisez un site HTTPS public.
De analyse is nog niet beschikbaar.|The analysis is not available yet.|El análisis aún no está disponible.|Die Analyse ist noch nicht verfügbar.|L’analisi non è ancora disponibile.|L’analyse n’est pas encore disponible.
De scan is tijdelijk niet beschikbaar. Probeer later opnieuw.|The scan is temporarily unavailable. Please try again later.|El análisis no está disponible temporalmente. Inténtalo más tarde.|Der Scan ist vorübergehend nicht verfügbar. Bitte versuche es später erneut.|L’analisi è temporaneamente indisponibile. Riprova più tardi.|Le diagnostic est temporairement indisponible. Réessayez plus tard.
Het maximum aantal scans is bereikt. Probeer later opnieuw.|The scan limit has been reached. Please try again later.|Se ha alcanzado el límite de análisis. Inténtalo más tarde.|Das Scan-Limit wurde erreicht. Bitte versuche es später erneut.|È stato raggiunto il limite di analisi. Riprova più tardi.|La limite de diagnostics est atteinte. Réessayez plus tard.
Deze aanvraag is gewijzigd. Start een nieuwe analyse.|This request has changed. Start a new analysis.|Esta solicitud ha cambiado. Inicia un nuevo análisis.|Diese Anfrage wurde geändert. Starte eine neue Analyse.|La richiesta è cambiata. Avvia una nuova analisi.|Cette demande a changé. Lancez une nouvelle analyse.
Er lopen nu meerdere analyses. Probeer het over enkele minuten opnieuw.|Several analyses are running. Please try again in a few minutes.|Hay varios análisis en curso. Inténtalo en unos minutos.|Mehrere Analysen laufen gerade. Versuche es in wenigen Minuten erneut.|Sono in corso diverse analisi. Riprova tra qualche minuto.|Plusieurs analyses sont en cours. Réessayez dans quelques minutes.
Je advies is verlopen. Maak een nieuwe analyse.|Your advice has expired. Create a new analysis.|Tu asesoramiento ha caducado. Crea un nuevo análisis.|Deine Beratung ist abgelaufen. Erstelle eine neue Analyse.|I tuoi consigli sono scaduti. Crea una nuova analisi.|Vos conseils ont expiré. Créez une nouvelle analyse.
`;
export const scanMessages = new Map(
  rows
    .trim()
    .split("\n")
    .map((row) => row.split("|").map((s) => s.trim()))
    .map(([key, ...values]) => [key, values]),
);
export function scanTranslator(locale) {
  const index = scanLocales.indexOf(scanLocale(locale)) - 1;
  return (text) =>
    index < 0 ? text : (scanMessages.get(text)?.[index] ?? text);
}
export function scanError(
  message,
  locale,
  fallback = "De analyse is niet beschikbaar. Probeer opnieuw.",
) {
  const t = scanTranslator(locale);
  const index = scanLocales.indexOf(scanLocale(locale)) - 1;
  if (
    index >= 0 &&
    [...scanMessages.values()].some((values) => values[index] === message)
  )
    return message;
  if (
    message ===
    "Je analyse is verlopen. Maak een nieuwe analyse voordat je een gesprek aanvraagt."
  )
    return t("Je advies is verlopen. Maak een nieuwe analyse.");
  return scanLocale(locale) === "nl" || scanMessages.has(message)
    ? t(message)
    : t(fallback);
}

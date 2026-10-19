import type { SupportedLocale } from "../../i18n/languages";

// One row per message: Dutch source, then EN, ES, DE, IT, FR.
const rows = `
Team|Team|Equipo|Team|Team|Équipe
Chat|Chat|Chat|Chat|Chat|Messagerie
Privacy|Privacy|Privacidad|Datenschutz|Privacy|Confidentialité
Software|Software|Software|Software|Software|Logiciels
Websites|Websites|Sitios web|Websites|Siti web|Sites web
PROJECT|PROJECT|PROYECTO|PROJEKT|PROGETTO|PROJET
Je team houdt de regie.|Your team stays in control.|Tu equipo mantiene el control.|Dein Team behält die Kontrolle.|Il tuo team mantiene il controllo.|Votre équipe garde le contrôle.
Je bedrijf kan meer.|Your business can do more.|Tu empresa puede llegar más lejos.|Dein Unternehmen kann mehr.|La tua azienda può fare di più.|Votre entreprise peut aller plus loin.
Bouw wat daarvoor nodig is.|Build what makes it possible.|Construye lo que necesita.|Baue, was es dafür braucht.|Costruisci ciò che serve.|Construisez ce qui le rend possible.
MAATWERK VOOR HET MKB|BUILT FOR SMALL AND MEDIUM BUSINESSES|A MEDIDA PARA PYMES|MASSGESCHNEIDERT FÜR DEN MITTELSTAND|SU MISURA PER LE PMI|SUR MESURE POUR LES PME
Wij bouwen AI-medewerkers, maatwerksoftware en websites voor het mkb.|We build AI employees, custom software and websites for small and medium businesses.|Creamos empleados de IA, software a medida y sitios web para pymes.|Wir entwickeln KI-Mitarbeiter, individuelle Software und Websites für den Mittelstand.|Creiamo collaboratori IA, software su misura e siti web per le PMI.|Nous créons des collaborateurs IA, des logiciels sur mesure et des sites web pour les PME.
Los inzetbaar. Sterker wanneer ze samenwerken.|Useful on their own. Stronger together.|Útiles por separado. Más potentes juntos.|Einzeln einsetzbar. Gemeinsam stärker.|Utili da soli. Più efficaci insieme.|Utiles séparément. Plus efficaces ensemble.
Ontdek jouw mogelijkheden|Explore your possibilities|Descubre tus posibilidades|Entdecke deine Möglichkeiten|Scopri le tue possibilità|Découvrez vos possibilités
Kies jullie branche|Choose your industry|Elige tu sector|Wähle deine Branche|Scegli il tuo settore|Choisissez votre secteur
en zie wat wij kunnen betekenen.|and see what we can do for you.|y descubre cómo podemos ayudarte.|und sieh, was wir für dich tun können.|e scopri cosa possiamo fare per te.|et découvrez ce que nous pouvons vous apporter.
Wij bouwen AI-medewerkers, software & websites.|We build AI employees, software & websites.|Creamos empleados de IA, software y sitios web.|Wir entwickeln KI-Mitarbeiter, Software und Websites.|Creiamo collaboratori IA, software e siti web.|Nous créons des collaborateurs IA, des logiciels et des sites web.
Een andere branche|Another industry|Otro sector|Eine andere Branche|Un altro settore|Un autre secteur
Zoek jullie branche in de lijst|Find your industry in the list|Busca tu sector en la lista|Finde deine Branche in der Liste|Trova il tuo settore nell’elenco|Trouvez votre secteur dans la liste
Zoek een branche|Search industries|Buscar un sector|Branche suchen|Cerca un settore|Rechercher un secteur
Typ jullie branche…|Type your industry…|Escribe tu sector…|Branche eingeben…|Digita il tuo settore…|Saisissez votre secteur…
Geen branche gevonden. Probeer een andere zoekterm.|No industry found. Try another search.|No se ha encontrado ningún sector. Prueba otra búsqueda.|Keine Branche gefunden. Versuche einen anderen Suchbegriff.|Nessun settore trovato. Prova un altro termine.|Aucun secteur trouvé. Essayez un autre terme.
Branches gevonden: {count}|Industries found: {count}|Sectores encontrados: {count}|Gefundene Branchen: {count}|Settori trovati: {count}|Secteurs trouvés : {count}
Drie voorbeelden. Afgestemd op jouw wereld.|Three examples. Tailored to your world.|Tres ejemplos. Adaptados a tu sector.|Drei Beispiele. Passend zu deiner Welt.|Tre esempi. Pensati per il tuo settore.|Trois exemples. Adaptés à votre univers.
Bekijk jouw mogelijkheden|See your possibilities|Ver tus posibilidades|Möglichkeiten ansehen|Scopri le possibilità|Voir vos possibilités
Bekijk het algemene voorbeeld|View the general example|Ver el ejemplo general|Allgemeines Beispiel ansehen|Vedi l’esempio generale|Voir l’exemple général
Geen gegevens versturen. Geen account. Alleen een voorbeeld voor jouw branche.|No data sent. No account. Just an example for your industry.|Sin enviar datos. Sin cuenta. Solo un ejemplo para tu sector.|Keine Datenübermittlung. Kein Konto. Nur ein Beispiel für deine Branche.|Nessun dato inviato. Nessun account. Solo un esempio per il tuo settore.|Aucune donnée envoyée. Aucun compte. Juste un exemple pour votre secteur.
Algemeen voorbeeld|General example|Ejemplo general|Allgemeines Beispiel|Esempio generale|Exemple général
wijzigen|change|cambiar|ändern|modifica|modifier
Jouw selectie: {branch}. De AI-medewerker, software en website passen zich samen aan.|Your choice: {branch}. The AI employee, software and website adapt together.|Tu elección: {branch}. El empleado de IA, el software y el sitio web se adaptan juntos.|Deine Auswahl: {branch}. KI-Mitarbeiter, Software und Website passen sich gemeinsam an.|La tua scelta: {branch}. Il collaboratore IA, il software e il sito si adattano insieme.|Votre choix : {branch}. Le collaborateur IA, le logiciel et le site s’adaptent ensemble.
Voor {branch} tonen we nu het algemene voorbeeld. Jouw maatwerk werken we samen uit.|For {branch}, we show a general example. We design your custom solution together.|Para {branch}, mostramos un ejemplo general. Diseñamos juntos tu solución a medida.|Für {branch} zeigen wir ein allgemeines Beispiel. Deine individuelle Lösung entwickeln wir gemeinsam.|Per {branch}, mostriamo un esempio generale. Progettiamo insieme la tua soluzione su misura.|Pour {branch}, nous présentons un exemple général. Nous concevons ensemble votre solution sur mesure.
Van klantvraag tot uitvoering. Een voorbeeld voor {branch}.|From customer question to action. An example for {branch}.|De la consulta a la acción. Un ejemplo para {branch}.|Von der Kundenfrage zur Umsetzung. Ein Beispiel für {branch}.|Dalla richiesta all’azione. Un esempio per {branch}.|De la demande à l’action. Un exemple pour {branch}.
Drie bouwgebieden. Eén partner.|Three disciplines. One partner.|Tres especialidades. Un solo socio.|Drei Bereiche. Ein Partner.|Tre competenze. Un unico partner.|Trois expertises. Un seul partenaire.
Een extra collega. Voor jouw klanten.|An extra colleague. For your customers.|Un compañero más. Para tus clientes.|Ein zusätzlicher Kollege. Für deine Kunden.|Un collega in più. Per i tuoi clienti.|Un collègue de plus. Pour vos clients.
Jouw werkwijze. In eigen software.|Your way of working. In your own software.|Tu forma de trabajar. En tu propio software.|Deine Arbeitsweise. In deiner Software.|Il tuo modo di lavorare. Nel tuo software.|Votre façon de travailler. Dans votre logiciel.
Een website die verder werkt.|A website that keeps working.|Un sitio web que hace más.|Eine Website, die weiterarbeitet.|Un sito web che fa di più.|Un site web qui va plus loin.
Los inzetbaar. Sterker samen.|Useful alone. Stronger together.|Útiles por separado. Más fuertes juntos.|Einzeln einsetzbar. Gemeinsam stärker.|Utili da soli. Più forti insieme.|Utiles séparément. Plus forts ensemble.
Scroll en zie hoe het samenkomt.|Scroll to see it come together.|Desplázate y descubre cómo se conecta.|Scrolle und sieh, wie alles zusammenkommt.|Scorri e guarda come tutto si collega.|Faites défiler pour voir l’ensemble prendre forme.
Telefonie en chat, met afgesproken acties en jouw team aan het roer.|Phone and chat, with agreed actions and your team in control.|Teléfono y chat, con acciones acordadas y tu equipo al mando.|Telefon und Chat, mit vereinbarten Aktionen und deinem Team am Steuer.|Telefono e chat, con azioni concordate e il tuo team al comando.|Téléphone et chat, avec des actions convenues et votre équipe aux commandes.
Van planning tot klantportaal. Gebouwd rondom jouw processen.|From planning to customer portal. Built around your processes.|De la planificación al portal del cliente. Adaptado a tus procesos.|Von der Planung bis zum Kundenportal. Rund um deine Prozesse entwickelt.|Dalla pianificazione al portale clienti. Costruito sui tuoi processi.|De la planification au portail client. Conçu autour de vos processus.
Een sterke voorkant, met een eigen backend en passende koppelingen.|A strong frontend, with a custom backend and the right integrations.|Un diseño sólido, con backend propio e integraciones adecuadas.|Ein starkes Frontend, mit eigenem Backend und passenden Schnittstellen.|Un frontend efficace, con backend dedicato e integrazioni adatte.|Une interface soignée, avec un backend sur mesure et les bonnes intégrations.
Wij verbinden wat je nodig hebt. Ook met de systemen die je al gebruikt.|We connect what you need. Including the systems you already use.|Conectamos lo que necesitas, también con los sistemas que ya usas.|Wir verbinden, was du brauchst. Auch mit deinen bestehenden Systemen.|Colleghiamo ciò che ti serve, anche ai sistemi che già usi.|Nous connectons ce dont vous avez besoin, y compris vos outils existants.
Wat Autopilots voor jouw bedrijf bouwt|What Autopilots builds for your business|Lo que Autopilots crea para tu empresa|Was Autopilots für dein Unternehmen entwickelt|Cosa crea Autopilots per la tua azienda|Ce qu’Autopilots crée pour votre entreprise
AUTOPILOTS / VAN IDEE NAAR SAMENWERKING|AUTOPILOTS / FROM IDEA TO CONNECTION|AUTOPILOTS / DE LA IDEA A LA CONEXIÓN|AUTOPILOTS / VON DER IDEE ZUM ZUSAMMENSPIEL|AUTOPILOTS / DALL’IDEA ALLA CONNESSIONE|AUTOPILOTS / DE L’IDÉE À LA CONNEXION
Ga naar een bouwgebied|Go to a discipline|Ir a una especialidad|Zu einem Bereich wechseln|Vai a una competenza|Accéder à une expertise
Overzicht|Overview|Resumen|Übersicht|Panoramica|Vue d’ensemble
AI-medewerkers|AI employees|Empleados de IA|KI-Mitarbeiter|Collaboratori IA|Collaborateurs IA
AI-MEDEWERKER|AI EMPLOYEE|EMPLEADO DE IA|KI-MITARBEITER|COLLABORATORE IA|COLLABORATEUR IA
Maatwerksoftware|Custom software|Software a medida|Individuelle Software|Software su misura|Logiciels sur mesure
Websites & backends|Websites & backends|Sitios web y backends|Websites & Backends|Siti web e backend|Sites web et backends
Samen|Together|Juntos|Zusammen|Insieme|Ensemble
Gesprek komt binnen|Call comes in|Llega la llamada|Anruf geht ein|Arriva una chiamata|Un appel arrive
AI begrijpt de vraag|AI understands the request|La IA entiende la consulta|KI versteht die Anfrage|L’IA comprende la richiesta|L’IA comprend la demande
Je team kan verder|Your team can take it from here|Tu equipo puede continuar|Dein Team kann übernehmen|Il tuo team può proseguire|Votre équipe peut prendre le relais
Modules komen samen|Modules connect|Los módulos se conectan|Module verbinden sich|I moduli si collegano|Les modules se connectent
Team en klant verbonden|Team and customer connected|Equipo y cliente conectados|Team und Kunde verbunden|Team e cliente collegati|Équipe et client connectés
Het ontwerp ontstaat|The design takes shape|El diseño toma forma|Der Entwurf entsteht|Il progetto prende forma|Le projet prend forme
Gevels en glas komen samen|Facades and glass come together|Fachadas y cristal toman forma|Fassaden und Glas kommen zusammen|Facciate e vetri prendono forma|Façades et vitrages prennent forme
Website en beheer op maat|Custom website and management|Web y gestión a medida|Website und Verwaltung nach Maß|Sito e gestione su misura|Site et gestion sur mesure
Volgende stap|Next step|Siguiente paso|Nächster Schritt|Passo successivo|Étape suivante
Opnieuw afspelen|Replay|Repetir|Erneut abspielen|Riproduci di nuovo|Rejouer
Voorbeeld · geen echte aanvraag of boeking|Demo · no real request or booking|Ejemplo · no es una solicitud ni reserva real|Beispiel · keine echte Anfrage oder Buchung|Esempio · nessuna richiesta o prenotazione reale|Exemple · aucune demande ou réservation réelle
BEHEER|MANAGEMENT|GESTIÓN|VERWALTUNG|GESTIONE|GESTION
Interactieve demo|Interactive demo|Demo interactiva|Interaktive Demo|Demo interattiva|Démo interactive
JOUW WEBSITE. JOUW CONTROLE.|YOUR WEBSITE. YOUR CONTROL.|TU SITIO WEB. TU CONTROL.|DEINE WEBSITE. DEINE KONTROLLE.|IL TUO SITO. IL TUO CONTROLLO.|VOTRE SITE. VOTRE CONTRÔLE.
Zelf aanpassen.|Make your own changes.|Haz tus propios cambios.|Selbst anpassen.|Modifica in autonomia.|Modifiez vous-même.
Zonder omwegen.|Without the hassle.|Sin complicaciones.|Ohne Umwege.|Senza complicazioni.|Sans détour.
Een beheeromgeving op maat voor jouw team.|A management interface built for your team.|Un panel de gestión a medida para tu equipo.|Eine Verwaltungsoberfläche für dein Team.|Un pannello di gestione su misura per il tuo team.|Une interface de gestion sur mesure pour votre équipe.
Titel op je website|Website title|Título del sitio web|Titel auf deiner Website|Titolo sul sito|Titre sur votre site
Accentkleur|Accent colour|Color de acento|Akzentfarbe|Colore di accento|Couleur d’accent
Bosgroen|Forest green|Verde bosque|Waldgrün|Verde bosco|Vert forêt
Warm brons|Warm bronze|Bronce cálido|Warmes Bronze|Bronzo caldo|Bronze chaud
Nachtblauw|Midnight blue|Azul noche|Nachtblau|Blu notte|Bleu nuit
Gepubliceerd in demo|Published in demo|Publicado en la demo|In der Demo veröffentlicht|Pubblicato nella demo|Publié dans la démo
Teksten, projecten en aanvragen op één plek.|Content, projects and requests in one place.|Textos, proyectos y solicitudes en un solo lugar.|Texte, Projekte und Anfragen an einem Ort.|Testi, progetti e richieste in un unico posto.|Textes, projets et demandes au même endroit.
Probeer een titel of kleur. Bekijk daarna de voorkant.|Try a title or colour. Then view the frontend.|Prueba un título o color. Después mira el sitio.|Probiere einen Titel oder eine Farbe. Sieh dir dann die Website an.|Prova un titolo o un colore. Poi guarda il sito.|Essayez un titre ou une couleur. Puis regardez le site.
Bekijk de achterkant|View the backend|Ver el panel de gestión|Backend ansehen|Vedi il backend|Voir l’interface de gestion
Bekijk jouw aanpassingen|View your changes|Ver tus cambios|Änderungen ansehen|Vedi le tue modifiche|Voir vos modifications
Aangepast in dit voorbeeld · niets wordt gepubliceerd|Updated in this demo · nothing is published|Modificado en esta demo · no se publica nada|In der Demo geändert · nichts wird veröffentlicht|Modificato nella demo · nulla viene pubblicato|Modifié dans cette démo · rien n’est publié
Kleur aangepast · bekijk de voorkant|Colour updated · view the frontend|Color modificado · mira el sitio|Farbe geändert · Website ansehen|Colore modificato · guarda il sito|Couleur modifiée · regardez le site
Nieuw chatbericht|New chat message|Nuevo mensaje de chat|Neue Chatnachricht|Nuovo messaggio|Nouveau message
Inkomend gesprek|Incoming call|Llamada entrante|Eingehender Anruf|Chiamata in arrivo|Appel entrant
Telefonie|Phone|Teléfono|Telefon|Telefono|Téléphone
INKOMENDE KLANTVRAAG|INCOMING CUSTOMER REQUEST|CONSULTA ENTRANTE|EINGEHENDE KUNDENANFRAGE|RICHIESTA IN ARRIVO|DEMANDE CLIENT ENTRANTE
KLANT|CUSTOMER|CLIENTE|KUNDE|CLIENTE|CLIENT
VAN GESPREK NAAR ACTIE|FROM CONVERSATION TO ACTION|DE LA CONVERSACIÓN A LA ACCIÓN|VOM GESPRÄCH ZUR AKTION|DALLA CONVERSAZIONE ALL’AZIONE|DE LA CONVERSATION À L’ACTION
VOORBEELD|DEMO|EJEMPLO|BEISPIEL|ESEMPIO|EXEMPLE
Luistert.|Listens.|Escucha.|Hört zu.|Ascolta.|Écoute.
Begrijpt.|Understands.|Entiende.|Versteht.|Comprende.|Comprend.
Voert uit.|Takes action.|Actúa.|Handelt.|Agisce.|Agit.
VRAAG HERKEND|REQUEST UNDERSTOOD|CONSULTA IDENTIFICADA|ANFRAGE ERKANNT|RICHIESTA IDENTIFICATA|DEMANDE IDENTIFIÉE
KLANTDOSSIER AANGEVULD|CUSTOMER RECORD UPDATED|FICHA DEL CLIENTE ACTUALIZADA|KUNDENAKTE ERGÄNZT|SCHEDA CLIENTE AGGIORNATA|DOSSIER CLIENT COMPLÉTÉ
VERVOLG VOORBEREID|NEXT STEP PREPARED|SIGUIENTE PASO PREPARADO|NÄCHSTER SCHRITT VORBEREITET|PASSO SUCCESSIVO PRONTO|SUITE PRÉPARÉE
Klant krijgt een ontvangstbevestiging|Customer receives a confirmation|El cliente recibe una confirmación|Kunde erhält eine Bestätigung|Il cliente riceve una conferma|Le client reçoit une confirmation
Jij bepaalt de acties. Je team kan overnemen.|You set the actions. Your team can take over.|Tú defines las acciones. Tu equipo puede intervenir.|Du legst die Aktionen fest. Dein Team kann übernehmen.|Tu definisci le azioni. Il tuo team può intervenire.|Vous définissez les actions. Votre équipe peut prendre le relais.
Klanten|Customers|Clientes|Kunden|Clienti|Clients
Projecten|Projects|Proyectos|Projekte|Progetti|Projets
Documenten|Documents|Documentos|Dokumente|Documenti|Documents
GEBOUWD RONDOM JOUW WERK|BUILT AROUND YOUR WORK|CREADO PARA TU FORMA DE TRABAJAR|RUND UM DEINE ARBEIT ENTWICKELT|CREATO INTORNO AL TUO LAVORO|CONÇU AUTOUR DE VOTRE TRAVAIL
JOUW BEDRIJF|YOUR BUSINESS|TU EMPRESA|DEIN UNTERNEHMEN|LA TUA AZIENDA|VOTRE ENTREPRISE
Van losse informatie.|From scattered information.|De información dispersa.|Von einzelnen Informationen.|Da informazioni sparse.|D’informations dispersées.
Naar één werkplek.|To one workspace.|A un único espacio de trabajo.|Zu einem Arbeitsplatz.|A un unico spazio di lavoro.|À un espace de travail unique.
Nieuw project|New project|Nuevo proyecto|Neues Projekt|Nuovo progetto|Nouveau projet
Gekoppeld aan project|Linked to the project|Vinculado al proyecto|Mit dem Projekt verknüpft|Collegato al progetto|Lié au projet
Van aanvraag naar uitvoering|From request to delivery|De la solicitud a la ejecución|Von der Anfrage zur Umsetzung|Dalla richiesta alla realizzazione|De la demande à la réalisation
JOUW PROCES|YOUR PROCESS|TU PROCESO|DEIN PROZESS|IL TUO PROCESSO|VOTRE PROCESSUS
AANVRAAG|REQUEST|SOLICITUD|ANFRAGE|RICHIESTA|DEMANDE
Wensen ontvangen|Requirements received|Necesidades recibidas|Wünsche erhalten|Esigenze ricevute|Besoins reçus
VOORBEREIDING|PREPARATION|PREPARACIÓN|VORBEREITUNG|PREPARAZIONE|PRÉPARATION
Briefing compleet|Brief complete|Briefing completo|Briefing vollständig|Briefing completo|Brief complet
Team toegewezen|Team assigned|Equipo asignado|Team zugewiesen|Team assegnato|Équipe affectée
KLANTPORTAAL|CUSTOMER PORTAL|PORTAL DEL CLIENTE|KUNDENPORTAL|PORTALE CLIENTI|PORTAIL CLIENT
WELKOM JORIS|WELCOME JORIS|BIENVENIDO JORIS|WILLKOMMEN JORIS|BENVENUTO JORIS|BIENVENUE JORIS
Bekijk je documenten en volgende stap.|View your documents and next step.|Consulta tus documentos y el siguiente paso.|Sieh deine Dokumente und den nächsten Schritt.|Consulta i documenti e il prossimo passo.|Consultez vos documents et la prochaine étape.
Dezelfde informatie. Direct bijgewerkt.|The same information. Instantly updated.|La misma información. Siempre actualizada.|Dieselben Informationen. Sofort aktualisiert.|Le stesse informazioni. Subito aggiornate.|Les mêmes informations. Mises à jour immédiatement.
Eén wijziging. Overal het juiste overzicht.|One change. Every view up to date.|Un cambio. Todo actualizado.|Eine Änderung. Überall aktuell.|Una modifica. Tutto aggiornato.|Une modification. Tout est à jour.
Team ↔ klantportaal|Team ↔ customer portal|Equipo ↔ portal del cliente|Team ↔ Kundenportal|Team ↔ portale clienti|Équipe ↔ portail client
CONCEPTWEBSITE|CONCEPT WEBSITE|SITIO CONCEPTUAL|KONZEPT-WEBSITE|SITO DIMOSTRATIVO|SITE CONCEPTUEL
JOUW VERHAAL. IN BEELD.|YOUR STORY. BROUGHT TO LIFE.|TU HISTORIA. EN IMÁGENES.|DEINE GESCHICHTE. IN BILDERN.|LA TUA STORIA. IN IMMAGINI.|VOTRE HISTOIRE. EN IMAGES.
Ontdek de mogelijkheden|Explore the possibilities|Descubre las posibilidades|Entdecke die Möglichkeiten|Scopri le possibilità|Découvrez les possibilités
Ontdek deze auto|Explore this car|Descubre este coche|Entdecke dieses Auto|Scopri questa auto|Découvrez cette voiture
Ontdek de salon|Explore the salon|Descubre el salón|Entdecke den Salon|Scopri il salone|Découvrez le salon
Een eigen visie.|A vision of your own.|Una visión propia.|Eine eigene Vision.|Una visione tutta tua.|Votre propre vision.
Een website die je laat voelen.|A website you can feel.|Un sitio que transmite sensaciones.|Eine Website, die berührt.|Un sito che trasmette emozioni.|Un site qui vous fait vibrer.
Start je project|Start your project|Inicia tu proyecto|Starte dein Projekt|Avvia il tuo progetto|Lancez votre projet
Vraag een proefrit aan|Request a test drive|Solicita una prueba|Probefahrt anfragen|Richiedi un test drive|Demandez un essai
Bespreek je verbouwplan|Discuss your renovation|Habla de tu reforma|Umbau besprechen|Parla della tua ristrutturazione|Parlons de votre rénovation
Vraag advies aan|Request advice|Solicita asesoramiento|Beratung anfragen|Richiedi una consulenza|Demandez un conseil
Vraag een bezichtiging aan|Request a viewing|Solicita una visita|Besichtigung anfragen|Richiedi una visita|Demandez une visite
Plan een kennismaking|Arrange an introduction|Solicita una primera reunión|Kennenlernen vereinbaren|Organizza un primo incontro|Organisez un premier échange
Vraag een afspraak aan|Request an appointment|Solicita una cita|Termin anfragen|Richiedi un appuntamento|Demandez un rendez-vous
Aanvraag opgeslagen|Request saved|Solicitud guardada|Anfrage gespeichert|Richiesta salvata|Demande enregistrée
Eigen backend|Custom backend|Backend propio|Eigenes Backend|Backend dedicato|Backend sur mesure
Bij jouw team|With your team|Con tu equipo|Bei deinem Team|Al tuo team|Auprès de votre équipe
Alles verbonden|Everything connected|Todo conectado|Alles verbunden|Tutto collegato|Tout est connecté
En hoe zou dit|And how would this|¿Y cómo funcionaría|Und wie würde das|E come funzionerebbe|Et comment cela fonctionnerait-il
voor jouw bedrijf werken?|work for your business?|para tu empresa?|für dein Unternehmen funktionieren?|per la tua azienda?|pour votre entreprise ?
JOUW BEDRIJF. JOUW VOLGENDE STAP.|YOUR BUSINESS. YOUR NEXT STEP.|TU EMPRESA. TU SIGUIENTE PASO.|DEIN UNTERNEHMEN. DEIN NÄCHSTER SCHRITT.|LA TUA AZIENDA. IL TUO PROSSIMO PASSO.|VOTRE ENTREPRISE. VOTRE PROCHAINE ÉTAPE.
Vertel ons waar je naartoe wilt. Ontdek waar AI-medewerkers, software of een betere website kunnen helpen.|Tell us where you want to go. Explore how AI employees, software or a better website can help.|Cuéntanos adónde quieres llegar. Descubre cómo pueden ayudarte los empleados de IA, el software o una mejor web.|Sag uns, wohin du willst. Entdecke, wie KI-Mitarbeiter, Software oder eine bessere Website helfen können.|Raccontaci dove vuoi arrivare. Scopri come possono aiutarti collaboratori IA, software o un sito migliore.|Dites-nous où vous souhaitez aller. Découvrez comment des collaborateurs IA, un logiciel ou un meilleur site peuvent vous aider.
Start de AI-scan|Start the AI scan|Iniciar el análisis de IA|KI-Scan starten|Avvia l’analisi IA|Lancer le diagnostic IA
De AI-scan is momenteel in het Nederlands.|The AI scan is currently in Dutch.|El análisis de IA está actualmente en neerlandés.|Der KI-Scan ist derzeit auf Niederländisch.|L’analisi IA è attualmente in olandese.|Le diagnostic IA est actuellement en néerlandais.
Een eerste richting op basis van jouw antwoorden.|An initial direction based on your answers.|Una primera orientación basada en tus respuestas.|Eine erste Richtung auf Basis deiner Antworten.|Un primo orientamento basato sulle tue risposte.|Une première orientation basée sur vos réponses.
Geen definitief technisch advies of offerte.|Not final technical advice or a quote.|No es un asesoramiento técnico definitivo ni un presupuesto.|Keine abschließende technische Beratung oder Angebot.|Non è una consulenza tecnica definitiva né un preventivo.|Ni un conseil technique définitif, ni un devis.
05 / VAN IDEE NAAR PRAKTIJK|05 / FROM IDEA TO REALITY|05 / DE LA IDEA A LA PRÁCTICA|05 / VON DER IDEE ZUR PRAXIS|05 / DALL’IDEA ALLA PRATICA|05 / DE L’IDÉE À LA PRATIQUE
Groot denken.|Think big.|Piensa en grande.|Groß denken.|Pensa in grande.|Voyez grand.
Helder beginnen.|Start with clarity.|Empieza con claridad.|Klar starten.|Inizia con chiarezza.|Commencez clairement.
Een maatwerktraject begint niet met software. Het begint met begrijpen wat jouw bedrijf nodig heeft.|A custom project does not start with software. It starts with understanding what your business needs.|Un proyecto a medida no empieza por el software. Empieza por entender lo que tu empresa necesita.|Ein individuelles Projekt beginnt nicht mit Software, sondern mit dem Verständnis deiner Anforderungen.|Un progetto su misura non inizia dal software, ma dalla comprensione delle esigenze della tua azienda.|Un projet sur mesure ne commence pas par un logiciel, mais par la compréhension des besoins de votre entreprise.
Begrijpen|Understand|Entender|Verstehen|Comprendere|Comprendre
We onderzoeken je werkwijze, doelen en bestaande systemen.|We explore your processes, goals and existing systems.|Analizamos tus procesos, objetivos y sistemas actuales.|Wir untersuchen deine Abläufe, Ziele und bestehenden Systeme.|Analizziamo processi, obiettivi e sistemi esistenti.|Nous étudions vos méthodes, vos objectifs et vos outils existants.
Bouwen|Build|Crear|Entwickeln|Creare|Construire
We ontwerpen, ontwikkelen en testen. Jij kijkt en beslist mee.|We design, build and test. You review and decide with us.|Diseñamos, desarrollamos y probamos. Tú participas y decides.|Wir gestalten, entwickeln und testen. Du schaust mit und entscheidest mit.|Progettiamo, sviluppiamo e testiamo. Tu partecipi e decidi.|Nous concevons, développons et testons. Vous participez et décidez.
Doorontwikkelen|Keep improving|Seguir mejorando|Weiterentwickeln|Continuare a migliorare|Faire évoluer
We begeleiden de start en spreken beheer en verbeteringen af.|We support the launch and agree on maintenance and improvements.|Acompañamos el lanzamiento y acordamos el mantenimiento y las mejoras.|Wir begleiten den Start und vereinbaren Betreuung und Verbesserungen.|Accompagniamo il lancio e concordiamo gestione e miglioramenti.|Nous accompagnons le lancement et convenons du suivi et des améliorations.
Branches|Industries|Sectores|Branchen|Settori|Secteurs
Oplossingen|Solutions|Soluciones|Lösungen|Soluzioni|Solutions
Kennisbank|Knowledge hub|Centro de conocimiento|Wissensbereich|Centro risorse|Centre de ressources
Minder beweging|Reduce motion|Reducir movimiento|Weniger Bewegung|Riduci animazioni|Réduire les animations
Beweging uit|Motion off|Movimiento desactivado|Bewegung aus|Animazioni disattivate|Animations désactivées
Taal wijzigen|Change language|Cambiar idioma|Sprache ändern|Cambia lingua|Changer de langue
Taal kiezen|Choose language|Elegir idioma|Sprache wählen|Scegli lingua|Choisir la langue
Taalsuggestie|Language suggestion|Idioma sugerido|Sprachvorschlag|Lingua suggerita|Suggestion de langue
Taalsuggestie sluiten|Dismiss language suggestion|Cerrar sugerencia de idioma|Sprachvorschlag schließen|Chiudi suggerimento lingua|Fermer la suggestion de langue
Architecten|Architects|Arquitectos|Architekten|Architetti|Architectes
Autobedrijven|Car dealerships|Concesionarios|Autohäuser|Concessionarie|Concessionnaires
Beauty & salons|Beauty & salons|Belleza y salones|Beauty & Salons|Bellezza e saloni|Beauté et salons
Bouw & renovatie|Construction & renovation|Construcción y reformas|Bau & Renovierung|Edilizia e ristrutturazioni|Construction et rénovation
Coaching|Coaching|Coaching|Coaching|Coaching|Coaching
Cosmetische klinieken|Aesthetic clinics|Clínicas estéticas|Ästhetische Kliniken|Cliniche estetiche|Cliniques esthétiques
Dakdekkers|Roofers|Empresas de tejados|Dachdecker|Imprese di coperture|Couvreurs
Dierenartsen|Veterinary practices|Veterinarios|Tierarztpraxen|Veterinari|Vétérinaires
Dierenverzorging|Pet care|Cuidado de animales|Tierpflege|Cura degli animali|Soins aux animaux
Evenementen|Events|Eventos|Veranstaltungen|Eventi|Événementiel
Glaszetters|Glaziers|Cristaleros|Glaser|Vetrai|Vitriers
Hotels|Hotels|Hoteles|Hotels|Hotel|Hôtels
Hoveniers|Landscapers|Jardineros|Gartenbau|Giardinieri|Paysagistes
Installatiebedrijven|Installation companies|Empresas instaladoras|Installationsbetriebe|Imprese di impiantistica|Entreprises d’installation
Kapperszaken|Hair salons|Peluquerías|Friseursalons|Parrucchieri|Salons de coiffure
Kozijnenbedrijven|Window installers|Empresas de ventanas|Fensterbauer|Installatori di serramenti|Installateurs de fenêtres
Makelaars|Estate agents|Agencias inmobiliarias|Immobilienmakler|Agenzie immobiliari|Agences immobilières
Vastgoed & makelaars|Property & estate agents|Inmobiliarias|Immobilien & Makler|Immobili e agenzie|Immobilier et agences
Non-profitorganisaties|Non-profit organisations|Organizaciones sin ánimo de lucro|Gemeinnützige Organisationen|Organizzazioni non profit|Organismes à but non lucratif
Restaurants|Restaurants|Restaurantes|Restaurants|Ristoranti|Restaurants
Tandartsen|Dental practices|Dentistas|Zahnarztpraxen|Dentisti|Dentistes
Vastgoedbeheerders|Property managers|Gestores inmobiliarios|Immobilienverwalter|Gestori immobiliari|Gestionnaires immobiliers
Verzekeraars|Insurers|Aseguradoras|Versicherer|Assicurazioni|Assureurs
Vloerenleggers|Flooring companies|Instaladores de suelos|Bodenleger|Posatori di pavimenti|Poseurs de sols
Woningcorporaties|Housing associations|Entidades de vivienda|Wohnungsbaugesellschaften|Enti per l’edilizia abitativa|Bailleurs sociaux
Zakelijke dienstverlening|Business services|Servicios empresariales|Unternehmensdienstleistungen|Servizi alle imprese|Services aux entreprises
Zonnepanelenbedrijven|Solar installers|Instaladores solares|Solarinstallateure|Installatori fotovoltaici|Installateurs solaires
`;
const locales = ["nl", "en", "es", "de", "it", "fr"] as const;
export const messages = rows
  .trim()
  .split("\n")
  .map((row) => row.split("|"));
for (const row of messages)
  if (row.length !== 6)
    throw new Error(`Invalid showcase translation: ${row[0]}`);
export function translator(locale: SupportedLocale = "nl") {
  const index = locales.indexOf(locale);
  const dictionary = new Map(messages.map((row) => [row[0], row[index]]));
  // Text-only translation. Never replace HTML attributes, identifiers or user input.
  return (source: string, values: Record<string, string | number> = {}) => {
    let result = dictionary.get(source) ?? source;
    for (const [key, value] of Object.entries(values))
      result = result.replaceAll(`{${key}}`, String(value));
    return result;
  };
}
export function pageLocale(): SupportedLocale {
  const code = document.documentElement.lang.split("-")[0];
  return locales.includes(code as SupportedLocale)
    ? (code as SupportedLocale)
    : "nl";
}

// Only our controlled demo templates use this helper, never visitor-entered titles.
export function translateDemoHtml(
  markup: string,
  locale: SupportedLocale,
): string {
  if (locale === "nl") return markup;
  const t = translator(locale);
  const dictionary = new Map<string, string>();
  for (const row of messages) {
    dictionary.set(row[0], t(row[0]));
    dictionary.set(row[0].toUpperCase(), t(row[0]).toUpperCase());
  }
  const pattern = new RegExp(
    [...dictionary.keys()]
      .sort((a, b) => b.length - a.length)
      .map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|"),
    "g",
  );
  const text = (value: string) =>
    value
      .replaceAll("&amp;", "&")
      .replace(pattern, (key) => dictionary.get(key)!)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  return `>${markup}<`
    .replace(/>([^<>]+)</g, (_, value) => `>${text(value)}<`)
    .slice(1, -1)
    .replace(
      /aria-label="([^"]*)"/g,
      (_, value) => `aria-label="${text(value)}"`,
    );
}

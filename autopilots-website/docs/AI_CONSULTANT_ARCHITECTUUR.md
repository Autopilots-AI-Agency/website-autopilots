# AI-consultant na de Autopilots-scan

## Actuele architectuurkeuze — n8n, 20 oktober 2026

De gebruiker kiest nu bestaande **n8n + Telnyx** in plaats van een aparte Render-service. Netlify voert server-side toestemming, verificatie, budget, idempotentie en opslag uit; n8n voert eenmalig geautoriseerde providerverzoeken uit met eigen credentials. Telnyx verzorgt het realtime gesprek; GHL blijft agenda-/contacteigenaar. De lokale funnel en resultaatpagina gebruiken dezelfde contracten met `CONSULTANT_TRANSPORT=n8n`. Geen extra hostingabonnement, geen wijziging van inbound of klantflows.

De actuele implementatiechecklist, veilig opgeslagen conceptflows, importvalkuilen en resterende activatievoorwaarden staan in `autopilots-platform/src/consultant/n8n/README.md`. De Render/SQLite/bridge-verwijzingen in het oorspronkelijke ontwerp hieronder zijn historische implementatiekeuzes, niet de nu gekozen productiearchitectuur. Geen provideractivatie, publicatie of echt gesprek bewezen.

Status: lokaal gekoppelde funnel, resultaatpagina en uitvoerende backend, 20 oktober 2026. Geen actieve telefoonagent, geen productiepublicatie, geen echte bel-, SMS- of agendatest. Dit document is de scoped checklist voor deze uitbreiding; het centrale OS/Finance-bouwplan wordt niet gewijzigd. **Besluit Tim: de bestaande GoHighLevel-agenda gebruiken. Geen directe Google Calendar-integratie bouwen.**

Aanvullend bevestigd: +31 85 083 5827 is de gewenste afzender. Tim heeft een afzonderlijk proefnummer in de chat opgegeven (eindigend op 6391). Dat privétestnummer niet in publieke configuratie of de repository opslaan. **Echte proefoproepen uitsluitend als allerlaatste stap wanneer alles is aangesloten; geen eerdere proefcalls of SMS sturen.**

## 1. De klantreis

Quiz → website of ‘geen website’ → persoonlijke analyse → keuze A of B → kennismaking bovenaan, scanresultaten daaronder.

- **A — Ontvang mijn analyse:** alleen e-mailadres en toestemming voor deze aanvraag. Via Resend vanuit support@auto-pilots.io, in de taal van de scan. Persoonlijk advies in de mail, inclusief aannames en voorwaarden. Geen automatische nieuwsbriefinschrijving.
- **B — Bel mij met AI:** mobiel nummer, expliciete toestemming voor één direct aangevraagde AI-call en een korte SMS-codecontrole. De bezoeker bevestigt daarna ‘Bel mij nu’. Geen verplicht bedrijfsnaamveld. Quiz en eventueel websiteadres blijven de bedrijfscontext leveren.
- Daarna verschijnt dezelfde resultatenpagina met een kennismakingsknop boven de analyse. Bij B staat de echte belstatus erbij. De bezoeker kan op die pagina blijven tijdens het gesprek.
- Geen resultaatblokkade als iemand niet wil mailen/bellen: ‘Bekijk mijn analyse’ blijft beschikbaar.
- ‘Direct’ betekent na geldige verificatie en beschikbare capaciteit. Geen gegarandeerde secondeclaim. Na vijf minuten vervalt de belopdracht en is nieuwe toestemming nodig. Geen nachtelijke latere retries.

## 2. Ontwerp

Bestaande donkerblauwe achtergrond, bronzen accenten, Public Sans/Syne, rustige animaties. Twee gelijkwaardige kaarten op desktop, onder elkaar op mobiel. Per kaart één duidelijke actie. Geen automatische kanaalkeuze, geen vooraf aangevinkte toestemming. Landcode bij telefoonnummer; taal bepaalt niet het land. Nederlands 06 wordt +316. Statusberichten onderscheiden ‘aangevraagd’, ‘provider geaccepteerd’, ‘gaat over’, ‘verbonden’, ‘niet bereikt’ en ‘afgerond’.

De kanaalkeuze is nu direct onderdeel van de quiz, niet meer een afzonderlijke previewvlag. Alle zes talen hebben een eigen `/[taal]/ai-scan/resultaat/`-route. Bellen blijft server-side uitgeschakeld zolang de uitvoerende service, providerconfiguratie en kostenlimieten niet gereed zijn. Beide keuzes gaan naar dezelfde landing met kennismaking bovenaan en de analyse eronder. Persoonlijke resultaten blijven maximaal één uur zichtbaar in dezelfde browsertab; dit is geen openbare of permanente dossierlink.

## 3. Geverifieerde bestaande onderdelen

| Onderdeel | Aangetroffen | Wat nog niet is bewezen |
| --- | --- | --- |
| Website | Astro / Netlify, zes scanroutes | Deze nieuwe flow is niet gepubliceerd |
| Analyse | Bestaande OpenAI-analyse; serverondertekend dossier, vervalt na één uur | Gesprekskwaliteit op deze context |
| E-mail | Resend-bevestiging, immutable verzending per assessment | Nieuwe volledige analyse in een echte mailbox |
| Agenda | Read-only API 200: `UaWTV0sdETiXy0refclQ`, actief, eigen location, één teamlid, 30 minuten, “(Website) Kennismaking met Autopilots - Ai Agents op maat” | Sync naar tim@auto-pilots.io en echte boeking nog niet bewezen |
| Google Calendar | Read-only kalenderinventaris geprobeerd | Connector mist vereiste scopes; geen kalender geverifieerd |
| Telefonie | Telnyx-portal read-only: +31 85 083 5827 actief in het account; gekoppeld aan `assistant-66949f77-5bb2-4348-872e-4fdfce0763b5` (Sales agent). Nummer is niet SMS-capable; inbound recording uit. Geen Telnyx-key in gecontroleerde project-envbestanden | Nieuwe outboundconfiguratie, zes stemmen, outboundrechten en aparte verificatiedienst nog niet aangesloten |

De bestaande nummerbinding blijft ongewijzigd. Bouw de quizconsultant als afzonderlijke outboundconfiguratie, zonder de huidige Sales agent of inkomende route te overschrijven. Het 085-nummer kan niet zelf de verificatie-SMS versturen: hiervoor is een afzonderlijk goedgekeurde verificatiedienst/SMS-configuratie nodig. Geen ander klantnummer hergebruiken en geen betaald nummer aanschaffen zonder akkoord.

De gekoppelde Sales agent staat op Main/live traffic en is expliciet een Nederlandstalige inbound-agent. De prompt noemt agenda-tools, maar de zichtbare gekoppelde toollijst bevat alleen Hang Up. Dat is geen bewijs van een werkende agendakoppeling; die tools worden niet als bestaand overgenomen. Deze agent is alleen gelezen, niet gewijzigd of getest.

Geen klantagenten of andere projecten hergebruiken. Een aangetroffen environment-naam is geen bewijs van een bruikbare key of een werkende koppeling. Stripe Directory kon niet worden geraadpleegd omdat de CLI niet is geïnstalleerd; voor de door de gebruiker gekozen Telnyx-integratie is officiële documentatie gebruikt. Geen accounts aangemaakt.

## 4. Doelarchitectuur

```text
Astro quiz (NL / EN / ES / DE / IT / FR)
  └─ Netlify analyse → ondertekend assessment + taal + bronverwijzingen
       ├─ E-mailkeuze → bestaand Resend-journal → analyse + afspraaklink
       └─ Belkeuze → servercontrole → OTP + expliciete beltoestemming
                      └─ OS CallRequest + outbox (één transactie)
                           └─ worker op Render → Telnyx AI Assistant
                                  ├─ eigen gesprekstaal + dossier
                                  ├─ beperkte agenda-tools → bestaande GoHighLevel-agenda
                                  └─ gevalideerde events → status + korte overdracht

Resultatenpagina ← beveiligde statuspolling; agenda bovenaan, analyse eronder
```

De website blijft in de website-repository. Duurzame belopdrachten, autorisatie, outbox en agenda-adapter staan als afzonderlijke module in `autopilots-platform/src/consultant`. Die heeft nu een eigen transactionele, versleutelde opslag en worker. Er is geen tweede CRM en geen wijziging van de bestaande Finance- of outreachwerkstroom. Integratie/deployment naar de actuele OS-productieomgeving is afzonderlijk werk; de oude server uit deze worktree niet als geheel uitrollen.

## 5. Context en agent

Eén versiebeheerbaar gespreksbeleid, zes localeconfiguraties met expliciete taal en eigen, getest stemprofiel. Per call wordt een gepind assistant-ID + versie gekozen. Nooit een globale assistant telkens overschrijven met gegevens van de volgende bezoeker.

Het dossier bevat:

- Bedrijfstype, teamgrootte, doelen, kanalen, volume, systemen en timing uit de quiz: **door bezoeker opgegeven**.
- Website en bronobservaties: **waargenomen, niet onafhankelijk geverifieerd**.
- Scanadvies: **voorlopige hypothese**, geen vastgestelde businesscase.
- Open vragen, bronmoment en assessment-ID.

Geen API-sleutels, andere klantdossiers of algemene CRM-export in de prompt. Raw website-instructies en bezoekersinvoer zijn data, nooit systeeminstructies. De AI weet niet alles over het bedrijf: hij weet wat opgegeven/gevonden is, en controleert de rest. Geen algemene agentmemory tussen bedrijven.

### Gespreksopbouw (meestal 3–5 minuten, maximaal 6)

1. AI-identiteit en aangevraagde call noemen. Vragen of het uitkomt en of de ontvanger de scan invulde. Geen dossierdetails voordat dit bevestigd is.
2. Eén quizantwoord teruggeven. Bijvoorbeeld: ‘Je gaf aan dat klantcontact vaak tussendoor komt. Wat gebeurt er nu als niemand de telefoon kan opnemen?’
3. Doorvragen naar proces, frequentie, impact en verantwoordelijkheid. Eén vraag per beurt; niet de hele quiz opnieuw.
4. Eén concrete oplossing spiegelen. ‘Een digitale baliemedewerker die eerst de juiste informatie verzamelt, zodat je monteur met een complete werkbon vertrekt.’ Alleen bij een passende niche.
5. Eigen woorden van de ondernemer samenvatten, ontbrekende feiten checken.
6. ‘Zullen we met Tim bekijken hoe dat in jullie huidige werkwijze zou passen?’ Vervolgens twee echte vrije opties, of verwijzen naar de resultatenpagina als agenda-tools niet beschikbaar zijn.

### Bezwaren en interesse

| Signaal | Reactie |
| --- | --- |
| ‘We hebben al software’ | Wat werkt goed, waar zit nog handmatig werk? Geen vervanging als standaardadvies. |
| ‘Dat wordt duur’ | Welke verbetering zou een investering zinvol maken? Eenmalige implementatie + maandelijkse kosten op aanvraag; geen verzonnen bedrag. |
| ‘AI maakt fouten’ | Uitleggen dat bevoegdheden begrensd zijn en een mens kan overnemen. Geen foutloosheid beloven. |
| ‘Ik weet niet of ik dit nodig heb’ | Toestemming vragen om één concreet voorbeeld te geven; daarna vrij laten kiezen. |
| ‘Geen tijd’ | Stoppen of vragen of zelf plannen handiger is. Geen automatische callback inschrijven. |
| ‘Geen interesse / niet meer bellen’ | Niet ombuigen. Stoppen en suppressie vastleggen. |

Need creation is behoefteverheldering op basis van echte problemen, niet iemand onzeker maken of een probleem verzinnen. De voorbeeldzinnen worden in de geselecteerde taal uitgesproken. Bij een vrijwillige taalwissel toestemming checken en alleen naar een ondersteund, getest taalprofiel wisselen.

## 6. Servercontracten en gegevens

Private gegevens staan in versleutelde SQLite-records: challenge, call, booking, slot, slot_lock, suppression, usage en tool_usage. Auditmetadata en replay-nonces hebben aparte tabellen. Geen bestaande productie-database gemigreerd.

- `contact_request`: organisatie en assessment servergebonden, kanaal, contactgegeven, consenttekstversie/tijd, idempotency key, fingerprint.
- `phone_verification`: nummer + assessment + organisatie + sessie, vervalt na vijf minuten, maximaal vijf pogingen, geen plaintext OTP; éénmalig consumeerbaar.
- `call_request`: immutable dossier/versie, taal, R3-classificatie, current approval-version, status, telefoon-HMAC, dispatchreceipt, expiration, kostenreservering.
- Status: provider-ID bij de call, geauthenticeerde status-read en audit van de toestandsovergang. Geen transcript in algemene logs.
- `booking_attempt`: server-issued slot, tijdzone, expliciete bevestiging, unieke assessmentboeking, provider-event-ID en resultaat.

Geïmplementeerde endpoints:

1. Browser: `POST /.netlify/functions/consultant`, action `config`, `verify-start`, `verify-check`, `call` of `status`. Alleen eigen origin, geen providersecret in de browser.
2. Backend: `POST /bridge/<action>`, uitsluitend met HMAC, timestamp en eenmalige nonce vanuit Netlify. De vertrouwde client-IP komt van Netlify, niet uit een browserveld.
3. `verify-start`: ondertekend assessment, eigen telefoonallowlist, expliciete consent, quota en kostenreservering vóór SMS. `verify-check`: challenge-capability, code en maximaal vijf pogingen; code wordt niet opgeslagen.
4. `call`: geverifieerd bewijs en definitieve belbevestiging. Eén transactie consumeert het bewijs, toetst suppressie/budget en schrijft de outbox. Een succesvolle HTTP-response met `queued` is nog geen verbonden gesprek.
5. `status`: alleen met willekeurige per-call capability; geen vrije ID-enumeratie of PII in de response. Status en capability gaan niet in de URL.
6. Agent-tools: `POST /tools/availability`, `/tools/book`, `/tools/suppress`, met tijdelijke per-call capability in de header. Organisatie en agenda liggen server-side vast. Boekingsstatus volgt uit het herhaalde, idempotente book-resultaat en verschijnt ook op de resultaatpagina.

Deze routes, Verify-adapter, duurzame opslag en worker zijn lokaal gebouwd en met synthetische providers getest. Voor een openbare uitrol zijn een botchallenge en expliciete landenpolicy nog nodig; de huidige pilot is beperkt tot een private telefoonallowlist. Er draait nog geen geactiveerde productieservice.

## 7. Geen dubbele calls of spookboekingen

- Atomische uniekheidscontrole op organisatie + assessment voor belaanvragen. Ook limiet op telefoon-HMAC en vertrouwde server-IP bij verificatie. Niet alleen een browser-idempotency key gebruiken.
- Aanvraag en outbox in dezelfde DB-transactie. Worker claimt atomair en reserveert maximale kosten vóór providerverzoek.
- Timeout ná dispatch betekent `provider_unknown`, nooit automatisch opnieuw bellen. Eerst providerstatus reconciliëren. Crash na provideracceptatie maar vóór opgeslagen receipt volgt hetzelfde pad.
- Belstatus wordt actief bij Telnyx opgevraagd met serverauthenticatie. Ongetekende callbacks veranderen niets; een verbonden gesprek kan niet terug naar ‘gaat over’.
- De aanwezige Ed25519-helper is uitsluitend voor toekomstige Telnyx API-v2 JSON-events, niet voor TeXML-form callbacks. Voor deze pilot wordt geen publieke statuswebhook gebruikt.
- `provider_accepted` bewijst geen verbinding. `confirmed` booking vereist event-ID en juiste kalender, niet alleen gesproken ‘ja’.
- No-answer/voicemail: geen bedrijfsdetails, geen automatische retry. Bezoeker kan zelf opnieuw toestemming geven volgens limiet.

## 8. Agenda en overdracht naar Tim

Tim heeft de bestaande GoHighLevel-agenda gekozen. Gebruik de bestaande widget als fallback. Calendar-ID en eigen location zijn read-only bevestigd; schrijfbevoegdheden, notificatieautomations en sync naar tim@auto-pilots.io moeten nog worden bevestigd. De ontbrekende Google Calendar-scopes zijn voor deze gekozen route geen blocker. De Codex-agendaconnector is niet de runtime-integratie voor bezoekers. `consultant-ghl.mjs` bevat een scoped provideradapter; contactresolutie, server-issued slots, kort geldige slotbewijzen en transactionele boekingslocks zijn lokaal geïmplementeerd in de afzonderlijke OS-module. De bestaande agenda bepaalt de duur: 30 minuten.

Beschikbaarheid: IANA-tijdzone van de bezoeker expliciet vastleggen; werktijden, buffers, duur en vakantieblokkades vastleggen. Een slot krijgt een korte geldigheid en server-ID. Vóór boeken beschikbaarheid opnieuw controleren; gebruik een slotlock en provider-idempotency/reconciliatie. Externe handmatige boekingen blijven een race die getest moet worden.

Boek alleen na hardop bevestigde datum, tijd, tijdzone en duur. Alleen dan naam/e-mail vragen voor de uitnodiging. Geen willekeurige agenda-ID uit de prompt accepteren. Bij timeouts geen nieuwe gebeurtenis maken. Toon fallback-boekingslink op de resultatenpagina.

Overdracht: scan, bevestigde pijnpunten, huidige systemen, gewenste uitkomst, open vragen en bezwaar/context. Label mening versus feit. Geen lange transcriptdump standaard. E-mailuitnodiging alleen uit de gekozen agenda om dubbele uitnodigingen te voorkomen.

## 9. Toestemming, kosten en beheer

Geen juridisch advies: vóór activatie privacytekst, verwerkersafspraken, internationale gegevensverwerking, bewaartermijnen en regels voor aangevraagde geautomatiseerde calls per bestemmingsland laten toetsen. Landen afzonderlijk activeren; zes talen betekent niet automatisch wereldwijd bellen.

- Recording standaard uit. Transcript-/providerretentie apart instellen en controleren; ‘niet opnemen’ is niet hetzelfde als ‘geen tekst bewaren’.
- Eerste pilot: één gelijktijdige call, tien calls per dag, maximaal zes minuten, één call per geverifieerde aanvraag, bestemmingallowlist. Tim heeft op 20 oktober 2026 **USD 10 per dag** goedgekeurd voor SMS en AI-calls samen. De runtime begrenst dit op 1000 USD-cent per voortschrijdende 24 uur en weigert hogere configuratiewaarden of een andere valuta. Gecontroleerde tarieven/bovengrenzen per poging blijven een activatievoorwaarde; onbekende werkelijke kosten zijn `null`, nooit 0. Dit is geen providerbrede factuurstop voor andere Telnyx-diensten of hosting.
- Operator-kill-switch vóór queueadmission én vóór dispatch. Actieve calls apart kunnen beëindigen. Begrens ook SMS-verificatiekosten.
- OTP-bewijs verloopt na vijf minuten. Lokale operationele gegevens worden na zeven dagen verwijderd; auditmetadata na negentig dagen. Deze bewaartermijnen en die bij providers vóór activatie bevestigen. Suppressie-HMAC afzonderlijk beheren.
- Serviceaccounts met minimale rechten, secrets uitsluitend server-side. Logs alleen correlatie-ID/status; geen tokens, telefoonnummers of dossiers.

## 10. Bouwvolgorde en acceptatie

| Fase | Werk | Gereed wanneer |
| --- | --- | --- |
| 1 — deze branch | Zes locale-instructies, contextbuilder, outbound-adapter, interne call/bookingcontracten, keuzescherm, analyse in e-mail | Lokale tests; geen echte call |
| 2 — infrastructuur | Eigen Telnyx-afzender, outboundrechten, zes voice/ASR-profielen, gepinde assistantversies, primary agenda | Provider-readback en approved configuratie |
| 3 — beveiligde uitvoering | OTP, botpreventie, transactional repository/outbox, worker, quotas/budget, callbacks, suppressie, statuspolling | Concurrentie-, crash-, replay-, cross-tenant- en kostentests groen |
| 4 — agenda | OAuth/GHLadapter, beschikbaarheid, locks, expliciete bevestiging, idempotency, reconciliatie | Exact één echte testboeking in Tims gekozen agenda, correct tijdstip/invite |
| 5 — funnel | B-route verbinden; A/B naar dezelfde resultaten-/boekingspagina; privacytekst | Mobile/desktop alle zes talen, juiste context, geen dubbele verzending |
| 6 — proefgesprekken | Alleen door Tim opgegeven testnummer(s), per taal kwaliteit beoordelen | Opname/transcript alleen na afzonderlijk akkoord; checklist hieronder |
| 7 — publicatie | Volledige website release gate, reviewed PR, beschermde main, Netlify release-identiteit; afzonderlijke backendrelease | Exacte livecommit + geverifieerde end-to-end aanvraag, call en agenda |

Proefgesprekken: goede fit, geen fit, onderbreken, lang stil, slechte verbinding, verkeerde ontvanger, voicemail, ontbrekende website, verkeerde niche, ‘geen interesse’, ‘niet meer bellen’, prijsbezwaar, promptinjectie, agenda bezet, verlopen slot, DST/tijdzone, provider-timeout, callbackreplay, twee browservensters. Beoordeel uitspraak, latency, luisteren, herhaling, feitelijke juistheid en overdracht. Statische prompttests bewijzen nog geen gesprekskwaliteit.

### Open keuzes die echt nodig zijn

1. GHL is gekozen; bevestig nog juiste calendar-ID, API-rechten en sync naar Tim.
2. Telnyx-portal is toegankelijk en nummerbinding bevestigd; afzonderlijke runtime-key door Tim goedgekeurd, nog niet aangemaakt/opgeslagen. Afzonderlijke outboundconfiguratie en goedgekeurde SMS-verificatie nog nodig. Testnummer is bevestigd; alleen testen aan het einde.
3. Voorkeursstem per taal (begin met Nederlands; overige talen pas na luistertest).
4. Dagbudget is USD 10; nog nodig: geverifieerde tarieven/reserveringen, hostingakkoord, landentoelating, bewaartermijnen en eventuele opnamekeuze. Render toont een mislukte betaling; afzonderlijke consultantservice en bronkoppeling nog niet ingericht.

## Bronnen

- [Telnyx dynamic variables](https://developers.telnyx.com/docs/inference/ai-assistants/dynamic-variables): per-call context, geen secrets in promptvariables.
- [Officiële Telnyx Node SDK: TeXML](https://github.com/team-telnyx/telnyx-node/blob/master/src/resources/texml/texml.ts): requestcontract, gepinde assistantversie, limieten, `call_sid`-receipt.
- [Telnyx webhook signing](https://support.telnyx.com/en/articles/4334722-how-to-leverage-webhooks): Ed25519 API-v2-ondertekening.
- [GHL vrije tijden](https://marketplace.gohighlevel.com/docs/ghl/calendars/get-slots/) en [afspraak maken](https://marketplace.gohighlevel.com/docs/ghl/calendars/create-appointment/): scoped kalenderadapter. Bestaande account gebruikt de ondersteunde `2021-04-15` API-header; calendar-read daarmee geslaagd. Writecontract nog met stagingfixture/provider te accepteren.

Bronnen gecontroleerd 20 oktober 2026. Geen brede providerveranderingen, echte gesprekken of agendawrites uitgevoerd.

## Huidige implementatie en verificatie

- Website: directe kanaalkeuze, e-mailverzending, sms-codeformulier, expliciete belknop en zes resultaatroutes in de bestaande navy/bronzen stijl.
- Netlify: eigen ondertekende bridge naar de backend; nooit een Telnyx-key in de browser. Strikte origincontrole, requestlimiet, vertrouwde platform-IP, geen browsergestuurde bestemming voor backendverzoeken.
- OS: afzonderlijke consultantserver, versleutelde SQLite-outbox, atomische idempotentie, verificatie, budgetreservering, rate limits, single-call-capaciteit, replaybescherming, suppressie, fail-closed activatie en herstartbestendige onbekende uitkomsten.
- Agenda: server-issued slots, expliciete bevestiging, contactresolutie, kalenderafscherming, boekingslock en receiptcontrole. Bij twijfel geen automatische tweede afspraak.
- Agent: zes manifesten met bekende context, juiste taal, eerlijke AI-intro, gerichte consultvragen, begrensde bezwaarafhandeling en scoped agenda-tools. Alleen configuratiebuilders; nog niet naar Telnyx geüpload.
- Status komt uit een geauthenticeerde provider-read. Ongetekende TeXML-callbacks hebben geen invloed. Herladen van de resultaatpagina belt niet opnieuw.
- 59 website unit-/integratietests, 46 OS-tests en de volledige suite van 160 browsertests geslaagd. Typecheck, lint, formattering, 430 HTML-pagina's, 18.767 interne links, metadata, één H1 per pagina, zes talen en 56 redirects gecontroleerd.
- Productie-identiteitscontrole blijft terecht geblokkeerd: deze lokale, ongepubliceerde build heeft nog geen gereviewde releasecommit. Geen tijdelijke of misleidende release-SHA ingevuld.
- De eerste testpoging wees naar een al draaiende preview van een andere worktree. De testconfig gebruikt nu een eigen instelbare poort en weigert hergebruik van een willekeurige server. Daarna is tegen de juiste bron gebouwd en getest.
- Niet live: geen providerconfiguratie gewijzigd, geen echt sms-bericht, gesprek of agenda-item gemaakt. Geen productiepush of release uitgevoerd.
- Deployment, secrets, betaalde activatie, stemacceptatie en echte end-to-end acceptatie zijn nog niet afgerond. Een geslaagde lokale test is geen bewijs dat een telefoon al werkelijk overgaat.

De uitvoeringsinstructies en exacte activatievoorwaarden staan in [OPERATIONS.md](../../autopilots-platform/src/consultant/OPERATIONS.md). Deze module is additief: niet de oude OS-server of Finance-checkout als geheel deployen. Definitieve gesprekkenoverdracht naar Tim en providerkostenreconciliatie zijn nog aparte aansluitpunten.

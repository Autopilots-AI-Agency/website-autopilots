# Quiz-consultant: uitvoeren en activeren

> **Actueel besluit 20 oktober 2026: n8n + Telnyx, zonder nieuwe Render-service.** Volg [n8n/README.md](n8n/README.md) en `n8n/netlify.env.example`. De onderstaande standalone-server/diskprocedure is de eerdere, niet gekozen variant en mag niet als activatie-instructie worden gevolgd. SQLite blijft voor lokale tests; productiepilotopslag wordt Netlify Blobs. Er is nog geen provideractivatie of eindtest geweest.

Deze module is een **nog niet geactiveerde uitbreiding** van het OS. Hij vervangt niet de actuele OS-server, Finance, bestaande CRM of de huidige inbound Sales agent. Geen providerwrites bij import of het genereren van een assistantmanifest. De website blijft op Netlify; deze server heeft een blijvend proces en opslag nodig.

## Lokale controles

Gebruik Node 22.13 of nieuwer (getest met 22.23.2). De bestaande OS-package ondersteunt ook Node 20, maar deze afzonderlijke module vereist Node 22 vanwege `node:sqlite`.

```sh
# Vanuit autopilots-platform
node --test tests/*.test.js
# Start alleen met afzonderlijk, veilig ingevulde runtimevariabelen:
node src/consultant/server.mjs
```

De tests gebruiken uitsluitend fictieve telefoonnummers en providerantwoorden. Ze bellen niemand en boeken niets. `runtime.env.example` is een inventaris, geen ingelezen secretbestand. Geen sleutel in Git, chat, logs of een publieke variabele plaatsen.

## Configuratie vóór de eerste echte pilot

1. Integreer deze afzonderlijke module via een beoordeelde backendrelease; start niet de oude OS-server uit deze worktree als vervanging van de huidige productiecore.
2. Op Render: één instantie, Node 22+, persistent disk op `/var/data`, healthcheck `/health`, `HOST=0.0.0.0`. Geen ephemeral disk of meerdere replica's gebruiken. Bestaande services niet vervangen. Hosting/diskkosten eerst bevestigen.
3. Geef vier afzonderlijke lange willekeurige secrets op: storage-encryptie, HMAC-hashes, websitebridge en de **bestaande** signing secret van de scan. De signing secret moet overeenkomen met Netlify. Alleen de bridge-secret delen tussen bridge en server; geen Telnyx/GHL-key naar de website.
4. Maak zes afzonderlijke outbound-assistants met `assistantManifest()` en een daadwerkelijk beschikbaar model en geteste stem. De builder doet geen upload. Lees de opgeslagen configuratie terug, pin een numerieke provider-versie, controleer tools en taal. Laat de huidige inbound Sales agent en nummerbinding intact.
5. Configureer een eigen Telnyx Verify-profiel, account-ID, outbound TeXML-connection en geautoriseerde afzender `+31850835827`. Het 085-nummer zelf is niet SMS-capable; controleer Verify-toelating en verzendregels apart. Geen ander klantnummer gebruiken.
6. Zet assistant-ID en gepinde versie per `nl`, `en`, `es`, `de`, `it`, `fr` in `CONSULTANT_ASSISTANTS_JSON`. Controleer dat de TeXML-connection de nieuwe outbound-assistants kan uitvoeren. De module gebruikt authenticated status reads; geen ongetekende callback wijzigt belstatus.
7. Verifieer GHL-location/kalender, contact-write en afspraak-write rechten, notificatie/workflow-effecten en daadwerkelijke synchronisatie naar Tim. De bestaande kalender is 30 minuten. Geen duplicaatuitnodiging vanuit Resend sturen.
8. Leg huidige menselijke activatiegoedkeuring vast als `CONSULTANT_APPROVAL_VERSION`. Tim heeft op 20 oktober 2026 **USD 10 per dag voor de testfase** goedgekeurd, plus een afzonderlijke Telnyx-sleutel uitsluitend als Render-secret. De template bevat `CONSULTANT_BUDGET_CURRENCY=USD` en `CONSULTANT_DAILY_BUDGET_CENTS=1000`. De code weigert een hogere pilotlimiet of andere valuta. Het venster is conservatief de afgelopen 24 uur, dus geen extra budget door middernacht of een herstart. Vul daarnaast geverifieerde bovengrenzen voor één Verify-poging en maximaal zes belminuten inclusief model/voice/telephony in. Deze reserveringen blijven 0 en beide activatieschakelaars blijven uit totdat tarieven en providerconfiguratie zijn geverifieerd. Een reserveringslimiet is geen providerbrede factuurstop; andere bestaande diensten en hosting vallen er niet onder.
9. Vul uitsluitend het door Tim opgegeven testnummer in de **private** `CONSULTANT_ALLOWED_PHONES`. Dit nummer staat bewust niet in bronbestanden. De publieke belroute is nog geen vrijgegeven wereldwijde uitrol.
10. Zet op Netlify `CONSULTANT_SERVICE_URL`, `CONSULTANT_BRIDGE_SECRET`, `CONSULTANT_ENABLED`. Eerst gecontroleerde preview/staging; publicatie via de bestaande website releasegate en reviewed PR naar protected main. Verifieer de live release-identiteit.
11. Pas nadat alles gereed is: laatste proef met Tims goedgekeurde nummer. Nummerverificatie, aangevraagde belopdracht, werkelijk gesprek, gekozen taal, gebruikte quizcontext en één geverifieerde testafspraak controleren. Geen eerdere echte SMS of testcall.

## Uitvoeringsgrenzen

- Pilot: expliciete telefoonallowlist, maximaal één actieve call, tien opdrachten per 24 uur, twee per telefoon per 24 uur, één call per assessment, zes minuten per call. OTP: drie sms-pogingen per nummer per uur, vijf per IP per uur, vijf codepogingen. Definitieve commerciële limieten volgen een aparte release.
- Elke betaalde poging wordt vóór de providerwrite gereserveerd; werkelijke kosten blijven `null` tot er providerbewijs is. Reserveringen worden conservatief niet teruggegeven na een onbekende uitkomst. Geen automatische herbelpoging.
- SMS en calls delen dezelfde USD-reserveringsruimte van maximaal 1000 cent per voortschrijdende 24 uur. Onvolledige/oude usage-records zonder valuta of geldige reservering blokkeren nieuwe betaalde pogingen tot controle. De teller is blijvend opgeslagen; geen aparte budgetten per taal of browser.
- Elke aanvraag is aan organisatie, assessment, consentversie, verificatiebewijs en actuele goedkeuringsversie gebonden. Websiteverzoeken zijn ondertekend, tijdgebonden en beschermd tegen replay. Agent-tools hebben een tijdelijke per-call capability; geen browser kan een willekeurige kalender opgeven.
- SQLite is alleen de operationele outbox, bewijs- en statusopslag, geen tweede CRM. Gegevens versleuteld met AES-GCM; privébestand. Bewijslogs bevatten geen telefoon of antwoorden. Dossier/challenge/boekingsrecords zeven dagen; auditmetadata negentig dagen; suppressie alleen keyed hash. Definitieve retentie en providerretentie vóór activatie bevestigen. Geen audio-opname aangevraagd.
- De resultaatpagina gebruikt alleen tabgebonden sessionStorage en een vervaltijd van één uur. Geen dossiers of telefoonnummers in publieke URL's. Herladen veroorzaakt geen nieuwe call. Zonder opgeslagen analyse wordt geen voorbeeld als echte uitslag getoond.
- Bij agenda-conflict of onduidelijke write: geen bevestigde afspraak claimen; geen nieuwe automatische create. Verwijs naar de bestaande boekingsknop. Bestaande handmatige boekingen kunnen buiten onze lokale slotlock plaatsvinden: provider-free-slot-validatie blijft vereist.

## Stoppen en herstellen

- Zet `CONSULTANT_ENABLED=false` aan beide zijden. Herstart de backend met gewijzigde configuratie: de worker annuleert nog niet verstuurde opdrachten. Een reeds verbonden gesprek wordt niet door deze schakelaar opgehangen; beëindig dat apart via Telnyx. Maximumduur blijft zes minuten.
- `provider_unknown` of een vastgelopen `dispatching`: nooit opnieuw bellen. Zoek de aanvraag read-only op bij Telnyx met tijd/afzender/bestemming; noteer receipt. Statusherstel vereist een afzonderlijke bevoegde handeling. Geen automatisch herstelcommand dat mogelijk opnieuw belt.
- `booking:unknown`: controleer GHL handmatig op de afspraak en uitnodiging. Niet nogmaals create aanroepen. De lock blijft bewust behouden.
- Persistent disk back-up en sleutelherstel vóór activatie testen. Een verloren encryptiesleutel maakt opgeslagen dossiers onleesbaar. Geen sleutelrotatie door simpelweg de environmentwaarde te vervangen.
- Bij releasefout vorige website/backend laten draaien; geen lokale Netlify-productiedeploy. Deze module is niet live bewezen zolang de provideracceptatie en laatste echte proef ontbreken.

## Nog nodig vóór publieke uitrol

Provider-toegang/configuratie, geverifieerde kostenreserveringen, stem-/taalacceptatie, GHL-notificatiereview, privacy/verwerkers- en landentoets, reviewed releases, productietest, noodstopbewijs en kostenreconciliatie. Het pilotbudget en een afzonderlijke Telnyx-key zijn inmiddels goedgekeurd; dit is geen goedkeuring voor een nieuw hostingabonnement. Voor openbaar gebruik ook een expliciete landenpolicy en botchallenge toevoegen; huidige allowlist mag niet stilzwijgend worden verwijderd. Gespreksoverdracht naar Tim is nu scancontext plus boekingsbewijs; een door provider geverifieerde samenvatting na afloop is nog niet aangesloten.

## Providercontrole 20 oktober 2026

- Bestaande Telnyx-login hersteld. API-keyformulier geopend, **niet aangemaakt**; geen key van een ander project gebruikt. Sleutel pas genereren zodra de afzonderlijke veilige Render-bestemming vaststaat. De getoonde keydialoog biedt tags en vervaldatum, geen afzonderlijke rechtenselectie; geen beperkte scope claimen zonder providerbewijs.
- Render-workspace Autopilots is bereikbaar, maar toont **Payment failed**. De vijf getoonde bestaande services zijn andere applicaties, waaronder `autopilots-outreach-os`; geen consultantservice aanwezig. Geen bestaande service aangepast.
- Render Git Provider-lijst toont de bronrepository `TIMKUIPER1/website-autopilots` niet. Bronautorisatie/integratie van de afzonderlijke module moet vóór release worden opgelost; geen oude OS-core deployen.
- Aparte service met blijvende opslag en eventuele extra maandkosten aan Tim voorgelegd. Geen abonnement, secrets, deployment, SMS of call aangemaakt tijdens deze controle.
- Nieuwe USD-budgettests en volledige OS-suite: **49 geslaagd**. Dit is lokale verificatie, geen werkend extern gesprek.

# Autopilots quizconsultant — n8n pilot

## Actueel besluit en status — 20 oktober 2026

Tim kiest bestaande n8n + Telnyx. **Geen nieuwe Render-service of hostingabonnement.** De frontend en beleidscontrole blijven op Netlify. Telnyx verzorgt het realtime gesprek; n8n voert alleen provideropdrachten uit. n8n is geen audiostreamserver en geen tweede CRM. GoHighLevel blijft de contact- en agenda-eigenaar.

Gebouwd: versleutelde Netlify Blobs-ledger met sterke reads, conditionele writes en exclusieve lease; eenmalige provideropdrachten; twee importeerbare n8n-flows; Netlify-routes; bestaande zes-taals funnel/landing en agentbeleid aangesloten op deze transportkeuze. Nog geen productiepublicatie en geen echt gesprek bewezen.

Opgeslagen in n8n, **niet gepubliceerd/uitgevoerd**:

- Provider Executor: `iigbdfuR98Hulw05` — https://n8n.auto-pilots.io/workflow/iigbdfuR98Hulw05
- Queue Worker: `7qaQwQhDBCMzyRrN` — https://n8n.auto-pilots.io/workflow/7qaQwQhDBCMzyRrN

Aanvulling 20 oktober: Tim heeft expliciet hergebruik van de bestaande eigen Telnyx-credential goedgekeurd. Een eenmalige GET naar het bekende eigen nummer-ID bevestigde via `Telnyx Authorization` (`cdD9he5HndaG2ae7`) het actieve nummer `+31850835827`, tag `Autopilots` en de bestaande inbound-agentbinding. Beide Telnyx-nodes gebruiken nu deze credential. De tijdelijke GET-controlenode is verwijderd. Er is geen nieuwe sleutel aangemaakt of uitgelezen, geen SMS/call gestart en geen providerconfiguratie veranderd.

Eerdere provider-export teruggelezen: `active=false`, toen geen gekoppelde credentials, geen opgeslagen failed/success/manual/progress-payloads, maximum workflowduur 60 seconden. Queue Worker: eigen concept aangemaakt, vier bewaaropties via UI op 'Do not save' opgeslagen; read-backexport nog nodig. Geen andere workflow of inkomende nummerbinding gewijzigd.

**Importvalkuilen aangetroffen:** n8n neemt workflow-level instellingen niet mee bij deze UI-import. Opening van een node zonder bestaande credential kan automatisch een bestaande credential selecteren. De eerste conceptnode kreeg hierdoor `Telnyx Authorization` zonder uitvoering. Alle eigen conceptnodes zijn vervangen; daarna bevestigt de gedownloade export dat geen credential is gekoppeld. De bronexport bevat expliciet ongeldige `UNCONFIGURED_AP_CONSULTANT_*` referenties om automatische naamherkenning te voorkomen; vul pas echte, afzonderlijke credential-ID's in na autorisatie. Lees de opgeslagen export opnieuw terug vóór uitvoering. `sendBody` is een vaste boolean; afzonderlijke GET/POST-nodes voorkomen importconversie van expressies op dit veld.

## Verantwoordelijkheden en stroom

1. Quiz → ondertekend assessment. E-mail blijft de bestaande Resend-route.
2. Telefoon → Netlify controleert toestemming, testnummerallowlist, SMS-code, assessment, dubbele aanvragen en budget.
3. Netlify reserveert kosten en legt de opdracht duurzaam vast vóór provider-I/O. Bij een crash blijft de reservering bestaan.
4. Een eenmalig ticket (60 seconden, versleuteld, actuele goedkeuringsversie) gaat naar de n8n Provider Executor. Dit bevat geen API-sleutel of dossier.
5. n8n claimt het ticket bij Netlify. Eén geslaagde conditionele write consumeert het ticket; replay of concurrente claim faalt. Pas de geslaagde claim retourneert het specifieke providerverzoek.
6. n8n kiest Telnyx of de vaste GHL-scope en GET of POST. Eén poging, redirects uit, 15 seconden provider-timeout. De adapter valideert de response en slaat het receipt op.
7. Queue Worker vraagt elke 10 seconden dispatch/statuscontrole aan. Het verzoek bevat geen telefoonnummer en kan geen vrije callopdracht injecteren. Een bezette lease geeft 503; de volgende tick probeert de wachtrij opnieuw, niet dezelfde providerwrite.
8. Agenttools gebruiken een tijdelijke per-call capability. Alleen echte vrije slots worden aangeboden; boeken vereist bevestiging + eigen kalender + geverifieerd event-ID.

De Netlify-ledger bewaart dossiers zeven dagen en auditmetadata negentig dagen; suppressies bevatten alleen keyed telefoonhashes. Tickets wissen hun inhoud direct na claim/afsluiting; een afzonderlijke uurtaak ruimt na crashes verlopen inhoud op. Blobs-sterke consistentie/CAS is lokaal met een equivalent testdouble getest, nog niet tegen de productieaccount. Behoud externe activatieblokkade tot een gecontroleerde staging-concurrencytest dit bevestigt.

## Nog aansluiten (in deze volgorde)

1. **Telnyx-credential afgerond:** bestaande eigen `Telnyx Authorization` hergebruikt op expliciet akkoord, eigen nummer read-only geverifieerd. Geen nieuwe key nodig. Geen beperkte sleutelrechten claimen; de bestaande credential zelf is niet gewijzigd. Geen klantcredentials gebruiken. API-key niet in chat/Git/Netlify zetten. De importtemplates houden ongeldige credential-placeholders; maak bij herimport de goedgekeurde binding expliciet.
2. Eigen GHL-credential met kalender/contactrechten voor location `fs9MG3kXRVSIiWUig6yv`. Review agenda-notificaties en synchronisatie naar Tim. Bestaande kalender `UaWTV0sdETiXy0refclQ`, duur 30 minuten.
3. Twee nieuwe Header Auth secrets voor executor en worker; één vaste headernaam per credential, respectievelijk `X-Consultant-Executor` en `X-Consultant-Worker`. Veilige opslag in n8n + server-only Netlify runtime. Niet als workflowtekst opslaan.
4. Configureer Telnyx Verify-profiel, eigen TeXML-connection, account-ID, uitgaand nummer `+31850835827`, zes afzonderlijke assistants met taal/stem/model/tools en gepinde versie. Bestaande inbound Sales agent blijft intact. Gebruik `assistantManifest(locale, { serviceUrl: 'https://auto-pilots.io', voice, model, transport: 'n8n' })`.
5. Verifieer maximumkosten voor Verify en zes minuten telefonie + stem/model. USD 10 totaal per voortschrijdende 24 uur is goedgekeurd. Reserveringen blijven 0 en activatie uit tot maximumtarieven bekend zijn. Geen providerbrede stop voor andere diensten beloven.
6. Configureer `netlify.env.example` in de eigen Netlify-runtime. Het privétestnummer uit de chat hoort uitsluitend in `CONSULTANT_ALLOWED_PHONES`, niet in Git of de workflow.
7. Test zonder echte klantgegevens: ticket-replay, CAS, budget onder concurrency, kill switch, provider-timeout, geen dubbele boeking, zes locale-routes. Gebruik mocks; geen mockreceipt als livebewijs.
8. Complete website releasegate → review → beschermde main → Netlify → live release-identity controleren. Pas daarna de twee flows publiceren en private pilot inschakelen. Geen losse lokale productiedeploy.
9. **Laatste stap:** één expliciet aangevraagde proef op Tims toegestane testnummer, inclusief OTP, werkelijk gesprek, scancontext, juiste taal en echte afspraakreceipt. Geen eerdere SMS/calls.

## Noodstop / herstel

`CONSULTANT_ENABLED=false` stopt nieuwe betaalde opdrachten en ticketclaims. Ook workflows kunnen worden uitgezet. Actieve calls apart via Telnyx beëindigen; de zesminutenlimiet blijft gelden. Een onbekende provideruitkomst wordt nooit automatisch opnieuw verstuurd. Zoek read-only de providerreceipt en houd gereserveerde kosten/boekingslocks vast. Verander storage-encryptiesleutel niet zonder migratie/herstelplan. Geen terugval naar Render of onbeveiligde browser-direct-calls.

## Bewijsgrenzen

Lokale verificatie op 20 oktober: **60 platformtests + 61 website-unit/integratietests geslaagd**; TypeScript, ESLint en formatting van de nieuwe websitekoppeling geslaagd. Alle vijf uitvoerende Netlify-routes succesvol gebundeld voor Node 22, zonder SQLite-import. Synthetische ketentest doorloopt scan → SMS-bewijs → duurzame queue → eenmalige n8n-opdracht → nagebootste Telnyx-receipt → status, met een nieuwe ledgerinstantie per verzoek en precies één SMS/call in de mock. Geen externe provider aangeroepen. Website-releasegate, PR, merge en productie-identiteit zijn voor deze wijziging nog niet uitgevoerd/gecontroleerd.

Lokale tests zijn geen werkende telefoonaansluiting. Bestaande Telnyx-credential en toegang tot het eigen nummer zijn inmiddels read-only bewezen. Niet bewezen: nieuwe outbound-providerconfiguratie, stemmen, tarieven, daadwerkelijke GHL-synchronisatie, Netlify-deployment, echte call/SMS/afspraak. De privacy- en landentoets voor publieke beschikbaarheid en een providergevalideerde gesprekssamenvatting blijven aparte acceptatiepunten.

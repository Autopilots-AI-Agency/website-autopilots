# AI Telefoniste ROI-calculator

Status: publicatie door Tim aangevraagd op 18 november 2026. Releasebranch: `codex/ai-telefoniste-calculator-20261118`. Publicatie volgt uitsluitend na de volledige releasecontrole, pull-requestreview en beschermde main-merge. Route: `/calculator/` (Nederlands). De overige talen krijgen geen fictieve vertaling. Het bestaande AI-scanproces blijft ongewijzigd.

## Invoer en privacy

De door Tim gekozen voorbeeldinvoer is 3.000 factureerbare minuten, 85% zelfstandige afhandeling, 1 FTE, 40 uur/week, 100% telefonie en € 50 volledig werkgeversuurtarief. Dit zijn aanpasbare aannames, geen gemeten klantresultaten. Het door Tim opgegeven minuuttarief is € 0,29. Implementatie en maandbeheer beginnen leeg: de bezoeker vult het eigen voorstel in. Expliciete nulbedragen zijn toegestaan. De resetknop herstelt ook deze drie gekozen standaardwaarden.

De calculator verwerkt alleen getallen in de browser. Geen API, formuliertoezending, opslag, trackingevent met invoer of externe rekenservice. De bestaande algemene toestemmingsbanner blijft behouden.

De invoer loopt van huidige personeelskosten naar AI-inzet/minutenverbruik en daarna inrichting/vaste kosten. Het resultaatpaneel toont het aantal minuten × minuuttarief, de verbruikskosten, beheer, overige kosten en het maandtotaal expliciet boven de uitkomst. Implementatie wordt apart vermeld en niet bij het terugkerende maandbedrag opgeteld. Een bekend maandtotaal blijft zichtbaar als alleen de implementatie nog ontbreekt; er volgt dan nog geen terugverdientijd of jaarrendement. Het Animals Faith-caseblok is op verzoek verwijderd.

Het losse veld voor extra menselijke opvolging is op verzoek verwijderd. De website gebruikt hiervoor de modelstandaard 0; de bezoeker verwerkt controles en nazorg in het percentage volledig zelfstandige afhandeling. Het herbruikbare rekenmodel behoudt zijn expliciete opvolgingsparameter en bijbehorende tests. Het netto maandbedrag is groen bij een positieve waarde, rood bij een negatieve waarde en neutraal bij nul of onvolledige invoer. Het bedrag en minteken blijven ook tekstueel zichtbaar.

Het resultaat heeft één overzicht zonder de keuzes ‘Waarde van tijd’ en ‘Directe besparing’. De pagina berekent altijd capaciteitswaarde op basis van de eerder ingevulde antwoorden. Ook uren, terugverdientijd en jaarverloop rekenen automatisch mee. Er worden in het resultaat geen aanvullende percentages gevraagd. Vrijgespeelde tijd blijft uitdrukkelijk onderscheiden van daadwerkelijk lagere loonkosten. De cashvariant blijft alleen beschikbaar in het herbruikbare rekenmodel met eigen unittests, niet in de pagina.

Maand 1 is een conservatieve opstartfase: 50% van het ingestelde AI-afhandelingspercentage (bij 85% dus 42,5%). De ingevoerde belminuten, het minuuttarief en alle vaste maandkosten blijven volledig meetellen, zonder fictieve korting of automatisch gehalveerd verbruik. Eventuele expliciete menselijke opvolging in het rekenmodel blijft eveneens volledig meetellen. De tekst benoemt monitoring, bijsturing en het verhelpen van eventuele fouten als reden voor deze prognosemarge, niet als gegarandeerde prestaties vanaf maand 2. Het overzicht toont maand 1 apart; de hoofdmetrics en vergelijking gelden vanaf maand 2.

De zichtbare opstartuitleg is bewust kort: één zin, twee rijen met AI-afhandeling (maand 1 en vanaf maand 2) en één kostennoot. De aparte opstarturen en opstartwaarde zijn niet meer als extra metrics zichtbaar. Het rekenmodel blijft ongewijzigd. De statusmelding toont alleen ontbrekende invoer, fouten of relevante waarschuwingen; geen extra bevestigingsblok bij complete invoer.

Kleurcodering geldt afzonderlijk voor netto maandwaarde, netto voordeel jaar 1 en jaarlijks voordeel daarna: positief groen, negatief rood, nul/ontbrekend neutraal. Hoge implementatiekosten kunnen jaar 1 rood maken terwijl het jaarlijks voordeel daarna groen blijft. Kleuren volgen de eigen numerieke uitkomst, niet de kleur van een ander resultaat. Het rendementpercentage en de bijbehorende uitleg zijn op verzoek uit de pagina verwijderd; de procentberekening blijft alleen in het herbruikbare model en de unittests beschikbaar.

De copy is verder ingekort: geen herhaalde introducties onder de drie invoergroepen, kortere veldhulp, meldingen, resultaatnoten en CTA-tekst. De grafieknoot luidt: ‘Maand 1 halve AI-afhandeling, daarna het ingestelde percentage. Inclusief inrichting en volledige maandkosten.’ De onderscheidingen tijdwaarde/loonkosten en prognose/winst blijven zichtbaar. Rekenregels en uitsluitingen blijven in een gesloten detailblok; de rekenlogica verandert niet.

## Rekenmodel

- Beschikbare telefonie-uren = FTE × contracturen/week × 52 / 12 × telefonieaandeel.
- Vergelijkbare uren = minimum van factureerbare minuten / 60 en beschikbare telefonie-uren. Geen optelling van FTE-waarde en belminutenwaarde.
- Zelfstandig door AI = vergelijkbare uren × zelfstandig-afhandelingspercentage.
- Netto vrijgemaakte uren = maximaal 0, zelfstandig door AI minus extra menselijke opvolging. Bij meer opvolging dan automatisering wordt de extra arbeidswaarde wel als nadeel meegenomen.
- Resterend werk = vergelijkbare uren minus zelfstandig door AI plus extra menselijke opvolging.
- Werkgeversuurtarief = ingevoerd volledig tarief, of bruto uurloon × (1 + som van de expliciet ingevulde lastenpercentages / 100) + overige uurkosten. Geen stapeling of veronderstelde wettelijke percentages.
- Capaciteitswaarde = netto verandering in werklast × werkgeversuurtarief. Dit is geen automatische loonkostenbesparing.
- Directe besparing = verandering in arbeidswaarde × expliciet vermijdbaar aandeel. Bij ongewijzigde loonkosten is dat aandeel 0%. Dit geldt ook voor extra opvolging in deze mode.
- Maandelijkse AI-kosten = alle ingevoerde minuten × minuuttarief + maandbeheer + overige kosten.
- Netto maandvoordeel op deze pagina = capaciteitswaarde minus maandelijkse AI-kosten.
- Netto maand 1 = (vergelijkbare uren × AI-percentage × 50% minus opvolgingsuren) × uurtarief minus alle maandelijkse AI-kosten. Cashmodel vermenigvuldigt de arbeidswaarde bovendien met het expliciet vermijdbare aandeel.
- Terugverdientijd: gebruik eerst het netto resultaat van maand 1; dek het resterende bedrag vanaf maand 2 met het reguliere maandvoordeel. Rond naar boven af op een volledige maand. Bij geen positief regulier maandvoordeel is er geen terugverdientijd. Een negatieve opstartmaand telt ook bij € 0 implementatie als in te lopen tekort mee.
- Netto jaar 1 = netto maand 1 + 11 × regulier netto maandvoordeel minus implementatie.
- Jaarlijks daarna = 12 × netto maandvoordeel.
- Rendement jaar 1 = netto jaar 1 / (implementatie + 12 × AI-kosten) × 100%. Zonder kosten is het percentage niet van toepassing.

Geldbedragen worden intern op centen afgerond, behalve het expliciet ingevoerde minuuttarief. Presentatie op hele euro's; werkgeversuurtarief in de detailberekening op centen. De grafiek begint op minus implementatie en omvat maand 0–12. Het omslagpunt wordt uitsluitend getoond als het binnen twaalf maanden ligt.

Niet meegenomen: extra omzet, financiering, belastingen/btw, aanvullende opstartvertraging buiten de expliciete opstartmaand, ziekte en eventuele uitstroomkosten. Geen winstgarantie, automatische FTE-vervanging of claim over tarieven voor doorschakeling.

## Controle

- `npm test`: volledige unit- en integratiesuite, inclusief de calculator.
- `npm run typecheck`, `npm run format:check`, `npm run lint`.
- `npm run build`, `npm run test:release`.
- `AP_TEST_PORT=4433 npx --no-install playwright test tests/e2e/phone-calculator.spec.ts --workers=2`: desktop en mobiel, één automatisch meerekenend overzicht zonder tweede voordeelkeuze, voorbeeldberekening, ontbrekende/ongeldige invoer, nulwaarden, personeelslimiet, kostenopbouw, reset, geen POST-verkeer, branche-eerste AI-scan, WCAG en overflow op 320/390/768/1440 px.

## Publicatie

Publiceer uitsluitend na expliciet akkoord via de projectreleaseprocedure: actuele branch, volledige releasegate, review, beschermde main-merge, Netlify-deployment en live release-identiteit. Een lokale preview of branch is niet live. De bestaande productie is niet gewijzigd.

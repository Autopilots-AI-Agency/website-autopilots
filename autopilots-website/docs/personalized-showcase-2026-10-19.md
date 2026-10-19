# Branchegerichte homepage-showcase

## Scope

De root- en Nederlandse homepage krijgen een optionele branchekeuze vóór de
bestaande scrollshowcase. Zes redactioneel beheerde profielen veranderen de
voorbeeldgesprekken, software-inhoud, conceptwebsite, driedimensionale scène,
beheeromgeving en verbindingsstappen samen. Andere talen en SEO-routes behouden
hun bestaande inhoud. Geen wijzigingen aan providerconfiguratie of e-mail.

Profielen: autobedrijven, bouw & renovatie, installatiebedrijven, vastgoed &
makelaars, zakelijke dienstverlening en beauty & salons. De bestaande
intakebranches blijven beschikbaar. Niet uitgewerkte branches tonen expliciet
een algemeen voorbeeld; er wordt geen branchekennis of live functionaliteit
gesuggereerd. Alle scènes zijn illustratieve demo's, geen echte aanvragen.

## Gedrag en grenzen

- Eén gekozen branche stuurt de drie bestaande panelen aan; geen nieuwe
  scroll-engine, iframe of externe assetdienst.
- De branche en optionele bedrijfsnaam worden uitsluitend in sessionStorage van
  de huidige browsertab bewaard. Blokkering of ongeldige opgeslagen gegevens
  hinderen de werking niet. Invoer wordt escaped of via textContent gezet.
- Selecteren maakt geen lead aan en doet geen netwerk- of providerverzoek.
- De AI-scan ontvangt alleen een gevalideerde branche via de bestaande
  branche-queryparameter. De bedrijfsnaam komt niet in de URL. De scan start
  daarna bij vraag twee; Terug laat de branche wijzigen.
- De achterkant van iedere conceptwebsite blijft lokaal bewerkbaar. Wijzigingen
  daarin zijn tijdelijke demo-aanpassingen, geen publicatie.
- Algemeen voorbeeld en later wijzigen blijven altijd beschikbaar. Bij minder
  beweging verschijnen de uitgewerkte scènes zonder scroll-afhankelijke reveal;
  de handmatige bediening blijft werken.

## Controle

Automatische browsertests controleren alle zes profielen, verschillende canvas-
uitkomsten, opnieuw koppelen van knoppen na wisselen, keyboard/toegankelijkheid,
mobiel, CSS-overlap, lange en HTML-achtige invoer, sessieherstel, ontbrekende
storage, algemene fallback en branche-overdracht naar de scan. Bestaande
scroll-, flip-, route-, link-, metadata- en releasecontroles blijven verplicht.

Publicatie alleen via de gewone pull-request/releaseprocedure. Deze notitie
is geen bewijs dat de wijziging al live staat; daarvoor moet de live
release-identiteit overeenkomen met de gemergede commit.

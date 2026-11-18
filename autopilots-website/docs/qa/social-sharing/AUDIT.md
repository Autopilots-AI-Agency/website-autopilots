# Social share metadata — audit en herstel, 18 november 2026

## Vastgestelde toestand vóór herstel

Live release: `894349680bfb1a6a858f1d621dde85c452155fe9`, Netlify deploy
`6afc30c10c0aaaa01b999285`. Het ruwe HTTP-bewijs staat in `before.json`.

De homepage leverde server-side:

| Veld | Waarde |
| --- | --- |
| og:title / twitter:title | Autopilots \| Bouw wat jouw bedrijf nodig heeft |
| description / og:description / twitter:description | Wij bouwen AI-medewerkers, maatwerksoftware en websites voor het mkb. Los inzetbaar. Sterker wanneer ze samenwerken. |
| canonical / og:url | https://auto-pilots.io/ |
| og:image / twitter:image | https://auto-pilots.io/og/autopilots-og.svg |
| twitter:card | summary_large_image |
| og:image width/height/type/alt | Ontbraken |

De SVG geeft HTTP 200 met `Content-Type: image/svg+xml` terug en bevat
Autopilots-branding, geen Animals Faith. De eerste gewone `<img>` in de homepage
is `/samenwerkingen/animals-faith.png`. Het woordmerk bovenaan is geen gewone
bitmapafbeelding die als betrouwbaar alternatief kan worden gekozen.

Dezelfde SVG werd gebruikt op `/nl/`, producten, crew, kennisbank, afspraak,
autobedrijven en de Engelse en Franse homepage. De crawlernamen LinkedInBot,
facebookexternalhit, Twitterbot en WhatsApp kregen alle HTTP 200 en dezelfde
metadata. Robots.txt staat crawlen toe. Er is geen botafhankelijke vervanging
naar Animals Faith vastgesteld. Campagne- en intake-layouts hadden nog geen
OG-/Twitter-afbeelding. Het BlogPosting-schema bevatte eveneens de oude SVG.

## Reproductie in LinkedIn zelf

Vóór publicatie van deze wijziging is `https://auto-pilots.io/` opnieuw opgehaald
in de ingelogde LinkedIn Post Inspector. De inspector meldde "Last scraped: a
few seconds ago", de actuele titel en beschrijving, de juiste canonical en een
Animals Faith-thumbnail. De redirectinformatie meldde `206 Success` voor dezelfde
URL. De geselecteerde afbeelding wees naar een door LinkedIn opgeslagen
`media.licdn.com/.../articleshare-shrink_480/...` afbeelding. Er werd een tweede
LinkedIn-afbeelding als alternatief getoond; de SVG stond niet als bruikbare
selectie vermeld.

Daarmee is bevestigd dat het probleem ook bij opnieuw ophalen optreedt; uitsluitend
een oude titelcache verklaart het niet. De screenshot van de gebruiker heeft
bovendien een oudere titel dan de actuele site, dus die specifieke bestaande
Uitgelicht-kaart bevat ook historische previewgegevens.

De onderbouwde technische verklaring is: er is wel een og:image, maar die is een
SVG; LinkedIn gebruikt die niet en toont in plaats daarvan een gewone afbeelding
van de homepage, namelijk Animals Faith. De interne reden/code waarmee LinkedIn
de SVG heeft afgewezen is niet zichtbaar. We onderscheiden daarom de bewezen
selectie van de afgeleide formaatverklaring. Er is nergens een expliciete
Animals Faith-og:image-configuratie gevonden.

## Uitgevoerde wijziging

- De door de gebruiker aangeleverde `Autopilots logo.webp` is ongewijzigd bewaard
  als `/og/autopilots-logo.webp` en gebruikt als Organization-logo.
- Een gecentreerde 1200 × 630 PNG-uitsnede van datzelfde originele bestand is
  `/og/autopilots-social-20261118.png`. Geen logohertekening of gegenereerde tekst.
- Eén gedeeld SocialMetadata-component en één configuratie leveren de publieke
  absolute HTTPS-afbeelding aan BaseLayout, CampaignLayout, intake en projectstart.
- Zowel OG als Twitter hebben title, description, image en alt. OG heeft bovendien
  site_name, secure_url, MIME-type, width en height. De card blijft summary_large_image.
- Titels en beschrijvingen blijven pagina- en taalgebonden. Canonical en og:url
  zijn gelijk; noindex-instellingen blijven behouden.
- Het kennisbankschema verwijst naar de PNG. De oude SVG blijft als bestaand
  publiek bestand bereikbaar voor oudere verwijzingen, maar wordt niet meer in
  actuele headmetadata of structured data gebruikt.
- De bestaande releasecontrole controleert alle niet-redirectpagina's op precies
  één correcte set metadata, publieke canonical en een echte PNG van 1200 × 630
  onder 5 MB. Zo kan een SVG-fallback niet ongemerkt terugkomen.
- Geen vergrendeld funnelbestand, funnelcontract of releasebewaking gewijzigd.

## Cache en verificatie

Na een bewezen live release de root-URL en relevante subpagina's opnieuw ophalen
via https://www.linkedin.com/post-inspector/. Inspector werkt alleen previews
voor nieuwe posts bij; bestaande posts houden volgens LinkedIn hun oude preview.
Een bestaande Uitgelicht-kaart eventueel opnieuw toevoegen nadat de inspector het
Autopilots-logo toont. De kaart is in deze taak niet verwijderd of aangepast.
Facebook kan worden ververst via https://developers.facebook.com/tools/debug/.
WhatsApp en X hebben eigen caches; de nieuwe bestandsnaam voorkomt hergebruik van
de oude afbeeldings-URL. Er zijn geen social posts of berichten verstuurd.

Bronnen:
- https://www.linkedin.com/help/linkedin/answer/a1322434
- https://www.linkedin.com/help/linkedin/answer/a6233775

Publicatie en verificatie worden afzonderlijk bewezen met gemergede main-commit,
Netlify release-identiteit en live HTTP-metadata; lokale checks zijn geen bewijs
van publicatie. Native Facebook-, WhatsApp- en X-previews blijven afzonderlijke
platformchecks en worden niet gelijkgesteld aan succesvolle HTTP-crawlerchecks.

## Bestandsintegriteit

- `autopilots-logo.webp`: 704550 bytes; SHA-256 `1be945cbf7697860df6da1b7d32f98d0dd3e5285e991ec38bdbe59464573b43d`.
- `autopilots-social-20261118.png`: 638750 bytes; SHA-256 `46780a9361bea8193f7cb68a48065baea07425a89f21402cdef015374bae7e62`.

## Lokale verificatie vóór pull request

- Volledige build: 414 pagina's; 14.926 interne links en alle deelmetadata gecontroleerd.
- Formatter, lint, TypeScript en 77 unit-/integratietests geslaagd.
- Browserreeks: 162 geslaagd, 2 bestaande skips; desktop en mobiel.
- De branch is vervolgens bijgewerkt naar actuele main `c9e3ba1` (afzonderlijke
  portretwijziging). Die wijziging blijft behouden. Nieuwe build/releaseverificatie
  en GitHub-releasechecks bewaken de gecombineerde toestand.
- Het ontbreken van een release-SHA in een eerste lokale build werd terecht
  afgewezen door release:verify. De definitieve verificatie gebruikt expliciet de
  actuele commit-SHA; er is geen guard omzeild.

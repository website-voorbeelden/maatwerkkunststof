# MaatwerkKunststof.nl

SEO-first offertewebsite voor kunststof maatwerk. Gebouwd met Eleventy, geschikt voor GitHub en Cloudflare Pages Functions. Offerteaanvragen worden via Resend verstuurd.

## Lokaal starten

```bash
npm install
npm run dev
```

De website is daarna beschikbaar via het lokale adres dat Eleventy in de terminal toont.

## Productiebuild

```bash
npm run build
```

De statische website komt in `_site/`.

## Cloudflare Pages instellen

Gebruik bij het aanmaken van het Cloudflare Pages-project:

- Framework preset: **Eleventy**
- Build command: `npm run build`
- Build output directory: `_site`
- Root directory: leeg laten
- Node.js: 20 of hoger

De map `functions/` wordt automatisch als Cloudflare Pages Functions gebruikt. De offertefunctie wordt bereikbaar via `/api/offerte`.

## Resend instellen

1. Verifieer `maatwerkkunststof.nl` in Resend.
2. Maak een Resend API-key met alleen verzendrechten.
3. Open in Cloudflare Pages: **Settings → Variables and Secrets**.
4. Voeg voor Production en Preview toe:

```text
RESEND_API_KEY       secret
OFFERTES_TO_EMAIL    adres waar aanvragen binnenkomen
OFFERTES_FROM_EMAIL  MaatwerkKunststof.nl <offerte@maatwerkkunststof.nl>
SEND_CONFIRMATION    true
```

Zet de API-key nooit in GitHub, `site.json` of JavaScript in de browser.

## Google Tag Manager / Google Ads

Vul later in `src/_data/site.json` het GTM-ID in:

```json
"tracking": {
  "gtmId": "GTM-XXXXXXX"
}
```

De website stuurt al deze `dataLayer`-events:

- `quote_cta`
- `quote_form_submit`
- `quote_form_success`
- `email_click`

Gebruik bij voorkeur `quote_form_success` op `/bedankt/` als primaire Google Ads-conversie. UTM-velden, GCLID, GBRAID en WBRAID worden automatisch aan de offerte-e-mail toegevoegd.

## Voor publicatie aanpassen

- Controleer het ontvangstadres en afzenderadres.
- Vul definitieve bedrijfsgegevens in het privacybeleid aan.
- Voeg alleen een telefoonnummer toe wanneer dit actief wordt gebruikt.
- Controleer alle teksten op levertijden of garanties voordat die later worden toegevoegd.
- Dien `https://maatwerkkunststof.nl/sitemap.xml` in via Google Search Console.

## Nieuwe SEO-pagina toevoegen

Maak een map onder `src/`, bijvoorbeeld:

```text
src/kunststof-bussen-op-maat/index.njk
```

Gebruik `layout: base.njk`, een unieke title, description, H1 en pagina-inhoud. Voeg de pagina alleen aan de navigatie toe als deze belangrijk genoeg is voor het hoofdmenu; voor nichepagina's zijn contextuele interne links meestal beter.

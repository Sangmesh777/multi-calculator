# Multi-Calculator — website

A static website: a landing page plus the calculator app. Plain HTML, CSS and
JavaScript. No framework, no dependencies, no build step.

## Run it

Open `index.html` in a browser. That's it.

For a local server (recommended, because `file://` blocks the currency fetch in
some browsers):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy it

It's static, so anything that serves files works. No build, no config.

- **GitHub Pages** — push the folder, then Settings → Pages → deploy from branch,
  root. Done.
- **Netlify / Vercel / Cloudflare Pages** — drag the folder in, or point it at the
  repo. Leave the build command empty and the publish directory as `.`.
- **Any web host** — upload the folder contents to the web root over FTP/SFTP.

## Structure

```
site/
├── index.html          landing page — hero, feature grid, why
├── app.html            the calculator (six tools)
├── 404.html            not-found page
├── favicon.svg         icon
├── README.md           this file
└── assets/
    ├── site.css        all styling + the three themes
    ├── site.js         theme picker + current-page nav marking
    └── app.js          all calculator logic
```

`app.js` is loaded only by `app.html`. The landing page needs no calculator code.

## Pages

**index.html** — landing. Hero with a static preview of the calculator, a card
for each of the six tools, and three notes on how it's built. Every call to
action goes to `app.html`.

**app.html** — the calculator itself, in six tabs:

| Tab | What it does |
|---|---|
| Calculator | Scientific expressions — powers, roots, trig, factorials, percentages, history |
| Health | BMI (WHO bands), BMR, TDEE; metric or imperial |
| Finance | Loan EMI, GST in either direction, SIP maturity |
| Units | 8 categories — length, mass, area, volume, speed, time, data, temperature |
| Currency | 42 currencies with live rates, offline fallback, ₹ cash counter |
| Dates | Days between dates, add/subtract days |

## Themes

Three: **Dark** (default), **Light**, and **Glass** (glassmorphism — frosted
translucent panels over a colour gradient). The picker is in the header on every
page. The choice is stored in `localStorage` under `mc_theme`, so it carries
across pages and visits.

Themes are CSS custom properties. `:root` holds dark; `body.light` and
`body.glass` redefine the same variables. Glass adds `backdrop-filter` rules on
top, because blur isn't expressible as a variable.

## Testing

The calculator carries its own tests. Open `app.html#test` and read the browser
console — 26 checks, each `ok` or `FAIL` with the produced and expected value.
They cover the expression parser (precedence, right-associative `^`, unary
minus, factorial, percent, degrees vs radians), BMI/BMR/TDEE, EMI, GST both
ways, SIP, unit conversions and currency conversion.

There is no test runner: the app has no tooling, and the tests travel with it.

## Editing

| To change | Edit |
|---|---|
| Colours, spacing, layout | `assets/site.css` — variables at the top |
| Any calculation | `assets/app.js` — one function per tool |
| Add a unit | `UNITS` in `app.js` — one line per unit, the dropdown updates itself |
| Add a currency | `CURR` in `app.js`, plus a rate in `SNAPSHOT` for offline |
| Add a theme | `body.<name>` variables in `site.css`, plus the name in `THEMES` in `site.js` and an `<option>` in each page's header |
| Landing copy | `index.html` |

## Privacy

Everything runs in the browser. Nothing is sent anywhere except the currency
rate fetch, which goes to a public CDN with no key and no account. Theme and
calculator history live in your own `localStorage` and never leave the device.

## Known limits

- Health figures are population estimates, not medical advice.
- SIP projections assume a constant return.
- Currency rates are only as fresh as the last successful fetch; offline, a
  dated snapshot applies.
- Glassmorphism needs `backdrop-filter`; browsers without it show flat
  translucent panels instead of blurred ones.
- No analytics, no search, no sitemap — it's a small static site, not a content
  site.

# True Tree Care

A tree care website plus four browser-based arboriculture tools, built around one
question: **is this tree an asset or a liability?**

Everything is static HTML, CSS and vanilla JavaScript. No build step is required to
deploy, no server, no database, no accounts, and no data leaves the visitor's browser.

---

## What's in here

### The site
| Page | Purpose |
|---|---|
| `index.html` | Home — the liability-vs-asset thesis and the platform |
| `services.html` | Risk assessment, pruning, plant health care, planting, construction protection |
| `about.html` | Credentials, standards worked to, and the honest limits of the tools |
| `platform.html` | Hub for the four tools |
| `contact.html` | Assessment request form |

### The platform

**`app/risk.html` — Liability vs. Asset assessment**
Two analyses producing one verdict. The risk half implements the three-part structure the
ISA risk assessment framework uses — likelihood of failure, likelihood of impacting a
target, consequences — through both published matrices, and highlights the cell you landed
in. The value half is a ledger: condition, remaining useful life, canopy contribution,
functions delivered, structural defects, maintenance burden, infrastructure conflict, and
whether the species itself is the problem. Output is a verdict, both columns itemized, a
rough annual ecosystem-service value, and a prioritized action list. Prints to PDF.

**`app/planting.html` — Planting guide by ZIP code**
A ZIP prefix resolves to an approximate USDA hardiness zone, planting region and moisture
regime. Every species in the database is then scored against the site the user describes:
overhead lines, planting strip width, drainage, pH, salt exposure, setback from structures,
light, compaction, and purpose. Hard failures are excluded *with the reason stated*;
everything else is ranked and every card explains its own score. Results name specific
cultivars, and a "do not plant here" list covers the locally common liabilities.

**`app/study.html` — ISA Certified Arborist study guide**
Thirteen knowledge domains with key points and terminology, 90 flashcards, and a
79-question practice bank where every answer carries an explanation. Answer choices are
shuffled per session, so a repeat user cannot learn the position instead of the content.
Sessions are scored per domain and tell you where to spend the next hour.

**`app/plot.html` — TreePlot GPS**
Field inventory. Captures position from the device GPS (with the accuracy radius recorded)
or from a map tap, alongside species, DBH, condition, risk and notes. Live 10-20-30
diversity checking. Exports GeoJSON and CSV, and imports GeoJSON back.

---

## Repository layout

```
index.html  services.html  about.html  platform.html  contact.html
app/        risk.html  planting.html  study.html  plot.html
assets/css/ main.css        design system, light + dark
            app.css         platform tools, print styles
assets/js/  site.js         nav, storage helpers, tabs, CSV/file download
            risk.js         risk matrices + value ledger
            planting.js     species scoring against a resolved site
            study.js        reference / flashcards / practice exam
            plot.js         GPS capture, map, inventory, import/export
            contact.js      mailto composition
data/       species.js      79 taxa with cultivars, tolerances, asset/liability cases
            zones.js        186 ZIP-prefix ranges → zone, region, moisture
            study.js        13 domains, 90 flashcards, 79 questions
src/        page body fragments (the editable source of each page)
tools/      build.py        stitches fragments into the shared shell
docs/       DEPLOY.md  DATA.md
```

### Editing pages

The nine `.html` files at the top level and in `app/` are **generated** and committed, so
the site deploys with no build step. Don't hand-edit them — edit the matching fragment in
`src/` and regenerate:

```bash
python3 tools/build.py
```

Each fragment starts with a small metadata block (`title:`, `desc:`, `out:`, `css:`, `js:`),
then a blank line, then the page body. The shared `<head>`, header and footer live in
`tools/build.py`.

---

## Running it

Any static file server. Geolocation in TreePlot requires HTTPS (or `localhost`).

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

See `docs/DEPLOY.md` for GitHub Pages, Netlify and custom-domain notes, plus the
**pre-launch checklist** of placeholders that must be replaced.

---

## Before you publish

The site ships with deliberate placeholders. Replace these:

- **Arborist name and ISA certification number** in `src/about.html`, so clients can verify
  the credential in ISA's public directory. An unverifiable claim is worth less than none.
- **Contact email** — `TO_ADDRESS` at the top of `assets/js/contact.js`.
- **Service area, phone and business details** in the footer (`tools/build.py`) and
  `src/contact.html`.

Then run `python3 tools/build.py` and redeploy.

---

## Accuracy and scope

This matters more than the feature list.

- **ZIP → hardiness zone is approximate.** A ZIP3 prefix covers a wide area. Elevation,
  urban heat island, large water bodies and cold-air drainage shift the real zone by half a
  zone or more, and **soil pH cannot be predicted from a ZIP code at all**. The tool says so
  on every result. Treat it as a starting filter for a species list, then soil-test.
- **The species database is curated, not exhaustive.** 79 taxa chosen to cover the major US
  regions and, deliberately, the common liability trees. It is not a substitute for regional
  extension guidance or a state invasive species list — always check the latter before
  specifying anything.
- **The tools structure a judgment; they do not make one.** No web form can see a root plate
  lifting, sound a hollow stem with a mallet, or read a grade change made fifteen years ago.
- **The study material is original and is not ISA content.** It is organized around the ISA
  Certified Arborist knowledge domains but it is not endorsed by or affiliated with ISA, and
  it is not a substitute for the official study guide or supervised field experience. The
  domain percentages shown are this platform's study-time guidance, not exam weightings.

---

## Browser support and privacy

Modern evergreen browsers. The site itself works with JavaScript disabled — only the tools
need it. TreePlot needs an internet connection for map tiles and degrades to a usable
non-map mode without one.

Study progress and plotted trees are stored in `localStorage` under the `ttc:` prefix. That
data stays on the device, is never transmitted, and **is lost if site data is cleared** —
which is why TreePlot exports GeoJSON and CSV. There is no analytics on the tools.

The only third-party requests are Leaflet from cdnjs and OpenStreetMap tiles, both on
`app/plot.html` only.

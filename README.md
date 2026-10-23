# Seed

Free, offline-capable browser tools for arborists, built around one question:
**is this tree an asset or a liability?**

Everything is static HTML, CSS and vanilla JavaScript. No build step is required to
deploy, no server, no database, no accounts, and no data leaves the visitor's browser.

---

## What's in here

### The site
| Page | Purpose |
|---|---|
| `index.html` | What Seed is and the four tools |
| `tools.html` | Hub for the four tools |
| `reference.html` | Practice notes: risk assessment, pruning, PHC, selection, construction protection |
| `about.html` | What Seed is and isn't, standards, and the limits of a browser tool |
| `feedback.html` | Report an issue or contribute data |

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
diversity checking. Exports GeoJSON and CSV, and imports GeoJSON back. Can save the current
map view for offline use before you drive out to a site with no signal.

---

## Repository layout

```
index.html  tools.html  reference.html  about.html  feedback.html
app/        risk.html  planting.html  study.html  plot.html
sw.js       GENERATED service worker — edit tools/sw-template.js
manifest.webmanifest
assets/css/ main.css        design system, light + dark, toasts
            app.css         platform tools, print styles
assets/js/  site.js         nav, storage, tabs, SW registration, offline badge
            risk.js         risk matrices + value ledger
            planting.js     species scoring against a resolved site
            study.js        reference / flashcards / practice exam
            plot.js         GPS capture, map, inventory, offline tiles, export
            feedback.js     mailto composition
assets/img/ PWA icons (generated from the brand mark)
assets/vendor/leaflet/  Leaflet 1.9.4, vendored — no CDN at runtime
data/       species.js      79 taxa with cultivars, tolerances, asset/liability cases
            zones.js        186 ZIP-prefix ranges → zone, region, moisture
            study.js        13 domains, 90 flashcards, 79 questions
src/        page body fragments (the editable source of each page)
tools/      build.py             stitches fragments, generates sw.js
            sw-template.js       service worker source
            vendor-leaflet.sh    re-vendor Leaflet from npm (integrity-pinned)
docs/       DEPLOY.md  DATA.md
```

### Editing pages

The nine `.html` files at the top level and in `app/`, plus `sw.js`, are **generated** and
committed, so the site deploys with no build step. Don't hand-edit them — edit the matching
fragment in `src/` (or `tools/sw-template.js`) and regenerate:

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

## Before you publish your own copy

Seed has no company behind it and nothing to fill in about one. Two things are
deployment-specific:

- **Feedback destination** — `TO_ADDRESS` at the top of `assets/js/feedback.js`, or point
  the form at an issue tracker. See `docs/DEPLOY.md`.
- **The "Deploying your own copy?" notice** in `src/feedback.html`, if you are publishing a
  fork rather than contributing upstream.

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
need it. The service worker requires HTTPS (or `localhost`); without it everything still
works, just without offline support. TreePlot degrades to a usable non-map mode when the
map library or tiles are unavailable.

Study progress and plotted trees are stored in `localStorage` under the `seed:` prefix (data
saved under the project's former `ttc:` prefix is migrated across automatically, once). That
data stays on the device, is never transmitted, and **is lost if site data is cleared** —
which is why TreePlot exports GeoJSON and CSV. There is no analytics on the tools.

The only cross-origin request the site makes is OpenStreetMap map tiles, on `app/plot.html`
only. Leaflet is vendored locally, and there is no CDN, font host, or analytics call
anywhere on the site.

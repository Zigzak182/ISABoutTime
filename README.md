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
diversity checking. Exports GeoJSON and CSV, and imports GeoJSON back. Can save the current
map view for offline use before you drive out to a site with no signal.

---

## Repository layout

```
index.html  services.html  about.html  platform.html  contact.html
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
            contact.js      mailto composition
assets/img/ PWA icons (generated from the brand mark)
data/       species.js      79 taxa with cultivars, tolerances, asset/liability cases
            zones.js        186 ZIP-prefix ranges → zone, region, moisture
            study.js        13 domains, 90 flashcards, 79 questions
src/        page body fragments (the editable source of each page)
tools/      build.py             stitches fragments, generates sw.js
            sw-template.js       service worker source
            vendor-leaflet.sh    self-host Leaflet (removes the last CDN call)
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

## Before you publish

The site ships with deliberate placeholders. Replace these:

- **Arborist name and ISA certification number** in `src/about.html`, so clients can verify
  the credential in ISA's public directory. An unverifiable claim is worth less than none.
- **Contact email** — `TO_ADDRESS` at the top of `assets/js/contact.js`.
- **Service area, phone and business details** in the footer (`tools/build.py`) and
  `src/contact.html`.

Then run `python3 tools/build.py` and redeploy.

---

## Offline and installable

The site is a PWA. `sw.js` precaches the whole app — all nine pages, the CSS, the JS and
the three data files — so every tool works with no connection at all: the ZIP planting
guide, the risk assessment, the study guide, and TreePlot's capture, list and export.

**`sw.js` is generated, and its version is a SHA-256 over the bytes of everything it
precaches.** Any content change produces a new version and retires the old cache
automatically. Hand-maintained cache versions drift, and a stale service worker is the
worst failure mode an offline app has.

Three caches, deliberately separated:

| Cache | Lifetime | Contents |
|---|---|---|
| `ttc-shell-<hash>` | Retired on every deploy | Pages, CSS, JS, data, icons |
| `ttc-tiles-v1` | Survives deploys | Map imagery, capped at 3000 tiles (~45 MB), trimmed FIFO |
| `ttc-vendor-v1` | Survives deploys | Leaflet, when loaded from the CDN |

Tiles survive deploys on purpose: a crew that cached a work area should not lose it
because someone shipped a copy edit.

Strategies are matched to the content. Navigations are network-first with a 3.5 s deadline
(a field connection that is *present but useless* is worse than none — without a deadline
every navigation hangs until TCP gives up) falling back to cache, then to the home page.
Static assets are cache-first with background revalidation. Tiles are cache-first, and a
missing tile offline returns a transparent 1×1 so Leaflet's grid stays intact instead of
filling with broken-image icons.

### Saving map areas

TreePlot's **Save map area offline** button caches the current view plus two zoom levels in,
so the map still draws with no signal. It is capped at 1200 tiles per request, because the
OpenStreetMap Foundation's tile servers are donated infrastructure and bulk downloading is
against their usage policy — zoom in and save a couple of smaller areas instead.

### Removing the last third-party request

TreePlot loads Leaflet from cdnjs, which is a real weakness for an offline tool: a crew that
installs the app at the office and drives somewhere with no signal depends on that library
having been cached. The service worker warms it at install time to cover that, but the
robust fix is to self-host:

```bash
tools/vendor-leaflet.sh    # downloads Leaflet into assets/vendor/
python3 tools/build.py     # detects it and switches the page + precache over
```

After that the site makes **no cross-origin requests at all** except map tiles.

### Updating

When a new version is deployed, the next visit shows a "A new version is ready — Reload"
prompt rather than swapping content underneath someone mid-assessment. Nothing reloads
unless the user asks.

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

Study progress and plotted trees are stored in `localStorage` under the `ttc:` prefix. That
data stays on the device, is never transmitted, and **is lost if site data is cleared** —
which is why TreePlot exports GeoJSON and CSV. There is no analytics on the tools.

The only third-party requests are Leaflet from cdnjs and OpenStreetMap tiles, both on
`app/plot.html` only.

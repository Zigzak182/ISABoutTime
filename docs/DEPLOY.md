# Deploying True Tree Care

The site is static. Any host that serves files will do.

---

## Pre-launch checklist

Do these first. Everything here is a placeholder shipped on purpose.

- [ ] **`src/about.html`** — replace the "Before you publish" notice with the certifying
      arborist's name and ISA certification number. Clients can then verify it in ISA's
      public credential directory. An unverifiable claim is worth less than no claim.
- [ ] **`assets/js/contact.js`** — set `TO_ADDRESS` to the real inbox.
- [ ] **`tools/build.py`** — footer: service area, phone, and remove the
      "Set your service area…" note.
- [ ] **`src/contact.html`** — replace the "Deploying this site?" notice block, and put a
      real phone number in the emergency callout.
- [ ] Run `python3 tools/build.py` and commit the regenerated pages.
- [ ] Confirm the site is served over **HTTPS** — TreePlot's geolocation will not run
      without it.

---

## GitHub Pages

The repository root is already the site root, so Pages can serve the branch directly.

**Settings → Pages → Build and deployment → Deploy from a branch**, pick the branch and
`/ (root)`. Done — no workflow needed.

If you'd rather deploy through Actions (useful once you add checks), a minimal workflow:

```yaml
name: Deploy to Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deploy.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - name: Verify generated pages match src/
        run: |
          python3 tools/build.py
          git diff --exit-code -- '*.html' \
            || (echo "::error::Generated pages are stale — run tools/build.py and commit." && exit 1)
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - id: deploy
        uses: actions/deploy-pages@v4
```

That `git diff --exit-code` step is the useful part: it fails the build if someone edits a
generated `.html` by hand instead of the `src/` fragment.

---

## Netlify / Vercel / Cloudflare Pages

- **Build command:** `python3 tools/build.py` (or leave empty — the pages are committed)
- **Publish directory:** `.`

---

## Custom domain

1. Point an `A`/`ALIAS` record (apex) or `CNAME` (`www`) at the host.
2. On GitHub Pages, add a `CNAME` file at the repository root containing the bare domain.
3. Enable "Enforce HTTPS" once the certificate is issued.

---

## The contact form

The form composes a `mailto:` message, because a static site has nowhere to POST. That is
fine for low volume, but it depends on the visitor having a mail client configured and it
loses anyone who doesn't.

To receive submissions properly, pick a form service and swap the submit handler in
`assets/js/contact.js`:

```js
form.addEventListener("submit", async function (e) {
  e.preventDefault();
  const res = await fetch("https://your-form-endpoint", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(Object.fromEntries(new FormData(form)))
  });
  document.getElementById("contactHint").textContent =
    res.ok ? "Sent. We'll be in touch." : "Something went wrong — email us directly.";
});
```

Every input already carries a `name` attribute, so `FormData` picks them all up.

Netlify Forms is even simpler: add `netlify` and `name="contact"` to the `<form>` tag in
`src/contact.html` and delete the JS handler.

---

## Offline / field use

TreePlot needs the network for Leaflet and map tiles. Without it the map area shows an
explanatory message and **GPS capture, the inventory list, stats and export all still
work** — so a crew in a dead zone can still collect data and export it later.

To make the whole site installable and genuinely offline-capable, add a service worker
precaching the HTML, CSS, JS and `data/*.js`, plus a web app manifest. The site has no
server dependency, so nothing else has to change.

---

## Third-party requests

Only `app/plot.html` reaches off-site:

| Resource | Host |
|---|---|
| Leaflet 1.9.4 CSS + JS | `cdnjs.cloudflare.com` |
| Map tiles | `*.tile.openstreetmap.org` |

If you need a strict Content-Security-Policy or want zero third-party requests, vendor
Leaflet into `assets/vendor/` and self-host tiles or switch to a commercial tile provider.

**OpenStreetMap tile usage policy:** the public tile servers are for light use only.
Attribution is already rendered on the map. If TreePlot gets real traffic, move to a
proper tile provider — the OSM Foundation's servers are donated infrastructure.

Consider adding Subresource Integrity to the Leaflet tags once you can generate the
hashes on a networked machine:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"
        integrity="sha512-…" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
```

# Deploying Seed

The site is static. Any host that serves files will do.

---

## Pre-launch checklist

Seed has no company details to fill in. Only two things are deployment-specific:

- [ ] **`assets/js/feedback.js`** — set `TO_ADDRESS` to the inbox that should receive
      reports, or replace the submit handler with a POST to an issue tracker.
- [ ] **`src/feedback.html`** — replace the "Deploying your own copy?" notice if you are
      publishing a fork.
- [ ] Run `python3 tools/build.py` and commit the regenerated pages **and `sw.js`**.
- [ ] Confirm the site is served over **HTTPS** — the service worker and TreePlot's
      geolocation both refuse to run without it.

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
`assets/js/feedback.js`:

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

Netlify Forms is even simpler: add `netlify` and `name="feedback"` to the `<form>` tag in
`src/feedback.html` and delete the JS handler.

---

## Offline / field use

The site ships a service worker (`sw.js`) and a web app manifest, so it installs to a home
screen and every tool works with no connection.

**Requirements:**

- **HTTPS.** Service workers and geolocation both refuse to run otherwise (`localhost` is
  exempt for development). GitHub Pages, Netlify and Cloudflare Pages all provide it.
- **`sw.js` must be served from the site root.** A worker's scope cannot exceed its own
  directory, and the app spans `/` and `/app/`. The build writes it to the root already —
  don't move it into `assets/`.

**Do not put a long cache lifetime on `sw.js`.** Browsers bypass the HTTP cache when
checking for a worker update by default, so this is usually fine, but a CDN or host rule
that forces a long `max-age` on all JS will strand users on an old version. If you set
custom cache headers, exempt `sw.js`:

```
/sw.js
  Cache-Control: no-cache
```

`manifest.webmanifest` should be served as `application/manifest+json`. GitHub Pages,
Netlify and Cloudflare Pages all do this correctly out of the box.

### After every deploy

Run `python3 tools/build.py` and commit the regenerated pages **and `sw.js`**. The worker's
version is a hash over the bytes of everything it precaches, so a forgotten rebuild means
returning visitors keep getting the old app from cache. The CI snippet above catches stale
pages; extend the `git diff` check to `sw.js` if you want it to catch that too:

```bash
git diff --exit-code -- '*.html' sw.js
```

### Verifying offline behaviour

Truly test it — DevTools' "Offline" checkbox does not reliably gate service-worker fetches,
so it is easy to convince yourself caching works when you are still hitting the network.
Stop the server instead:

```bash
python3 -m http.server 8000     # load the site once, let the worker install
# then kill the server and reload
```

All nine pages should still load, and the planting guide, risk assessment and study guide
should all still function.

### Map imagery

Map tiles are the one thing that needs deliberate action. TreePlot's **Save map area
offline** button caches the current view plus two zoom levels in, capped at 1200 tiles per
request. Tiles fetched by normal panning are cached too, up to 3000 (~45 MB), trimmed
oldest-first.

Brief your crews to save their work area before leaving signal.

## Third-party requests

Only `app/plot.html` reaches off-site, and only for map imagery:

| Resource | Host |
|---|---|
| Map tiles | `tile.openstreetmap.org` |

Leaflet is vendored into `assets/vendor/leaflet/` and served from your own origin, so there
is no CDN dependency. There are no font hosts and no analytics anywhere on the site.

Because Leaflet is already vendored, a strict Content-Security-Policy is straightforward —
`'self'` for everything except tile imagery:

```
default-src 'self';
img-src 'self' data: https://tile.openstreetmap.org;
script-src 'self';
style-src 'self';
connect-src 'self' https://tile.openstreetmap.org;
```

To upgrade Leaflet, change `VERSION` in `tools/vendor-leaflet.sh`, set `EXPECTED_SHA512=""`,
run it once to print the hash, verify that hash against
`https://registry.npmjs.org/leaflet/<version>` (the `dist.integrity` field minus the
`sha512-` prefix), paste it into the script, then run the script and `tools/build.py` and
commit both `assets/vendor/` and the regenerated `sw.js`.

**OpenStreetMap tile usage policy:** the public tile servers are for light use only.
Attribution is already rendered on the map. If TreePlot gets real traffic, move to a
proper tile provider — the OSM Foundation's servers are donated infrastructure.

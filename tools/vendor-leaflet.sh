#!/bin/sh
# Download Leaflet into assets/vendor/ so TreePlot has no third-party
# dependency at runtime.
#
# Why this matters: TreePlot is an offline field tool, but the map library
# itself is loaded from a CDN. A crew that installs the app at the office and
# drives to a site with no signal gets no map library at all unless it was
# already cached. Vendoring removes that failure mode entirely, and also
# removes the only cross-origin request the site makes.
#
# Run this on a machine with network access, then re-run tools/build.py.
# The build detects the vendored files and switches the page and the service
# worker precache over automatically.

set -eu

VERSION="1.9.4"
DEST="$(cd "$(dirname "$0")/.." && pwd)/assets/vendor/leaflet"
BASE="https://cdnjs.cloudflare.com/ajax/libs/leaflet/${VERSION}"

mkdir -p "$DEST/images"

echo "Downloading Leaflet ${VERSION} into ${DEST}"

for f in leaflet.css leaflet.js; do
  echo "  $f"
  curl -fsSL "$BASE/$f" -o "$DEST/$f"
done

# leaflet.css references these. TreePlot uses divIcon markers so the marker
# images are not strictly required, but the zoom/layers controls are.
for f in layers.png layers-2x.png marker-icon.png marker-icon-2x.png marker-shadow.png; do
  echo "  images/$f"
  curl -fsSL "$BASE/images/$f" -o "$DEST/images/$f" || echo "    (skipped: not found)"
done

echo
echo "Done. Now run:  python3 tools/build.py"
echo "Then commit assets/vendor/ along with the regenerated pages and sw.js."

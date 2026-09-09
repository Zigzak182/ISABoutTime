#!/bin/sh
# Vendor Leaflet into assets/vendor/ so TreePlot has no third-party runtime
# dependency.
#
# Why this matters: TreePlot is an offline field tool, but the map library
# itself would otherwise load from a CDN. A crew that installs the app at the
# office and drives to a site with no signal gets no map library at all unless
# it happened to be cached. Vendoring removes that failure mode entirely, and
# leaves map tiles as the only cross-origin request the site makes.
#
# Source is the npm registry — the authoritative publication of the package,
# which is what the CDNs mirror. The tarball hash is pinned below and verified
# before anything is extracted.
#
# To upgrade: change VERSION, run with EXPECTED_SHA512 set to "", copy the
# hash the script prints into EXPECTED_SHA512, and run it again.
#
# Run this on a machine with network access, then re-run tools/build.py. The
# build detects the vendored files and switches the page and the service
# worker precache over automatically.

set -eu

VERSION="1.9.4"
EXPECTED_SHA512="nxS1ynzJOmOlHp+iL3FyWqK89GtNL8U8rvlMOsQdTTssxZwCXh8N2NB3GDQOL+YR3XnWyZAxwQixURb+FA74PA=="

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/assets/vendor/leaflet"
TARBALL="https://registry.npmjs.org/leaflet/-/leaflet-${VERSION}.tgz"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Fetching leaflet ${VERSION} from the npm registry"
curl -fsSL --max-time 120 "$TARBALL" -o "$TMP/leaflet.tgz"

ACTUAL="$(python3 - "$TMP/leaflet.tgz" <<'PY'
import base64, hashlib, sys
print(base64.b64encode(hashlib.sha512(open(sys.argv[1], "rb").read()).digest()).decode())
PY
)"

if [ -z "$EXPECTED_SHA512" ]; then
  echo
  echo "No hash pinned. Verify this against https://registry.npmjs.org/leaflet/${VERSION}"
  echo "(the dist.integrity field, minus the 'sha512-' prefix), then set it in this script:"
  echo
  echo "  EXPECTED_SHA512=\"${ACTUAL}\""
  exit 1
fi

if [ "$ACTUAL" != "$EXPECTED_SHA512" ]; then
  echo "INTEGRITY CHECK FAILED — refusing to extract." >&2
  echo "  expected sha512-$EXPECTED_SHA512" >&2
  echo "  actual   sha512-$ACTUAL" >&2
  exit 1
fi
echo "  integrity verified (sha512)"

tar xzf "$TMP/leaflet.tgz" -C "$TMP"
SRC="$TMP/package"

rm -rf "$DEST"
mkdir -p "$DEST/images"

# Only what the browser needs: the minified build, its stylesheet, the control
# and marker images the stylesheet references, and the license. Source maps and
# the unminified/ESM builds are omitted deliberately.
cp "$SRC/dist/leaflet.js"  "$DEST/leaflet.js"
cp "$SRC/dist/leaflet.css" "$DEST/leaflet.css"
cp "$SRC/dist/images/"*.png "$DEST/images/"
cp "$SRC/LICENSE" "$DEST/LICENSE"

printf 'leaflet %s\nhttps://registry.npmjs.org/leaflet/-/leaflet-%s.tgz\nsha512-%s\nBSD-2-Clause — see LICENSE\n' \
  "$VERSION" "$VERSION" "$EXPECTED_SHA512" > "$DEST/VENDORED.txt"

echo "  wrote $(cd "$DEST" && find . -type f | wc -l | tr -d ' ') files to assets/vendor/leaflet"
echo
echo "Next:  python3 tools/build.py"
echo "Then commit assets/vendor/ with the regenerated pages and sw.js."

# Extending the data

Three data files drive everything. All are plain globals rather than JSON fetched at
runtime, so every tool works from `file://` as well as over HTTP.

---

## `data/species.js` — the tree database

79 taxa. Each record is documented by the schema comment at the top of the file; the fields
that carry the most weight in the recommender:

| Field | Why it matters |
|---|---|
| `zones` | `[min, max]` USDA. The first hard filter. |
| `regions` / `avoid` | Region codes where the species is defensible / actively wrong. `avoid` is a hard exclusion and its reason is shown to the user. |
| `verdict` | `asset` \| `situational` \| `liability`. Drives scoring, and a `liability` species caps the assessment verdict at "plan the replacement". |
| `utility` | `true` only if mature height genuinely clears typical distribution lines. Be strict — this is the field that prevents a lifetime of topping. |
| `strip` | Minimum usable soil width in feet. Excludes species from narrow tree lawns. |
| `soil.ph` | `[min, max]`. Drives the chlorosis warnings that catch red maple and pin oak on alkaline fill. |
| `soil.salt` / `.drought` / `.compact` | 0–3 tolerance scales. |
| `cultivars` | The named selections to specify. This is the difference between a useful recommendation and "plant an oak". |
| `asset` / `liability` | Prose reasons, shown verbatim. Write them as you'd say them to a client. |

### Adding a species

Append a record before the closing `];` and validate:

```bash
node -e "
global.window={};require('./data/species.js');
const s=window.TTC_SPECIES;
const bad=s.filter(t=>!t.id||!t.zones||!t.size||!t.soil||!t.verdict||!Array.isArray(t.regions));
console.log('taxa:',s.length,'malformed:',bad.length);
console.log('duplicate ids:', s.length - new Set(s.map(t=>t.id)).size);
"
```

Two conventions worth keeping:

- **Every species gets a liability entry.** Even the best tree costs something — acorns on a
  walk, slow establishment, a pruning-season restriction. A record with an empty `liability`
  array is a record nobody has thought hard enough about.
- **`regions` is where it is a *defensible recommendation*,** not merely where it survives.
  Colorado blue spruce survives in Ohio; it is not a defensible recommendation there, which
  is why it is in `avoid` for the eastern regions.

### Region codes

`ne` Northeast · `ma` Mid-Atlantic · `se` Southeast · `gulf` Gulf Coast ·
`fl` Florida/subtropical · `mw` Midwest · `gp` Great Plains · `mtn` Mountain West ·
`sw` Desert Southwest · `pnw` Pacific Northwest · `ca` California

---

## `data/zones.js` — ZIP → climate

186 ranges of the form `[lo, hi, state, region, zone, rain, city]`, keyed on the ZIP3
prefix (the USPS sectional center facility).

**This is approximate by construction and the tool says so on every result.** A ZIP3 covers
a wide area; a single zone label cannot represent the Colorado Front Range or the
California coast honestly.

### Refining a range

Split it. The ranges are checked in order and must not overlap — verify after editing:

```bash
node -e "
global.window={};require('./data/zones.js');
const r=window.TTC_ZONES.ranges.slice().sort((a,b)=>a[0]<b[0]?-1:1);
let n=0; for(let i=1;i<r.length;i++) if(r[i][0]<=r[i-1][1]){n++;console.log('OVERLAP',r[i-1],r[i]);}
console.log('ranges:',r.length,'overlaps:',n);
['02139','85018','97205','78704'].forEach(z=>console.log(z, JSON.stringify(window.TTC_ZONES.lookup(z))));
"
```

### Replacing it with real data

If you want genuine accuracy rather than a ZIP3 approximation, the honest upgrade is to
geocode the address and sample the USDA PRISM hardiness zone raster, then keep this table
only as the offline fallback. `lookup()` returns a plain object, so a geocoded source can be
swapped in behind the same interface without touching `planting.js`.

Zone labels use `"6a"` / `"6b"` form; `zoneValue()` converts them to numbers where `a` = `.0`
and `b` = `.5`, which is what the species comparison uses.

---

## `data/study.js` — study content

Three exports:

- `TTC_STUDY.domains` — `{ id, name, weight, summary, keyPoints[], terms[] }`.
  `weight` values must sum to 100 (they are presented as study-time guidance, **not** as
  official exam weightings).
- `TTC_STUDY.flashcards` — authored as `[domain, question, answer]` tuples, mapped to
  objects at the bottom of the file.
- `TTC_STUDY.quiz` — `[domain, question, choices[4], correctIndex, explanation]`.

### On the quiz bank

The correct answer sits in a fixed position in most records, which would be a serious flaw
in a study tool. `study.js` shuffles the choices *and remaps the answer index* every time a
question is rendered, so position carries no information. **Keep it that way** if you
rewrite the quiz engine.

Every question needs a real `explanation`. A practice bank that only says "wrong" teaches
recognition of the question, not the material.

Validate after editing:

```bash
node -e "
global.window={};require('./data/study.js');
const S=window.TTC_STUDY, ids=new Set(S.domains.map(d=>d.id));
console.log('weights sum:', S.domains.reduce((a,d)=>a+d.weight,0));
console.log('bad quiz:', S.quiz.filter(q=>!ids.has(q.domain)||q.choices.length!==4||!q.explain).length);
console.log('bad cards:', S.flashcards.filter(c=>!ids.has(c.domain)||!c.a).length);
"
```

Adding a domain means adding it to `domains` (rebalancing the weights to 100) and writing
cards and questions with the matching `domain` id — the selects in `app/study.html` are
populated from the data, so nothing in the HTML needs touching.

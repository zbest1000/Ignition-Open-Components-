# Conventions for building the remaining pages

For whoever builds `/line`, `/quality`, `/energy`, `/schedule` and `/gallery`. The Overview page
(`tools/pages/overview.js`) is the worked example; copy its structure.

## The loop

```bash
# 1. edit tools/pages/<page>.js (and demo/data/code.py if the page needs more data)
node examples/demo-project/tools/build.js                 # writes project/
node examples/demo-project/tools/validate.js --quiet      # must end with "0 error(s)"
node examples/demo-project/tools/preview.js --page /line  # 1920x1080 and 1366x768 into screenshots/
# 2. LOOK at both PNGs. Fix overlaps, clipped text, cramped charts. Repeat.
node examples/demo-project/tools/package.js               # last: refresh dist/OpenEChartsDemo.zip
```

`preview.js` prints a note for every chart smaller than 120×100, every label whose text is cut
off, and when the page scrolls; it exits 1 on an unresolved binding or a chart error. Add `--full`
to see a scrolling page whole, `--line L3` to check another line, and `--out <dir>` to keep
experiments out of `screenshots/`.

Do not touch git, and change nothing outside `examples/demo-project/`.

## Two sources

`project/` is **generated**. `tools/build.js` writes every view, style class, the page config and
the session props from `tools/design.js` and `tools/pages/*.js`, and deletes generated files it no
longer produces. Edit the sources, never `project/.../view.json`. The one hand-written file in
`project/` is the script library, `project/ignition/script-python/demo/data/code.py`.

Once somebody edits a view in the Designer, that view's `.js` source is stale and the next build
overwrites the edit. Until the project has been imported and checked, keep everything in the
sources.

## File layout and names

```text
tools/design.js              tokens and style classes
tools/lib/ui.js              builders: page, row, card, chart, kpiTile, stat, label, flex, bind, ...
tools/pages/index.js         the list of all views
tools/pages/shell.js         header, navigation rail, PAGES (URL, view, title, icon)
tools/pages/overview.js      Pages/Overview
tools/pages/stubs.js         the five placeholder pages
project/ignition/script-python/demo/data/code.py    demo.data
```

| Thing | Convention | Example |
|---|---|---|
| Page view | `Pages/<Name>` | `Pages/Quality` |
| Shell view | `Shell/<Name>` | `Shell/NavRail` |
| Reusable embedded view | `Components/<Name>` (none yet) | `Components/MachineCard` |
| Component name | PascalCase, no `/` or `.`, unique among siblings; the root is `root` | `Throughput`, `KpiOee` |
| Style class | `Demo/<Name>`, flat: never a class inside another class's folder | `Demo/Card` |
| Page data function | `demo.data.<page>_page(line, now_ms=None)` (`overview` is the exception) | `demo.data.quality_page` |
| Data path | `view.custom.data.<block>.<prop>`, the block shaped like the component's props | `view.custom.data.fill.values` |

**To replace a placeholder:** create `tools/pages/quality.js` exporting
`{ 'Pages/Quality': page('demo.data.quality_page', [...]) }`, delete the `Pages/Quality` entry
from `tools/pages/stubs.js`, and add `require('./quality')` to the `Object.assign` in
`tools/pages/index.js`. The URL and navigation entry already exist in `PAGES`.

## Design tokens

All in `tools/design.js`. Use the tokens; do not write hex values in pages.

**Colour.** The card surface is `#1a1a2e` because that is the background of the
`IgnitionIndustrialDark` chart theme: a chart and its card are one surface. Do not change either.

| Token | Value | Use |
|---|---|---|
| `color.page` | `#0f0f1c` | page background |
| `color.chrome` | `#141425` | header, navigation rail |
| `color.card` | `#1a1a2e` | cards, tiles (= chart theme background) |
| `color.cardRaised` | `#22223a` | hover |
| `color.border` / `borderStrong` | `#2a2a42` / `#3a3a58` | card border / input border |
| `color.text` / `textSecondary` / `textMuted` | `#e6e7ef` / `#a9acbf` / `#74778f` | titles and values / body / captions |
| `color.accent` / `accentSoft` | `#6f8ce8` / 16 % of it | selection, primary series, chips |
| `color.ok` / `warn` / `alarm` | `#3ba272` / `#e6a23c` / `#e05252` | status **only**: good / warning / bad |
| `color.cyan` / `violet` / `pink` | `#48b8d0` / `#b08bd9` / `#d98bb6` | further series (`chart.palette`) |

Green, amber and red mean status. A series that is not a status gets accent, cyan, violet or pink.

**Spacing** (`space`): 4, 8, 12, 16, 20, 28. Page padding 16 / 20, gap between cards 14
(`layout.pageGap`), card padding 12 / 16 / 8, card radius 10.

**Type** (`font`), family `"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif` (the chart
theme's family):

| Class | Size / weight | Use |
|---|---|---|
| `Demo/Eyebrow` | 11 / 600, uppercase, tracked | section label above a title |
| `Demo/PageTitle` | 22 / 600 | one per page |
| `Demo/PageSubtitle`, `Demo/Body` | 13 / 400 | secondary text |
| `Demo/CardTitle` | 13 / 600 | card heading |
| `Demo/CardHint` | 12 / 400, muted | what the card shows: scope · period · unit |
| `Demo/StatValueLarge` / `StatValue` / `StatLabel` | 30 / 600, 15 / 600, 12 / 400 | hand-made legends |
| `Demo/Chip` | 12 / 600 on accent tint | short state or tag |

**Layout** (`layout`): header 56, rail 208, card minimum height 250, KPI tile height 112. A page
has 1712×1024 at 1920×1080 and 1158×712 at 1366×768.

## The page skeleton

```js
'use strict';
const { design, flex, chart, card, row, stat, kpiTile, pageHeading, page, label, bind, bindAll } = require('../lib/ui');
const D = 'view.custom.data';

module.exports = {
    'Pages/Quality': page('demo.data.quality_page', [
        pageHeading('QA lab', 'Quality', bind.prop(`${D}.meta.subtitle`)),
        row('Kpis', ['scrap', 'good'].map(key => kpiTile(`Kpi${key}`, `${D}.kpi.${key}`)), { grow: 0 }),
        row('Fill', [
            card('Spc', { title: 'Fill volume', hint: 'individuals and moving range  ·  last 4 h', basis: 620, grow: 2 },
                chart('Chart', 'open.industrial.SPCChart', { title: ' ' }, { bindings: bindAll(`${D}.fill`, ['values']) })),
            card('Capability', { title: 'Capability', hint: 'against 327–333 mL', basis: 440 },
                chart('Chart', 'open.industrial.CapabilityHistogram', {}, { bindings: bindAll(`${D}.fill`, ['values', 'lsl', 'usl', 'target', 'unit', 'decimals']) })),
        ]),
    ]),
};
```

- `page(dataFn, children)`: the root column (`Demo/Page`, scrolls vertically) and the one polling
  binding on `view.custom.data`.
- `row(name, cards, { grow })`: a wrapping row. Rows share spare height (`grow: 1`, the default),
  so a page fills a 1080p wall display; use `grow: 0` for rows of fixed height (KPI tiles).
- `card(name, { title, hint, chip, basis, grow, minHeight }, body)`: `basis` is the width in px at
  which the card wraps to the next line; `grow` shares spare width (default 1; 2 for the main
  chart of a row).
- `chart(name, type, staticProps, { bindings, position, style })`: adds `theme`. Static props
  (titles, units, colours, switches) go in `staticProps`; data goes in `bindings`.
- `bindAll(base, [names])`: one property binding per prop below one data block.
- `bind.prop(path)`, `bind.expr(expression)`, `bind.twoWay(path)` for single bindings.

**Choosing `basis`.** Add the bases of a row plus 14 px per gap. If the sum is at most **1118**
the row stays on one line on a 1366-wide laptop; if it is more, the last card wraps and takes the
full width. Decide which you want, then check the 1366 picture. Overview uses 300 + 480 + 280,
480 + 520 and 300 + 440 + 340.

## The card, as view JSON

What `card()` + `chart()` produce, for reading a built view or building one by hand in the
Designer. A card is a column flex container with a header row and one body that takes the rest.

```json
{
  "type": "ia.container.flex",
  "meta": { "name": "Pareto" },
  "position": { "basis": "520px", "grow": 1, "shrink": 1 },
  "props": {
    "direction": "column",
    "style": { "classes": "Demo/Card", "minHeight": "250px", "minWidth": "0px" }
  },
  "children": [
    {
      "type": "ia.container.flex",
      "meta": { "name": "Header" },
      "position": { "basis": "auto", "grow": 0, "shrink": 0 },
      "props": { "alignItems": "center", "style": { "classes": "Demo/CardHeader" } },
      "children": [
        {
          "type": "ia.display.label",
          "meta": { "name": "Title" },
          "position": { "basis": "auto", "grow": 0, "shrink": 0 },
          "props": { "text": "Downtime by category", "style": { "classes": "Demo/CardTitle" } }
        },
        {
          "type": "ia.display.label",
          "meta": { "name": "Hint" },
          "position": { "basis": "0px", "grow": 1, "shrink": 1 },
          "props": { "text": "plant  ·  last 24 h  ·  minutes", "style": { "classes": "Demo/CardHint" } }
        }
      ]
    },
    {
      "type": "open.industrial.Pareto",
      "meta": { "name": "Chart" },
      "position": { "basis": "0px", "grow": 1, "shrink": 1 },
      "props": { "theme": "IgnitionIndustrialDark", "barLabel": "Downtime (min)" },
      "propConfig": {
        "props.categories": { "binding": { "type": "property", "config": { "path": "view.custom.data.pareto.categories" } } },
        "props.counts": { "binding": { "type": "property", "config": { "path": "view.custom.data.pareto.counts" } } }
      }
    }
  ]
}
```

The row around it: `ia.container.flex` with `"wrap": "wrap"`, class `Demo/Row`, position
`{ "basis": "auto", "grow": 1, "shrink": 0 }`. The page binding, in the view's own `propConfig`:

```json
"custom.data": {
  "binding": { "type": "expr", "config": { "expression": "runScript(\"demo.data.overview\", 5000, {session.custom.line})" } },
  "persistent": false
}
```

## Adding data and binding it

`demo/data/code.py` already has a building block for every component, and a page function per
page that collects them:

| Function | Returns props for |
|---|---|
| `kpis(line)` | KPI Tile: `oee`, `throughput`, `good`, `scrap`, `downtime`, `energy` |
| `oee(line)` | OEE Summary |
| `trend(line)`, `process_trend(line, tag)` | Industrial Trend (`tag`: `fill`, `temp`, `pressure`, `co2`) |
| `state_timeline(line, by=...)` | State Timeline (`by="line"` or `"machine"`) |
| `downtime_events(line)` | Downtime Tracker |
| `pareto(line, by=...)` | Pareto (`by="reason"` or `"category"`; `line=None` for the plant) |
| `waterfall(line)` | Waterfall |
| `bullets()`, `rings()`, `utilities()` | Bullet Chart, Metric Rings, Dial Gauge |
| `radar()` | Radar Comparison |
| `samples(line, tag)` | SPC Chart and Capability Histogram (`tag`: `fill`, `torque`, `co2`, `brix`) |
| `flow(kind)` | Flow Diagram (`kind`: `energy`, `material`) |
| `alarm_heatmap()`, `resource_heatmap()` | Event Heatmap, Resource Heatmap |
| `gantt()`, `shift_calendar()`, `schedule_calendar()`, `batches()` | Gantt, Shift Calendar, Schedule Calendar, Batch Timeline |
| `energy_series()`, `sku_mix()`, `calendar_days()` | generic charts: bar / line, sunburst / treemap / pie, calendar |

To add something:

1. Write a function that returns a dict whose keys are the component's prop names. Take the
   shapes from `common/src/main/resources/props/<component>.props.json` and `docs/wiki/notes/`.
2. Add it to the page function under a short key: `"torque": samples(line, "torque", now)`.
3. Bind with `bindAll('view.custom.data.torque', ['values', 'lsl', 'usl'])`.
4. `validate.js` runs the page function for L1, L2 and L3, resolves every binding and checks each
   component's resolved props against its schema. A wrong key or type fails there, with the path.

Rules for `code.py` (the validator enforces them):

- It must run unchanged on Jython 2.7 and Python 3. No f-strings, no `print`, no type
  annotations, no keyword-only arguments, no `nonlocal`, no `/=`.
- **ASCII only.** Write other characters as escapes in a `u"..."` literal: `u"°C"`. A raw
  `°` or `·` in the file is a syntax error on Jython.
- **Division.** `int / int` floors on Jython and not on Python 3. Use `//` when you mean it and
  `float(...)` or a float literal when you do not. The validator runs every bound function with a
  checked division and reports the line.
- Only `math` and `time` may be imported. No `system.*` calls: the library must also run outside
  a gateway, and the session needs no gateway-scoped permissions.
- No `random`. Use `_u(...)`, `_noise(...)`, `_drift(...)`, `_gauss(...)` with a seed that names
  the thing. Hash integers and strings only, never floats or tuples (their text form differs
  between the two Pythons).
- Every public function ends with `now_ms=None` and starts with `now = _now(now_ms)`. Bindings
  leave it out; the tools pass a fixed instant.
- Derive from the plant model (`_stops`, `_speed`, `_window`) when the number is about a line, so
  pages stay consistent with each other.

## Bindings and expressions

Only what the tools can evaluate is allowed, so that every page can be previewed and validated:

- **Property** bindings to `view.custom.*`, `view.params.*`, `session.custom.*`, `page.props.path`.
- **Expression** bindings (`"type": "expr"`) in the subset of `tools/lib/expr.js`: strings,
  numbers, `{references}`, `+ - * / %`, comparisons, `&& || !`, and the functions `now`,
  `dateFormat`, `if`, `runScript`, `concat`, `toStr`, `toInt`, `toFloat`, `coalesce`, `upper`,
  `lower`, `numberFormat`, `round`, `len`, `isNull`, `min`, `max`, `abs`. Anything else is a
  validation error; add the function to `expr.js` (parser table and `evaluate`) if you need it.
- **Transforms:** `map`, `expression`, `format`. **No script transforms**: logic belongs in
  `demo.data`, where it is tested.
- **Events:** navigation with a `nav` action. No script actions unless there is no other way
  (they validate with a warning).
- Tag, query and history bindings validate with a warning and preview as empty. Do not use them
  in the demo itself.

Built-in components are limited to the six the previewer imitates: `ia.container.flex`,
`ia.display.label`, `ia.display.icon`, `ia.display.view`, `ia.input.dropdown`,
`ia.display.markdown`. If a page needs another one, add it to `BUILT_IN` in `validate.js` **and**
to `Renderer.node` in `preview.js`, and record in FORMAT-NOTES.md where its props are attested.
Every chart and KPI is an Open ECharts component.

## Generic charts (`open.echarts.*`)

On these the whole chart is `props.option`. Start from a worked example in
`docs/wiki/examples/<Component>.json` and bind the data over it:

```js
const { wikiExample } = require('../lib/ui');

chart('Mix', 'open.echarts.SunburstChart', wikiExample('SunburstChart', 'monochrome'), {
    bindings: { 'option.series[0].data': bind.prop(`${D}.mix.tree`) },
})
```

The theme supplies palette, text colours and the `#1a1a2e` background. It does **not** style
`radar`, `calendar` or the 3D axes (docs/wiki/Themes.md): set those colours in the option, from
the tokens. Examples whose description says they hard-code colours keep them under any theme;
check the preview. ECharts-GL charts (3D) load an extra chunk; give the preview a moment and look
for an empty box.

## Pitfalls already hit

1. **`option` on an industrial or scheduling component replaces its whole chart.** A non-empty
   `props.option` wins over everything the component builds from its own props. Passing
   `{ backgroundColor: 'transparent' }` to restyle one gave sixteen empty charts and no error.
   The validator now rejects it. You cannot change grid, legend or axis labels of these
   components; choose props, sizes and data that suit them instead.
2. **Fallback titles.** State Timeline, Gantt, Downtime Tracker, Batch Timeline, Shift Calendar,
   Resource Heatmap and SPC draw their own title when `title` is empty ("State Timeline", ...).
   The card already has one: pass `title: ' '` (one space).
3. **Components have a size they were drawn for** (`size` in `components.manifest.json`). Below
   it they degrade:
   - OEE Summary (400×400): the labels inside the rings overlap below about 330 px of height. On
     Overview the labels are off (`showLabels: false`) and a `stat()` legend carries the numbers.
     Give it a tall card on the Line page and leave the labels on.
   - Metric Rings (400×400): with `labelPosition: 'bottom'` the list is cut off in a 250 px card;
     use `'right'`, and `decimals: 0` so the centre value fits the hole.
   - Industrial Trend: the limit labels ("Lo Warn", "Lo Alarm") are clipped on the right when the
     chart is narrower than about 600 px. Bind `limits` only in a card that stays wide.
   - Dial Gauge: readable down to about 100 px wide with `showScale: false`.
4. **Category labels disappear.** ECharts hides axis labels that would touch. Pareto with seven
   reason names in a 450 px card showed three of them. Use few, short categories in narrow cards
   (Overview groups by category), or give the card the width.
5. **Pareto sorts by itself**, so an "Other" bucket that is the largest comes first. Keep `top`
   high enough that "Other" is small, or group by category.
6. **Text does not ellipsise in a label.** Keep hints short enough for the narrowest card; the
   previewer lists every label it had to cut.
7. **Rounding.** A value shown in two places with different `decimals` can differ by one digit
   (80.5 in a tile, 81 % in rings). Use the same decimals, or round in `code.py`.
8. **Height on a 1080p display.** Heading 68 + tiles 112 + three rows of 250 + gaps and padding
   is 1018 of 1024 px. A fourth row of cards makes the page scroll on a wall display; that is
   fine for a detail page, but decide it on purpose.
9. **Non-ASCII characters typed into `code.py`** broke Jython compatibility once (see the rules
   above). In `.js` sources they are fine.
10. **Unverified format assumptions** are listed in FORMAT-NOTES.md section 9. If you learn that
    one is wrong, fix it in `tools/lib/ui.js` or `tools/build.js` (one place), not per page.

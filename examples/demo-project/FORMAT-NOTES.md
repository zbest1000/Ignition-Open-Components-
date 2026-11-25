# On-disk format of an Ignition Perspective project

What this project's files are modelled on, where each fact comes from, and what could not be
confirmed. `tools/validate.js` enforces the rules in this document.

**Nothing here was tested against a running gateway.** There is no Ignition in the environment
this project was written in, and `docs.inductiveautomation.com` was not reachable from it. Every
fact below is taken from files in public repositories. Section 9 lists what is still open.

## 1. Sources

| Tag | Repository and commit | What it is | Ignition version |
|---|---|---|---|
| **A** | `thirdgen88/ignition-examples` @ `42d28f1`, `enterprise/gw-init/central-gw.gwbk` | A gateway backup (a zip). Its `projects/Diagnostic/` folder is a Perspective project as the Designer saved it: 16 views, style classes, page config, session props. | 8.1.32 (`backupinfo.xml`) |
| **B** | `design-group/ignition-lint` @ `dace01d`, `tests/cases/*/view.json` and `resource.json` | 18 views exported from a development gateway, with signed manifests dated 2025. | 8.1.44 (`docker/docker-compose.yaml`) |
| **C** | `joyja/ignition-framework` @ `60a530d` | A whole project folder committed as it lies on disk: 20 views, style classes, a script library. | 8.1 (2021) |
| **D** | `Mustry-Solutions/iglint` @ `6e45c46`, `docs/internal/ignition-format.md` and `crates/iglint_project/tests/fixtures/basic/projects/fixture-hmi/` | A format reference written for an 8.3 linter. Each statement carries its origin: `[jar]` read from the 8.3.3 jars or computed by calling Ignition's classes, `[gw]` observed on a running 8.3.3 gateway, `[schema]` the JSON schemas inside the Perspective module, `[corpus]` a private set of about 300 production views. The fixture project is invented but "formatted the way Ignition writes it" and was loaded on an 8.3.3 gateway. | 8.3.3 |
| **E** | `silvver442/ignition-mcp` @ `5fc75f4`, `src/ignition_mcp/tools/perspective.py`, `tools/projects.py`, `bridge/build_zip.py`, `bridge/mcp-bridge.zip` | A tool that writes views, style classes and page config into a gateway's `data/projects/` and imports project zips through the REST API. README: "Tested against Ignition 8.3". | 8.3 |
| **F** | `sheon-sek/ignition-mcp` @ `3c8ced7`, `packages/ignition-rest-mcp/src/ignition_rest_mcp/projects/perspective.py` | Reads and rewrites project export archives. Its module comment states the archive layout "as Ignition 8.3 exports the Perspective module". README: live tests passed on 8.3.8 and 8.3.9. | 8.3.8, 8.3.9 |

A, B and C are **primary**: files Ignition itself wrote. All three are 8.1. No repository with
files written by an 8.3 Designer was found. D, E and F are the evidence for 8.3; they are
**secondary**: other people's documented observations and working tools. Where a fact rests only
on them, the tables say so.

## 2. Project folder and `project.json`

A project is a folder `data/projects/<name>/` on the gateway (A: `projects/Diagnostic/` in the
backup; B: the compose file mounts into `/workdir/projects/Testing/...`; D 1; E).

```json
{
  "title": "Gateway Diagnostics View",
  "description": "",
  "parent": "",
  "enabled": true,
  "inheritable": false
}
```

(A, verbatim.) Five keys; `parent` is `""` or the parent project's name. B's file has no `parent`
key. D 1.3 [jar]: the 8.3 export path writes the keys in the order `title, description, enabled,
inheritable, parent`; treat the order as free. This project writes all five keys.

Inside the project the first folder is the owning module's id and the second the resource type:
`<moduleId>/<typeId>/<resource path>/` (A, C, D 1).

| Path | Data file | Source |
|---|---|---|
| `com.inductiveautomation.perspective/views/<path>/` | `view.json` (+ optional `thumbnail.png`) | A, B, C, D 2 |
| `com.inductiveautomation.perspective/style-classes/<path>/` | `style.json` | A, C, D 7.1, E |
| `com.inductiveautomation.perspective/page-config/` | `config.json` | A, C, D 7.2, E, F |
| `com.inductiveautomation.perspective/session-props/` | `props.json` | A, C, D 7.3, F |
| `com.inductiveautomation.perspective/stylesheet/` | `stylesheet.css` | D 2 and the fixture only. **Not used here.** |
| `ignition/script-python/<pkg>/<module>/` | `code.py` | C, D 4, E |

A folder without a `resource.json` is only a folder: the gateway does not load a `view.json` or
`code.py` lying in it (D 1.1 [gw]).

Other resources that a Designer-saved project contains and this one leaves out: `ignition/global-props`
(`data.bin`), `com.inductiveautomation.perspective/session-permissions`, `general-properties`
(A, C, D 2). Whether an import fills them in with defaults is **not confirmed** (section 9).

## 3. `resource.json`

```json
{
  "scope": "G",
  "version": 1,
  "restricted": false,
  "overridable": true,
  "files": [
    "view.json",
    "thumbnail.png"
  ],
  "attributes": {
    "lastModification": {
      "actor": "admin",
      "timestamp": "2021-10-14T14:38:35Z"
    },
    "lastModificationSignature": "400781302e88c93ad3c37e2a9336399610efce2bc128c529e80cb2e08c9ec5c8"
  }
}
```

(A, verbatim, a view.) Two-space indent, this key order, no final newline (A, B, C; D 1.2 [jar]).

| Key | Value here | Source |
|---|---|---|
| `scope` | `"G"` for every Perspective resource; `"A"` for script library modules | A, B, C (script: C `ignition/script-python/theme/resource.json`); D 1.2 [jar] gives the codes: G gateway, D designer, C client, A all |
| `version` | `1` | A, B, C; D: named queries are 2 |
| `restricted`, `overridable` | `false`, `true` | A, B, C |
| `files` | exactly the data files beside the manifest | A, B, C. D 1.2 [gw]: a file that is not listed is ignored, a listed file that is missing is an error |
| `attributes.lastModification` | `{actor, timestamp}` (ISO-8601 UTC) | A, B, C |
| `attributes.lastModificationSignature` | **left out** | see below |
| `attributes.hintScope` | `2` on script modules | D 4.1 [jar] and the fixture. C (8.1, 2021) has no `hintScope`. It only steers Designer code hints. |

8.3 can also write `description` and `documentation` keys after `scope` (D 1.2 [jar]); 8.1 files
have neither. They are optional and left out here.

**No signature, no thumbnail.** The signature is a SHA-256 the Designer or gateway computes. A
tool cannot produce it, and a wrong one is worse than none. D 1.2: "Manifests written by hand (or
by tools) often lack `lastModification*`; the gateway accepts that." E writes
`"attributes": {}` for every resource it creates on 8.3, and strips the signature when it rewrites
one. This project writes `lastModification` with a fixed actor (`open-echarts-demo`) and a fixed
timestamp, and no signature. Expect the gateway to add signatures after the first save, which
shows up as changed `resource.json` files if you keep the imported project in git.
`thumbnail.png` is optional (D 2); E writes views without one.

## 4. `view.json`

Written by the Designer with keys sorted at every level, two-space indent, no final newline, and
`< > & = '` as `< > & = '` (A: its `Diagnostics/Diagnostics` view equals a
sorted re-serialisation byte for byte; B: its scripts carry the escapes; D 6.1). `tools/build.js` writes the same form.

### Top level

```json
{
  "custom": {},
  "params": { "align": "start", "value": "Hello World!" },
  "propConfig": { "params.align": { "paramDirection": "input", "persistent": true } },
  "props": { "defaultSize": { "height": 26, "width": 299 } },
  "root": { "children": [], "meta": { "name": "root" }, "props": { "direction": "column" }, "type": "ia.container.flex" }
}
```

(A, shortened.) `custom`, `params`, `props`, `root` are in every view of A, B and C; `propConfig`
in most; `events` rarely (B). D 6.2 adds `permissions`. View-level `propConfig` keys start with
`params.`, `custom.` or `props.` (A, B: `"custom.expr": {"access": "PRIVATE", "binding": {...}, "persistent": true}`).

### Components

```json
{
  "meta": { "name": "Value" },
  "position": { "basis": "auto", "display": true, "grow": 0, "shrink": 0 },
  "propConfig": { "props.text": { "binding": { "config": { "path": "view.params.value" }, "type": "property" } } },
  "props": { "style": { "classes": "Framework/Card/Value" } },
  "type": "ia.display.label"
}
```

(A, verbatim.)

| Fact | Source |
|---|---|
| `type` and `meta.name` on every component; the root is named `root` | A, B, C; E's validator |
| `children` only on containers | A, B, C; D 6.3 |
| Children of `ia.container.flex` carry `position` with `basis`, `grow`, `shrink` (and `display`, `align`) | A, B, C; D 6.4 [schema] |
| The Designer leaves default-valued props out. Flex container props seen: `direction: "column"`, `wrap: "wrap"`, `justify: "center" / "flex-end" / "space-between" / "space-evenly"`, `alignItems: "center" / "flex-start"`, `alignContent: "flex-start"` | A, B, C |
| `props.style` is a style object; `props.style.classes` is a space-separated list of style class paths | A, B, C; D 6.3 |
| `ia.display.view`: `props.path`, `props.params`, `useDefaultViewWidth`, `useDefaultViewHeight` | A (`Framework/Card/Card`, `Diagnostics/Diagnostics`) |
| `ia.display.icon`: `props.path` such as `"material/insert_emoticon"` | B (`PascalCase`), C |
| `ia.input.dropdown`: `props.options`, `props.value`, `showClearIcon`; options as `[{"label", "value"}]` | B (`BadContextData`); option objects: D fixture `Main/Overview` |
| `ia.display.markdown`: `props.source` | C (`Components/Form/Numeric Input`) |
| A component of another module is just its type id plus props; no extra wrapper | B (`AllNodeTypes` holds a `thirdparty.widget`) |

The default values of the flex container props (`row`, `nowrap`, `flex-start`, `stretch`,
`stretch`) are **not** in any source, precisely because the Designer does not write defaults.
`tools/lib/ui.js` therefore omits them too, and the previewer assumes them.

### Bindings

| Type | Shape | Source |
|---|---|---|
| property | `{"config": {"path": "view.params.value"}, "type": "property"}`; `"bidirectional": true` in `config` for two-way | A, B, C; `bidirectional`: D 6.6, and B/C on tag bindings |
| expression | `{"config": {"expression": "now(0)"}, "type": "expr"}`: the type string is **`expr`** | A, B, C. E's documentation says `"expression"`; D 6.6 [jar] lists the registered types as `tag, query, expr, expr-struct, property, tag-history, http` and says others become a `BrokenBinding`. |
| tag (indirect) | `{"config": {"fallbackDelay": 2.5, "mode": "indirect", "references": {"tagPath": "{view.params.tagPath}"}, "tagPath": "{tagPath}"}, "type": "tag"}` | C; direct mode: A |
| transforms | `"transforms": [{"code": "\treturn value", "type": "script"}]`, `{"expression": "{value} * 100.0", "type": "expression"}`, `map`, `format` | A, B, C |

References in `path` and inside `{...}` in expressions: `view.params.x`, `view.custom.x`,
`session.custom.x`, `session.props.x`, `this.props.x`, `parent.props.x` (A, B; D 6.10 adds
`page.props.x`).

`runScript` in a binding, as B has it:
`runScript("DanPT.Model.get_eq_path_from_url", 0, {view.params.eq_path_url})`: a quoted dotted
path into the project library, the poll rate in milliseconds, then the arguments.

Polling a script the other way round, as A has it:

```json
{ "config": { "expression": "now(60000)" },
  "transforms": [{ "code": "\tinstances = []\n\t...\n\treturn instances", "type": "script" }],
  "type": "expr" }
```

### Events

```json
"events": { "dom": { "onClick": { "config": { "script": "\tself.openCustomDash(newTab=False)" }, "scope": "G", "type": "script" } } }
```

(B.) Groups `dom`, `component`, `system`; an action is `{type, scope, config}`; script actions
have scope `G`. The navigation action this project uses,
`{"config": {"page": "/line"}, "scope": "C", "type": "nav"}`, comes from D 6.8 [jar] and the D
fixtures only. A real export with a `nav` action was not found (section 9).

## 5. Style classes

`style-classes/<path>/style.json`, referenced by its path (`Framework/Card/Label`):

```json
{
  "base": {
    "style": { "color": "#8E8E8E", "fontSize": "12px", "fontWeight": "300", "textTransform": "uppercase" }
  }
}
```

(A, shortened.) `variants: [{"pseudo": "hover", "style": {...}}, {"mediaQuery": "max-width: 600px", "style": {...}}]`
and `base.animation` are in D 7.1 [schema] and C. Older classes keep the same JSON in `data.bin`
(A has both forms side by side); new ones use `style.json`. Manifest: `"files": ["style.json"]` (A, E).

Keep classes as leaves of the folder tree: every class in A and C is one. (A search result
reported that a class folder which also holds child classes silently loses the children. The
page behind it could not be opened, so this is a precaution, not a fact.)

## 6. Page configuration

```json
{
  "pages": {
    "/": { "viewPath": "Diagnostics/Diagnostics", "title": "Gateway Diagnostics" }
  },
  "sharedDocks": { "cornerPriority": "top-bottom" }
}
```

(A, verbatim.) Docked views are **not** in any 8.1 primary file found (A and C have none). Their
shape is from D 7.2 and the D fixture, and E writes the same object on 8.3:

```json
"sharedDocks": {
  "cornerPriority": "top-bottom",
  "top": [{ "anchor": "fixed", "autoBreakpoint": 480, "content": "auto", "handle": "hide", "iconUrl": "",
            "id": "header", "modal": false, "resizable": false, "show": "visible", "size": 56,
            "viewParams": {}, "viewPath": "Docks/Header" }]
}
```

Sides `top`, `left`, `right`, `bottom`; `show` is `visible`, `onDemand` or `hidden`; E uses
`"content": "push"` for a left navigation dock of size 232. This project writes all twelve dock
keys, `content: "push"`, `cornerPriority: "top-bottom"` (the only value seen).

## 7. Session properties

```json
{
  "custom": { "selectedLine": "Line1" },
  "propConfig": { "custom.selectedLine": { "persistent": true } },
  "props": { "theme": "light", "locale": "en-US" }
}
```

(D 7.3.) A's real file has the same three keys; its `propConfig` lists the system properties
(`"props.auth": {"access": "PRIVATE", "persistent": false}`, ...) and `props` holds `address`,
`device`, `locale`, `timeZoneId`. C adds `"theme": "jar"` (its own theme) in `props` and a
`custom` tree with `persistent` entries. This project writes `custom.line`, its `propConfig`
entry and `props.theme: "dark"`. The theme name `dark` appears only in a D fixture.

## 8. Script library and project archive

```text
ignition/script-python/
  demo/                 folder without a manifest: package "demo"
    data/
      code.py           module demo.data
      resource.json     scope "A", files ["code.py"], attributes.hintScope 2
```

(C; D 4.) Each path component must match `[_a-zA-Z]\w*` (D 4.1 [jar]). A folder that has its own
`code.py` is a module and **hides** modules below it (D 4.2 [gw]); so `demo` has no `code.py`.
Top-level packages are globals in every script, so `demo.data.overview(...)` needs no import
(D 3.2 [gw]). Perspective runs all Python on the gateway (D 3.1).

**Project archive.** A project export is a zip with `project.json` and the module folders at its
root, no enclosing folder:

```text
project.json
ignition/script-python/mcp_bridge_lib/code.py
ignition/script-python/mcp_bridge_lib/resource.json
com.inductiveautomation.webdev/resources/api/...
```

(E: `bridge/mcp-bridge.zip`, listed with `unzip -l`; it has no directory entries.) F states the
same layout for 8.3 exports (`com.inductiveautomation.perspective/views/<path>/view.json` at the
archive root) and notes that "an import drops a resource directory that holds only its document",
which is why every resource here has its `resource.json`. Import through the 8.3 REST API:
`POST /data/api/v1/projects/import/<name>` with the zip as the body (`application/zip`),
`overwrite=true` to replace, authenticated with an `X-Ignition-API-Token` header (E `tools/projects.py`
and `client.py`, F `capabilities/registry.py` and `cli/gateway_ops/writer.py`), then
`POST /data/api/v1/scan/projects` (E). `tools/package.js` writes this layout.

An 8.1 gateway backup (`.gwbk`) is a different thing: a zip with `backupinfo.xml`,
`db_backup_sqlite.idb` and `projects/<name>/...` (A).

## 8.1 and 8.3 compared

| | 8.1 (A, B, C) | 8.3 (D, E, F) |
|---|---|---|
| Project folder layout, `project.json`, `view.json`, `style.json`, page config, session props | as above | the same |
| `resource.json` | six keys | the same, plus optional `description` / `documentation` |
| Style classes | `style.json`, older ones `data.bin` | `style.json`; `data.bin` still read |
| Session and gateway event scripts | one `data.bin` (`session-scripts`, `ignition/event-scripts`) | one resource per event with a `.py` file (D 2). Not used here. |
| Gateway configuration (tags, databases) | internal database in the backup | files under `data/config/resources/` (D 1.5). Not used here. |
| Project stylesheet | not present in A, B or C | `stylesheet/stylesheet.css` (D). Not used here. |

Everything this project writes is in the part that is the same in both. It targets 8.3 because
the Open ECharts module needs 8.3.7 or newer.

## 9. Not confirmed

Ordered by how much depends on it.

1. **No file in this project has been loaded by a gateway or opened in a Designer.** Everything
   below is a consequence.
2. **Import through the Designer or the gateway web page.** E's documentation says a project zip
   can be imported "in the Ignition Designer or gateway", without steps. The menu paths in
   `README.md` are from memory and marked there. Confirmed only as far as sources go: the REST
   import and copying the folder into `data/projects/`.
3. **A project without `ignition/global-props` and the Perspective settings resources.** E imports
   a project that has none of them on 8.3, so it is accepted; that the Designer then shows normal
   defaults is assumed.
4. **`runScript` returning a dictionary into a property.** The call form is in B. That the
   returned dict of lists and numbers arrives as an object whose members other bindings can read
   (`view.custom.data.kpi.oee.value`) is how Perspective is commonly used, but no source shows it.
   If it does not hold, replace the binding on `custom.data` with A's `now(5000)` + script
   transform form (section 4), whose script returns the same value. One binding per page.
5. **The `nav` action** (`{"config": {"page": ...}, "scope": "C", "type": "nav"}`): D only.
   Fallback that B shows: a script action with `system.perspective.navigate(page = path)`.
6. **`page.props.path`**, used to highlight the current page in the navigation rail. D 6.10 lists
   `page.props.x` as a reference; the property name `path` is from memory.
7. **Docked views**: D and E only (section 6).
8. **`props.theme: "dark"`** in session props: a D fixture only.
9. **Icon names.** `material/<name>` is the form in B and C. The seven names used
   (`dashboard`, `timeline`, `verified_user`, `flash_on`, `event`, `apps`, `bubble_chart`) are
   long-standing Material icon names but were not seen in a source. A wrong name shows an empty
   icon, nothing worse.
10. **Flex container defaults** (section 4) and how Perspective sizes flex children whose content
    is larger than their basis. The previewer uses plain CSS flexbox.
11. **The tag export file** `tags/meridian-demo-tags.json`. The tag object keys are in D 9.2 [jar];
    the wrapper (one `Folder` object with nested `tags`) and the expression functions `getMinute`,
    `getSecond`, `sin` in the expression tags are from memory.
12. **Hand-written `lastModification` without a signature** (section 3): accepted according to
    D and E; what the Designer shows for such a resource before its first save was not seen.

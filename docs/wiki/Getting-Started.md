Open ECharts is an Ignition 8.3 Perspective module. Once it is installed on the gateway, its charts are
ordinary Perspective components: you drop them on a view, edit their props in the Property Editor and
bind those props like any others.

## Install the module

You need Ignition **8.3.7 or newer** with the Perspective module installed and licensed.

1. Download `Open-ECharts-<version>.modl` from the repository's
   [Releases](https://github.com/zbest1000/Ignition-Open-Components-/releases) page.
2. In the gateway web interface go to **Config** → **Modules** and choose **Install or Upgrade a Module**.
3. Select the `.modl` file and install it. Restart the gateway if prompted.
4. Close and reopen the Designer so that it loads the module.

A release named `Open-ECharts-<version>.unsigned.modl` is not signed. A gateway only installs unsigned
modules when it was started with `-Dignition.allowunsignedmodules=true`, which is meant for development
gateways. Verifying the download, signing and offline installation are covered in
[docs/INSTALL.md](https://github.com/zbest1000/Ignition-Open-Components-/blob/main/docs/INSTALL.md) in the repository.

## Where the components appear

In the Designer, open a Perspective view. The component palette has four new groups:

| Palette group | What is in it |
|---|---|
| **Open Components / ECharts** | The universal **ECharts Chart** and one component per 2D chart type: line, bar, pie, scatter, gauge, heatmap, tree, sankey, radar, ... |
| **Open Components / ECharts 3D** | 3D and WebGL charts: Bar 3D, Surface, Globe, Scatter GL, ... |
| **Open Components / Industrial** | Charts with domain props instead of an option: Industrial Trend, OEE Summary, Pareto, SPC, KPI Tile, Bullet Chart, ... |
| **Open Components / Scheduling** | State Timeline, Gantt, calendars, Downtime Tracker, Batch Timeline, Resource Heatmap |

[Home](Home) shows every component with a picture.

## Your first chart in five steps

1. Drag **Bar Chart** from **Open Components / ECharts** onto a view. It draws a sample chart straight
   away: every component starts with a working sample.
2. Select it. In the Property Editor expand `option`. This object is an
   [ECharts option](https://echarts.apache.org/en/option.html): `xAxis.data` holds the category labels and
   `series[0].data` the bar values.
3. Change a number in `option.series[0].data`. The chart redraws.
4. Add a title: add an object member `title` to `option` and give it a `text` member with the value
   `"Units per day"`.
5. Make it live: bind `option.series[0].data` to your data. A binding there has to return a list of
   numbers, one per label. [Binding Data](Binding-Data) shows how to get one from a tag, tag history or
   a named query.

## Two kinds of component

**Option components** (the *ECharts* and *ECharts 3D* groups) draw whatever ECharts option is in their
`option` prop. The component you pick only decides which sample option a new one starts with; a
**Line Chart** given a pie option draws a pie. The option must be plain JSON: an option that needs a
JavaScript function (a formatter function, `renderItem`) cannot be expressed in a prop, so use the string
templates ECharts offers instead, such as `"{b}: {c}"` or `"{value} °C"`.

**Domain components** (the *Industrial* and *Scheduling* groups) have props that speak the language of
the plant: `availability`, `tasks`, `events`, `values`, `steps`. They build the option for you. Their
`option` prop is an advanced override: leave it empty.

## Entering an option

The component pages of this wiki give every example as JSON. There are three ways to get it into a
component:

- **Paste it.** Copy the JSON, right-click the `option` property in the Property Editor and choose
  **Paste**. The JSON replaces the sample option.
- **Build it by hand** in the Property Editor, adding object and array members one at a time. This is
  practical for small changes to a sample.
- **Return it from a binding.** A script transform on a binding to `props.option` can return the whole
  option as a Python dictionary. See [Binding Data](Binding-Data).

## Next

- [Binding Data](Binding-Data): tags, tag history, named queries and the shapes ECharts expects
- [Events](Events): reacting to clicks, zoom and legend changes in scripts
- [Themes](Themes): the built-in dark and light themes
- [Security](Security): what `sanitizeTooltip` does
- [Troubleshooting](Troubleshooting)

# Open ECharts Demo - sample data for the Meridian Bottling Plant.
#
# Project library module `demo.data`. Everything the demo shows comes from here:
# no tags, no database, no gateway-scoped calls. Each public function takes the
# selected line ("L1", "L2", "L3") and returns plain dicts / lists / numbers that
# are bound straight to component props.
#
# Rules for this file (tools/validate.js enforces most of them):
#   * Jython 2.7 AND CPython 3 must both run it unchanged (the previewer and the
#     validator execute this very file with python3). So: no f-strings, no print
#     statements, no dict.iteritems, `//` for integer division, float() before a
#     true division, no imports beyond `time` and `math`.
#   * ASCII only. Jython 2.7 rejects a non-ASCII byte in a source file without an
#     encoding line; write other characters as escapes in a u"..." literal
#     (u"\u00b0C"), which both Pythons read the same way.
#   * Deterministic: the same (line, now_ms) always gives the same numbers. All
#     randomness comes from _h() / _u() / _noise(), never from `random`.
#   * Times are epoch milliseconds (UTC). Shifts are fixed 8 h blocks in UTC.
#   * Public functions end with an optional `now_ms` argument. Bindings leave it
#     out (the gateway clock is used); the tools pass a fixed value.
import math
import time

MIN = 60000
HOUR = 3600000
DAY = 86400000

# How often the numbers move. Everything is evaluated on a time grid of this
# size, so a binding that polls faster than this sees stable values.
TICK_MS = 5000

LINES = {
    "L1": {"name": "Line 1", "product": "Glass 330 mL", "rated": 36000, "unit": "bph", "seed": 11,
           "sku": ["Pilsner 330", "Lager 330", "Radler 330", "Alcohol-free 330"]},
    "L2": {"name": "Line 2", "product": "PET 1.5 L", "rated": 24000, "unit": "bph", "seed": 23,
           "sku": ["Still water 1.5", "Sparkling 1.5", "Lemon 1.5", "Iced tea 1.5"]},
    "L3": {"name": "Line 3", "product": "Cans 500 mL", "rated": 60000, "unit": "cph", "seed": 37,
           "sku": ["Cola 500", "Cola zero 500", "Orange 500", "Energy 500"]},
}
LINE_ORDER = ["L1", "L2", "L3"]
MACHINES = ["Depalletiser", "Rinser", "Filler", "Capper", "Labeller", "Packer", "Palletiser"]
SHIFTS = ["C", "A", "B"]  # 22-06, 06-14, 14-22 (UTC); index = ((hour + 2) // 8) % 3
CREWS = ["Crew Red", "Crew Blue", "Crew Green", "Crew Amber"]

# (category, reason, weight, min minutes, max minutes)
STOP_REASONS = [
    ("Mechanical", "Filler jam", 16, 4, 16),
    ("Mechanical", "Belt tracking", 9, 3, 12),
    ("Mechanical", "Capper wear", 7, 5, 18),
    ("Electrical", "Labeller drive", 8, 3, 11),
    ("Electrical", "Packer sensor", 10, 2, 6),
    ("Material", "Label reel", 14, 2, 5),
    ("Material", "Closure feed", 9, 3, 9),
    ("Material", "Wrap film", 6, 2, 6),
    ("Operator", "Infeed jam", 12, 2, 7),
    ("Operator", "Fill-level hold", 5, 6, 14),
    ("Utilities", "Low CO2", 4, 4, 12),
]
STATE_COLORS = {
    "Running": "#3ba272", "Stopped": "#e05252", "Changeover": "#5b8def",
    "Starved": "#e6a23c", "Blocked": "#b08bd9", "Idle": "#5d6785",
}
CATEGORY_COLORS = {
    "Mechanical": "#e05252", "Electrical": "#e6a23c", "Material": "#5b8def",
    "Operator": "#b08bd9", "Utilities": "#48b8d0", "Changeover": "#5d6785",
}


# --------------------------------------------------------------------------
# Deterministic noise
# --------------------------------------------------------------------------

def _h(*parts):
    """32-bit FNV-1a hash of the parts (numbers are hashed by their repr)."""
    h = 2166136261
    for part in parts:
        for ch in str(part) + "|":
            h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
    # final avalanche, so that neighbouring integers do not give neighbouring values
    h ^= h >> 16
    h = (h * 0x45D9F3B) & 0xFFFFFFFF
    h ^= h >> 16
    return h


def _u(*parts):
    """Uniform float in [0, 1)."""
    return _h(*parts) / 4294967296.0


def _pick(items, *parts):
    return items[_h(*parts) % len(items)]


def _noise(seed, x):
    """Smooth value noise in [-1, 1]; x in lattice units."""
    i = int(math.floor(x))
    f = x - i
    a = _u(seed, i) * 2.0 - 1.0
    b = _u(seed, i + 1) * 2.0 - 1.0
    s = f * f * (3.0 - 2.0 * f)
    return a + (b - a) * s


def _drift(seed, t_ms, period_ms):
    """Two octaves of smooth noise in about [-1, 1] with the given period."""
    x = float(t_ms) / float(period_ms)
    return 0.7 * _noise(seed, x) + 0.3 * _noise(str(seed) + "o2", x * 3.1)


def _gauss(*parts):
    """Roughly normal(0, 1): sum of four uniforms, centred and scaled."""
    # the parts are hashed one by one: str() of a tuple would differ between Python 2 and 3
    s = 0.0
    for i in range(4):
        s += _u(*(parts + (i,)))
    return (s - 2.0) * 1.7320508


def _r(value, digits=1):
    return round(float(value), digits)


def _clamp(value, lo, hi):
    return max(lo, min(hi, value))


def _now(now_ms=None):
    """The evaluation time, snapped down to the tick grid."""
    if now_ms is None:
        now_ms = int(time.time() * 1000)
    now_ms = int(now_ms)
    return now_ms - now_ms % TICK_MS


def _line(line):
    if line not in LINES:
        line = "L1"
    return line, LINES[line]


def _ymd(t_ms):
    """UTC date of an epoch-ms time as (year, month, day) - no datetime needed."""
    days = int(t_ms // DAY)
    z = days + 719468
    era = z // 146097
    doe = z - era * 146097
    yoe = (doe - doe // 1460 + doe // 36524 - doe // 146096) // 365
    y = yoe + era * 400
    doy = doe - (365 * yoe + yoe // 4 - yoe // 100)
    mp = (5 * doy + 2) // 153
    d = doy - (153 * mp + 2) // 5 + 1
    m = mp + 3 if mp < 10 else mp - 9
    if m <= 2:
        y += 1
    return y, m, d


def _iso_date(t_ms):
    y, m, d = _ymd(t_ms)
    return "%04d-%02d-%02d" % (y, m, d)


def _weekday(t_ms):
    """0 = Monday .. 6 = Sunday (UTC)."""
    return int((t_ms // DAY + 3) % 7)


def _hhmm(t_ms):
    minutes = int((t_ms % DAY) // MIN)
    return "%02d:%02d" % (minutes // 60, minutes % 60)


def _shift(t_ms):
    """(shift letter, shift start ms, shift end ms) for a time."""
    start = ((t_ms + 2 * HOUR) // (8 * HOUR)) * (8 * HOUR) - 2 * HOUR
    letter = SHIFTS[int(((t_ms + 2 * HOUR) // (8 * HOUR)) % 3)]
    return letter, int(start), int(start + 8 * HOUR)


# --------------------------------------------------------------------------
# The plant model: one source of truth for states, stops, speed and counts
# --------------------------------------------------------------------------

BLOCK_MS = 20 * MIN  # at most one stop per line per 20-minute block


def _block_stop(line, block):
    """The stop (if any) in one 20-minute block: (start, end, state, category, reason) or None."""
    seed = LINES[line]["seed"]
    b0 = block * BLOCK_MS
    # planned changeover: one 25-minute changeover every 6 hours, offset per line
    slot = (b0 + seed * 7 * MIN) % (6 * HOUR)
    if slot < BLOCK_MS:
        start = b0 + 2 * MIN
        return (start, start + 16 * MIN, "Changeover", "Changeover", "SKU changeover")
    u = _u("stop", seed, block)
    # the plant has good and bad hours: stop probability drifts between 7 % and 22 %
    p_stop = 0.145 + 0.075 * _drift("p" + str(seed), b0, 5 * HOUR)
    if u < p_stop:
        total = 0
        for reason in STOP_REASONS:
            total += reason[2]
        target = _u("reason", seed, block) * total
        acc = 0
        chosen = STOP_REASONS[0]
        for reason in STOP_REASONS:
            acc += reason[2]
            if target < acc:
                chosen = reason
                break
        dur = chosen[3] + _u("dur", seed, block) * (chosen[4] - chosen[3])
        dur_ms = int(dur * 60) * 1000
        start = b0 + int(_u("off", seed, block) * (BLOCK_MS - dur_ms - MIN) // 1000) * 1000
        return (start, start + dur_ms, "Stopped", chosen[0], chosen[1])
    if u < p_stop + 0.07:
        dur_ms = int(60 + _u("dur", seed, block) * 200) * 1000
        start = b0 + int(_u("off", seed, block) * (BLOCK_MS - dur_ms - MIN) // 1000) * 1000
        state = "Starved" if _u("sb", seed, block) < 0.6 else "Blocked"
        reason = "Upstream gap" if state == "Starved" else "Downstream accumulation full"
        return (start, start + dur_ms, state, "Operator", reason)
    return None


def _stops(line, t0, t1):
    """All non-running intervals of a line that overlap [t0, t1], clipped, oldest first."""
    out = []
    block = int(t0 // BLOCK_MS)
    last = int(t1 // BLOCK_MS)
    while block <= last:
        stop = _block_stop(line, block)
        if stop is not None and stop[1] > t0 and stop[0] < t1:
            out.append((max(stop[0], t0), min(stop[1], t1), stop[2], stop[3], stop[4]))
        block += 1
    return out


def _state_at(line, t_ms):
    stop = _block_stop(line, int(t_ms // BLOCK_MS))
    if stop is not None and stop[0] <= t_ms < stop[1]:
        return stop[2]
    return "Running"


def _speed(line, t_ms):
    """Line speed in units/hour at a time (0 while not running, ramps after a stop)."""
    info = LINES[line]
    stop = _block_stop(line, int(t_ms // BLOCK_MS))
    if stop is not None and stop[0] <= t_ms < stop[1]:
        return 0.0
    factor = 0.925 + 0.05 * _drift("spd" + str(info["seed"]), t_ms, 50 * MIN)
    factor += 0.012 * _noise("jit" + str(info["seed"]), float(t_ms) / (2 * MIN))
    if stop is not None and t_ms >= stop[1]:
        ramp = float(t_ms - stop[1]) / (3 * MIN)
        if ramp < 1.0:
            factor *= 0.35 + 0.65 * ramp
    return info["rated"] * _clamp(factor, 0.0, 1.02)


def _scrap_pct(line, t_ms):
    seed = LINES[line]["seed"]
    return _clamp(1.6 + 0.9 * _drift("scrap" + str(seed), t_ms, 3 * HOUR), 0.3, 4.5)


def _window(line, t0, t1):
    """Aggregates of a line over [t0, t1]: run/stop minutes, units, OEE factors."""
    info = LINES[line]
    planned = float(t1 - t0)
    down = 0.0
    change = 0.0
    for stop in _stops(line, t0, t1):
        if stop[2] == "Changeover":
            change += stop[1] - stop[0]
        else:
            down += stop[1] - stop[0]
    run = max(planned - down - change, 0.0)
    # integrate speed on a 5-minute grid (aligned, so the sum is stable)
    step = 5 * MIN
    t = (t0 // step) * step + step // 2
    total = 0.0
    n = 0
    speed_sum = 0.0
    while t < t1:
        if t >= t0:
            s = _speed(line, t)
            total += s * step / float(HOUR)
            if s > 0:
                speed_sum += s
                n += 1
        t += step
    scrap = _scrap_pct(line, (t0 + t1) // 2)
    availability = 100.0 * run / planned if planned > 0 else 0.0
    performance = 100.0 * (speed_sum / n) / info["rated"] if n else 0.0
    quality = 100.0 - scrap
    return {
        "plannedMin": planned / MIN, "runMin": run / MIN, "downMin": down / MIN, "changeMin": change / MIN,
        "units": total, "good": total * quality / 100.0, "scrapPct": scrap,
        "availability": availability, "performance": performance, "quality": quality,
        "oee": availability * performance * quality / 10000.0,
    }


def _hourly(line, now, hours, key):
    """One value of _window() per whole hour, oldest first, ending with the current hour-to-date."""
    out = []
    top = (now // HOUR) * HOUR
    h = hours - 1
    while h >= 1:
        out.append(_window(line, top - h * HOUR, top - (h - 1) * HOUR)[key])
        h -= 1
    out.append(_window(line, top, max(now, top + 5 * MIN))[key])
    return out


# --------------------------------------------------------------------------
# Building blocks - one per component, each returns props-shaped data
# --------------------------------------------------------------------------

def meta(line, now_ms=None):
    """Names and labels for headers: line, product, shift, crew, clock."""
    now = _now(now_ms)
    line, info = _line(line)
    letter, s0, s1 = _shift(now)
    return {
        "line": line, "lineName": info["name"], "product": info["product"],
        "sku": _pick(info["sku"], "sku", info["seed"], now // (6 * HOUR)),
        "state": _state_at(line, now),
        "shift": "Shift " + letter, "crew": CREWS[int((now // (8 * HOUR)) % len(CREWS))],
        "shiftStart": s0, "shiftEnd": s1, "shiftProgress": _r(100.0 * (now - s0) / (s1 - s0), 1),
        "date": _iso_date(now), "time": _hhmm(now), "now": now,
        "subtitle": u"%s  \u00b7  %s  \u00b7  Shift %s" % (info["name"], info["product"], letter),
    }


def oee(line, now_ms=None, hours=8):
    """OEE Summary props: availability / performance / quality over the last `hours`."""
    now = _now(now_ms)
    line, info = _line(line)
    w = _window(line, now - hours * HOUR, now)
    return {
        "availability": _r(w["availability"]), "performance": _r(w["performance"]),
        "quality": _r(w["quality"]), "oee": _r(w["oee"]), "target": 85,
    }


def kpis(line, now_ms=None):
    """KPI Tile props for the six headline numbers of a line, keyed by KPI."""
    now = _now(now_ms)
    line, info = _line(line)
    letter, s0, s1 = _shift(now)
    cur = _window(line, now - 8 * HOUR, now)
    prev = _window(line, now - 16 * HOUR, now - 8 * HOUR)
    shift_now = _window(line, s0, max(now, s0 + 5 * MIN))
    shift_prev = _window(line, s0 - 8 * HOUR, s0)
    elapsed = max(now - s0, 5 * MIN) / float(8 * HOUR)
    speed_hist = [_r(_speed(line, now - i * 5 * MIN), 0) for i in range(35, -1, -1)]
    seed = info["seed"]
    kwh = lambda t: 21.5 + 2.4 * _drift("kwh" + str(seed), t, 4 * HOUR)
    return {
        "oee": {
            "title": "OEE", "unit": "%", "decimals": 1, "value": _r(cur["oee"]), "previous": _r(prev["oee"]),
            "target": 85, "higherIsBetter": True, "deltaLabel": "vs prev 8 h",
            "history": [_r(v) for v in _hourly(line, now, 24, "oee")],
        },
        "throughput": {
            "title": "Throughput", "unit": info["unit"], "decimals": 0, "value": _r(_speed(line, now), 0),
            "previous": _r(sum(speed_hist[:12]) / 12.0, 0), "target": info["rated"], "higherIsBetter": True,
            "deltaLabel": "vs 2 h ago", "history": speed_hist,
        },
        "good": {
            "title": "Good units this shift", "unit": "", "decimals": 0, "value": _r(shift_now["good"], 0),
            "previous": _r(shift_prev["good"] * elapsed, 0), "target": None, "higherIsBetter": True,
            "deltaLabel": "vs last shift",
            "history": [_r(v, 0) for v in _hourly(line, now, 24, "good")],
        },
        "scrap": {
            "title": "Scrap rate", "unit": "%", "decimals": 2, "value": _r(cur["scrapPct"], 2),
            "previous": _r(prev["scrapPct"], 2), "target": 1.5, "higherIsBetter": False, "deltaLabel": "vs prev 8 h",
            "history": [_r(_scrap_pct(line, now - i * 20 * MIN), 2) for i in range(35, -1, -1)],
        },
        "downtime": {
            "title": "Unplanned downtime", "unit": "min", "decimals": 0, "value": _r(cur["downMin"], 0),
            "previous": _r(prev["downMin"], 0), "target": None, "higherIsBetter": False, "deltaLabel": "vs prev 8 h",
            "history": [_r(v, 1) for v in _hourly(line, now, 24, "downMin")],
        },
        "energy": {
            "title": "Energy intensity", "unit": "kWh/kU", "decimals": 1, "value": _r(kwh(now)),
            "previous": _r(kwh(now - 8 * HOUR)), "target": 21.0, "higherIsBetter": False, "deltaLabel": "vs prev 8 h",
            "history": [_r(kwh(now - i * 30 * MIN)) for i in range(35, -1, -1)],
        },
    }


def trend(line, now_ms=None, minutes=120, step_s=60):
    """Industrial Trend props: line speed against its setpoint, with limits."""
    now = _now(now_ms)
    line, info = _line(line)
    step = step_s * 1000
    end = (now // step) * step
    pv = []
    sp = []
    t = end - minutes * MIN
    while t <= end:
        pv.append([t, _r(_speed(line, t), 0)])
        sp.append([t, info["rated"] * 0.95])
        t += step
    return {
        "data": {"pvData": pv, "spData": sp},
        "limits": {"hiAlarm": None, "hiWarning": info["rated"] * 1.0, "loWarning": info["rated"] * 0.8,
                   "loAlarm": info["rated"] * 0.5},
        "yAxisLabel": info["unit"],
    }


def process_trend(line, tag="fill", now_ms=None, minutes=120, step_s=60):
    """Industrial Trend props for a process value: "fill" (mL), "temp" (degC), "pressure" (bar), "co2" (g/L)."""
    now = _now(now_ms)
    line, info = _line(line)
    spec = {
        "fill": (330.0, 0.9, 2.2, 3.5, "mL"), "temp": (4.0, 0.5, 1.2, 2.0, u"\u00b0C"),
        "pressure": (2.8, 0.12, 0.3, 0.5, "bar"), "co2": (5.2, 0.12, 0.3, 0.5, "g/L"),
    }.get(tag, (100.0, 2.0, 5.0, 8.0, ""))
    sp_value, amp, warn, alarm, unit = spec
    step = step_s * 1000
    end = (now // step) * step
    pv = []
    sp = []
    t = end - minutes * MIN
    seed = tag + str(info["seed"])
    while t <= end:
        v = sp_value + amp * _drift(seed, t, 25 * MIN) + 0.25 * amp * _noise(seed + "j", float(t) / (90 * 1000))
        pv.append([t, _r(v, 2)])
        sp.append([t, sp_value])
        t += step
    return {
        "data": {"pvData": pv, "spData": sp},
        "limits": {"hiAlarm": sp_value + alarm, "hiWarning": sp_value + warn,
                   "loWarning": sp_value - warn, "loAlarm": sp_value - alarm},
        "yAxisLabel": unit,
    }


def state_timeline(line=None, now_ms=None, hours=8, by="line"):
    """State Timeline props. by="line": one lane per line. by="machine": the machines of `line`."""
    now = _now(now_ms)
    t0 = now - hours * HOUR
    events = []
    if by == "machine":
        line, info = _line(line)
        stops = _stops(line, t0, now)
        for idx in range(len(MACHINES)):
            machine = MACHINES[idx]
            mine = []
            for s in stops:
                owner = _h("own", s[0], info["seed"]) % len(MACHINES)
                if s[2] == "Changeover":
                    mine.append((s[0], s[1], "Changeover"))
                elif owner == idx:
                    mine.append((s[0], s[1], "Stopped"))
                elif s[2] == "Stopped":
                    # machines upstream of the faulted one block, downstream ones starve
                    mine.append((s[0] + 20000, s[1], "Blocked" if idx < owner else "Starved"))
                else:
                    mine.append((s[0], s[1], s[2]))
            events.extend(_lane(machine, t0, now, mine))
    else:
        for key in LINE_ORDER:
            mine = [(s[0], s[1], s[2]) for s in _stops(key, t0, now)]
            events.extend(_lane(LINES[key]["name"], t0, now, mine))
    return {"events": events, "stateColors": STATE_COLORS}


def _lane(lane, t0, t1, stops):
    """Fill the gaps between stops with Running, so a lane is continuous."""
    out = []
    cursor = t0
    for start, end, state in stops:
        if end <= cursor:
            continue
        start = max(start, cursor)
        if start > cursor:
            out.append({"lane": lane, "start": cursor, "end": start, "state": "Running"})
        out.append({"lane": lane, "start": start, "end": end, "state": state})
        cursor = end
    if cursor < t1:
        out.append({"lane": lane, "start": cursor, "end": t1, "state": "Running"})
    return out


def downtime_events(line=None, now_ms=None, hours=24):
    """Downtime Tracker props: every stop of every line (or one line's machines) in the window."""
    now = _now(now_ms)
    t0 = now - hours * HOUR
    events = []
    keys = LINE_ORDER
    if line is not None:
        keys = [_line(line)[0]]
    for key in keys:
        for s in _stops(key, t0, now):
            if s[2] in ("Starved", "Blocked"):
                continue
            equipment = LINES[key]["name"]
            if line is not None:
                equipment = MACHINES[_h("own", s[0], LINES[key]["seed"]) % len(MACHINES)]
            events.append({"equipment": equipment, "start": s[0], "end": s[1], "category": s[3], "reason": s[4]})
    return {"events": events, "categoryColors": CATEGORY_COLORS}


def pareto(line=None, now_ms=None, hours=24, by="reason", top=7):
    """Pareto props: downtime minutes by reason (or category), largest first. line=None: whole plant."""
    now = _now(now_ms)
    t0 = now - hours * HOUR
    totals = {}
    keys = LINE_ORDER
    if line is not None:
        keys = [_line(line)[0]]
    for key in keys:
        for s in _stops(key, t0, now):
            if s[2] != "Stopped":
                continue
            name = s[4] if by == "reason" else s[3]
            totals[name] = totals.get(name, 0.0) + (s[1] - s[0]) / float(MIN)
    names = sorted(totals.keys(), key=lambda k: (-totals[k], k))
    head = names[:top]
    categories = list(head)
    counts = [_r(totals[k], 0) for k in head]
    rest = sum([totals[k] for k in names[top:]])
    if rest > 0:
        categories.append("Other")
        counts.append(_r(rest, 0))
    return {"categories": categories, "counts": counts, "barLabel": "Downtime (min)"}


def bullets(now_ms=None):
    """Bullet Chart props: units produced this shift against the pro-rata plan, per line."""
    now = _now(now_ms)
    letter, s0, s1 = _shift(now)
    elapsed = max(now - s0, 5 * MIN) / float(HOUR)
    items = []
    for key in LINE_ORDER:
        info = LINES[key]
        w = _window(key, s0, max(now, s0 + 5 * MIN))
        plan = info["rated"] * 0.82 * elapsed
        items.append({"name": info["name"], "value": _r(w["good"] / 1000.0, 1), "target": _r(plan / 1000.0, 1)})
    return {"items": items, "unit": "k units", "decimals": 1}


def rings(now_ms=None, hours=8):
    """Metric Rings props: OEE of each line (outermost = Line 1), target 85 %."""
    now = _now(now_ms)
    metrics = []
    for key in LINE_ORDER:
        w = _window(key, now - hours * HOUR, now)
        metrics.append({"name": LINES[key]["name"], "value": _r(w["oee"]), "target": 85})
    return {"metrics": metrics}


def utilities(now_ms=None):
    """Dial Gauge / Metric Rings props for the plant utilities."""
    now = _now(now_ms)
    air = 6.9 + 0.35 * _drift("air", now, 40 * MIN)
    chilled = 3.6 + 0.9 * _drift("chw", now, 70 * MIN)
    steam = 8.4 + 0.5 * _drift("steam", now, 55 * MIN)
    co2 = 62.0 + 14.0 * _drift("co2", now, 6 * HOUR)
    power = 1480.0 + 210.0 * _drift("pwr", now, 90 * MIN)
    water = 1.92 + 0.18 * _drift("water", now, 5 * HOUR)
    return {
        "air": {"title": "Compressed air", "value": _r(air, 2), "unit": "bar", "min": 5, "max": 9, "decimals": 2,
                "target": 7.0, "stages": [{"upTo": 6.2, "color": "#e05252", "name": "Low"},
                                          {"upTo": 6.6, "color": "#e6a23c", "name": "Marginal"},
                                          {"color": "#3ba272", "name": "Normal"}]},
        "chilled": {"title": "Chilled water", "value": _r(chilled, 1), "unit": u"\u00b0C", "min": 0, "max": 10,
                    "decimals": 1, "target": 4.0, "stages": [{"upTo": 5.0, "color": "#3ba272", "name": "Normal"},
                                                             {"upTo": 6.5, "color": "#e6a23c", "name": "Warm"},
                                                             {"color": "#e05252", "name": "High"}]},
        "steam": {"title": "Steam header", "value": _r(steam, 1), "unit": "bar", "min": 0, "max": 12, "decimals": 1,
                  "target": 8.5, "stages": [{"upTo": 7.0, "color": "#e05252", "name": "Low"},
                                            {"upTo": 7.8, "color": "#e6a23c", "name": "Marginal"},
                                            {"upTo": 9.5, "color": "#3ba272", "name": "Normal"},
                                            {"color": "#e05252", "name": "High"}]},
        "co2": {"title": "CO2 tank", "value": _r(co2, 0), "unit": "%", "min": 0, "max": 100, "decimals": 0,
                "target": 25, "stages": [{"upTo": 25, "color": "#e05252", "name": "Reorder"},
                                         {"upTo": 40, "color": "#e6a23c", "name": "Low"},
                                         {"color": "#3ba272", "name": "OK"}]},
        "power": {"title": "Site power", "value": _r(power, 0), "unit": "kW", "min": 0, "max": 2200, "decimals": 0},
        "water": {"title": "Water ratio", "value": _r(water, 2), "unit": "L/L", "min": 1, "max": 3, "decimals": 2},
        "loadRings": {"metrics": [
            {"name": "Power", "value": _r(100.0 * power / 2200.0, 0), "target": 80},
            {"name": "Steam", "value": _r(100.0 * steam / 12.0, 0), "target": 75},
            {"name": "Chilled water", "value": _r(48.0 + 16.0 * _drift("chl", now, 80 * MIN), 0), "target": 70},
            {"name": "Compressed air", "value": _r(63.0 + 14.0 * _drift("cal", now, 45 * MIN), 0), "target": 85},
        ]},
    }


def alarm_heatmap(line=None, now_ms=None):
    """Event Heatmap props: alarm counts by weekday and hour over the last 4 weeks."""
    now = _now(now_ms)
    seed = "plant" if line is None else str(_line(line)[1]["seed"])
    week = now // (7 * DAY)
    cells = []
    for day in range(1, 8):
        for hour in range(24):
            base = 3.0 + 2.5 * math.sin((hour - 3) * math.pi / 12.0)
            # shift handovers (06, 14, 22 UTC) and Monday start-ups are noisy
            if hour in (6, 14, 22):
                base += 7.0
            if hour in (7, 15, 23):
                base += 3.0
            if day == 1 and 5 <= hour <= 9:
                base += 6.0
            if day >= 6:
                base *= 0.55
            value = base * (0.55 + 0.9 * _u("hm", seed, week, day, hour))
            cells.append({"day": day, "hour": hour, "value": int(round(max(value, 0.0)))})
    return {"cells": cells, "valueLabel": "alarms"}


def waterfall(line, now_ms=None, hours=8):
    """Waterfall props: planned time down to productive time (minutes) for a line."""
    now = _now(now_ms)
    line, info = _line(line)
    w = _window(line, now - hours * HOUR, now)
    planned = w["plannedMin"]
    minor = 0.0
    breakdown = 0.0
    for s in _stops(line, now - hours * HOUR, now):
        mins = (s[1] - s[0]) / float(MIN)
        if s[2] in ("Starved", "Blocked"):
            minor += mins
        elif s[2] == "Stopped":
            breakdown += mins
    run = planned - breakdown - w["changeMin"] - minor
    speed_loss = run * (1.0 - w["performance"] / 100.0)
    scrap_loss = (run - speed_loss) * w["scrapPct"] / 100.0
    return {
        "unit": "min",
        "steps": [
            {"name": "Planned time", "value": _r(planned, 0), "type": "total"},
            {"name": "Breakdowns", "value": -_r(breakdown, 0)},
            {"name": "Changeover", "value": -_r(w["changeMin"], 0)},
            {"name": "Minor stops", "value": -_r(minor, 0)},
            {"name": "Run time", "type": "subtotal"},
            {"name": "Reduced speed", "value": -_r(speed_loss, 0)},
            {"name": "Scrap & rework", "value": -_r(scrap_loss, 0)},
            {"name": "Productive time", "type": "total"},
        ],
    }


def radar(now_ms=None, hours=8):
    """Radar Comparison props: the three lines on six metrics, with a target outline."""
    now = _now(now_ms)
    series = []
    for key in LINE_ORDER:
        info = LINES[key]
        w = _window(key, now - hours * HOUR, now)
        seed = info["seed"]
        series.append({"name": info["name"], "values": [
            _r(w["oee"]), _r(w["availability"]), _r(w["performance"]), _r(w["scrapPct"], 2),
            _r(24.0 + 9.0 * _drift("co" + str(seed), now, 9 * HOUR), 0),
            _r(21.5 + 2.4 * _drift("kwh" + str(seed), now, 4 * HOUR)),
        ]})
    return {
        "metrics": [
            {"name": "OEE", "unit": "%", "min": 40, "max": 100},
            {"name": "Availability", "unit": "%", "min": 60, "max": 100},
            {"name": "Performance", "unit": "%", "min": 70, "max": 100},
            {"name": "Scrap", "unit": "%", "min": 0, "max": 5, "higherIsBetter": False},
            {"name": "Changeover", "unit": "min", "min": 10, "max": 45, "higherIsBetter": False},
            {"name": "Energy", "unit": "kWh/kU", "min": 16, "max": 28, "higherIsBetter": False},
        ],
        "series": series,
        "target": {"name": "Target", "values": [85, 92, 95, 1.5, 20, 21]},
    }


def samples(line, tag="fill", now_ms=None, count=120):
    """Measurement samples (oldest first) for SPC and Capability Histogram, plus the spec."""
    now = _now(now_ms)
    line, info = _line(line)
    spec = {
        "fill": (330.0, 0.85, 327.0, 333.0, "mL", 2), "torque": (1.9, 0.11, 1.5, 2.3, u"N\u00b7m", 2),
        "co2": (5.2, 0.09, 4.9, 5.5, "g/L", 2), "brix": (10.6, 0.07, 10.3, 10.9, u"\u00b0Bx", 2),
    }.get(tag, (100.0, 1.0, 96.0, 104.0, "", 2))
    target, sigma, lsl, usl, unit, decimals = spec
    period = 2 * MIN  # one sample every two minutes; the window scrolls with time
    last = now // period
    values = []
    seed = tag + str(info["seed"])
    i = count - 1
    while i >= 0:
        k = last - i
        shift = 0.55 * sigma * _drift(seed + "m", k * period, 3 * HOUR)
        # an occasional assignable cause: a short run of shifted samples
        if _u(seed, "run", k // 9) < 0.08:
            shift += 1.6 * sigma
        values.append(_r(target + shift + sigma * _gauss(seed, k), decimals + 1))
        i -= 1
    return {"values": values, "target": target, "lsl": lsl, "usl": usl, "unit": unit, "decimals": decimals}


def flow(kind="energy", now_ms=None):
    """Flow Diagram props. kind="energy": site energy (MWh/day). kind="material": bottles through a line (k units)."""
    now = _now(now_ms)
    if kind == "material":
        total = 262.0 + 22.0 * _drift("mat", now, 6 * HOUR)
        rinse = total * 0.004
        fill = total * (0.007 + 0.003 * _drift("fl", now, 4 * HOUR))
        label = total * 0.005
        pack = total * 0.003
        good = total - rinse - fill - label - pack
        flows = [
            {"source": "Depalletised", "target": "Rinser", "value": _r(total)},
            {"source": "Rinser", "target": "Filler", "value": _r(total - rinse)},
            {"source": "Rinser", "target": "Rejects", "value": _r(rinse)},
            {"source": "Filler", "target": "Labeller", "value": _r(total - rinse - fill)},
            {"source": "Filler", "target": "Rejects", "value": _r(fill)},
            {"source": "Labeller", "target": "Packer", "value": _r(total - rinse - fill - label)},
            {"source": "Labeller", "target": "Rework", "value": _r(label)},
            {"source": "Packer", "target": "Palletised", "value": _r(good)},
            {"source": "Packer", "target": "Rework", "value": _r(pack)},
        ]
        nodes = [{"name": "Rejects", "color": "#e05252"}, {"name": "Rework", "color": "#e6a23c"},
                 {"name": "Palletised", "color": "#3ba272"}]
        return {"flows": flows, "nodes": nodes, "unit": "k units", "decimals": 1}
    grid = 31.0 + 4.0 * _drift("grid", now, 8 * HOUR)
    solar = max(0.0, 6.5 * math.sin(((now % DAY) / float(HOUR) - 6.0) * math.pi / 12.0)) + 0.4
    gas = 18.0 + 2.5 * _drift("gas", now, 7 * HOUR)
    elec = grid + solar
    flows = [
        {"source": "Grid", "target": "Electricity", "value": _r(grid)},
        {"source": "Solar PV", "target": "Electricity", "value": _r(solar)},
        {"source": "Natural gas", "target": "Boiler house", "value": _r(gas)},
        {"source": "Electricity", "target": "Packaging lines", "value": _r(elec * 0.41)},
        {"source": "Electricity", "target": "Refrigeration", "value": _r(elec * 0.24)},
        {"source": "Electricity", "target": "Compressed air", "value": _r(elec * 0.17)},
        {"source": "Electricity", "target": "Water treatment", "value": _r(elec * 0.08)},
        {"source": "Electricity", "target": "Lighting & HVAC", "value": _r(elec * 0.10)},
        {"source": "Boiler house", "target": "Pasteuriser", "value": _r(gas * 0.52)},
        {"source": "Boiler house", "target": "CIP", "value": _r(gas * 0.27)},
        {"source": "Boiler house", "target": "Losses", "value": _r(gas * 0.21)},
        {"source": "Compressed air", "target": "Losses", "value": _r(elec * 0.17 * 0.28)},
        {"source": "Compressed air", "target": "Packaging lines", "value": _r(elec * 0.17 * 0.72)},
    ]
    nodes = [{"name": "Grid", "color": "#5b7fa6"}, {"name": "Solar PV", "color": "#eda100"},
             {"name": "Natural gas", "color": "#c97b4a"}, {"name": "Losses", "color": "#6b7590"}]
    return {"flows": flows, "nodes": nodes, "unit": "MWh", "decimals": 1}


def energy_series(now_ms=None, hours=24):
    """Hourly energy by utility for generic bar / line charts: labels plus one list per series."""
    now = _now(now_ms)
    top = (now // HOUR) * HOUR
    labels = []
    elec = []
    gas = []
    water = []
    air = []
    h = hours - 1
    while h >= 0:
        t = top - h * HOUR
        hour = (t % DAY) // HOUR
        load = 0.78 + 0.16 * math.sin((hour - 9) * math.pi / 12.0)
        labels.append("%02d:00" % hour)
        elec.append(_r(1480.0 * load * (1.0 + 0.06 * _noise("e", float(t) / HOUR)), 0))
        gas.append(_r(760.0 * load * (1.0 + 0.08 * _noise("g", float(t) / HOUR)), 0))
        water.append(_r(42.0 * load * (1.0 + 0.07 * _noise("w", float(t) / HOUR)), 1))
        air.append(_r(255.0 * load * (1.0 + 0.05 * _noise("a", float(t) / HOUR)), 0))
        h -= 1
    return {"labels": labels, "electricity": elec, "gas": gas, "water": water, "air": air}


def gantt(now_ms=None, days=3):
    """Gantt props: production orders per line around now, with progress, CIP and maintenance."""
    now = _now(now_ms)
    start_day = (now // DAY) * DAY - DAY
    tasks = []
    colors = {"L1": "#5b8def", "L2": "#3ba272", "L3": "#e6a23c"}
    for key in LINE_ORDER:
        info = LINES[key]
        t = start_day + (info["seed"] % 3) * HOUR
        n = 0
        while t < start_day + days * DAY:
            dur = (5 + _h("gd", info["seed"], t // HOUR) % 6) * HOUR
            sku = _pick(info["sku"], "gs", info["seed"], t // HOUR)
            end = t + dur
            progress = _clamp(100.0 * (now - t) / float(dur), 0.0, 100.0)
            tasks.append({"name": u"%s  \u00b7  %s" % (info["name"], sku), "start": t, "end": end,
                          "progress": _r(progress, 0), "category": info["name"], "color": colors[key]})
            n += 1
            if n % 3 == 0:
                tasks.append({"name": u"%s  \u00b7  CIP" % info["name"], "start": end, "end": end + 90 * MIN,
                              "progress": _r(_clamp(100.0 * (now - end) / (90.0 * MIN), 0.0, 100.0), 0),
                              "category": "CIP", "color": "#48b8d0"})
                end += 90 * MIN
            else:
                end += 25 * MIN
            t = end
    tasks.append({"name": u"Line 2  \u00b7  Filler valve overhaul", "start": start_day + 2 * DAY + 6 * HOUR,
                  "end": start_day + 2 * DAY + 14 * HOUR, "progress": 0, "category": "Maintenance",
                  "color": "#b08bd9"})
    tasks.append({"name": "Audit sample release", "start": start_day + 2 * DAY + 10 * HOUR,
                  "end": start_day + 2 * DAY + 10 * HOUR, "milestone": True, "category": "Quality"})
    return {"tasks": tasks}


def shift_calendar(now_ms=None, days=28):
    """Shift Calendar props: four crews on a rotating pattern over the current four weeks."""
    now = _now(now_ms)
    monday = (now // DAY - _weekday(now)) * DAY - 7 * DAY
    return {
        "patterns": [
            {"name": "Early", "color": "#5b8def", "days": [1, 2, 3, 4, 5]},
            {"name": "Late", "color": "#e6a23c", "days": [1, 2, 3, 4, 5]},
            {"name": "Night", "color": "#b08bd9", "days": [0, 1, 2, 3, 4]},
            {"name": "Weekend", "color": "#3ba272", "days": [0, 6]},
        ],
        "crews": [
            {"crew": "Crew Red", "pattern": "Early"}, {"crew": "Crew Blue", "pattern": "Late"},
            {"crew": "Crew Green", "pattern": "Night"}, {"crew": "Crew Amber", "pattern": "Weekend"},
        ],
        "dateRange": [_iso_date(monday), _iso_date(monday + (days - 1) * DAY)],
    }


def schedule_calendar(now_ms=None):
    """Schedule Calendar props: the crew on the early shift for every day of the current year."""
    now = _now(now_ms)
    year = _ymd(now)[0]
    entries = []
    # days since epoch of 1 January: walk back from today
    t = (now // DAY) * DAY
    while _ymd(t)[0] == year:
        t -= DAY
    t += DAY
    idx = 0
    shifts = ["Early", "Late", "Night", "Off"]
    while _ymd(t)[0] == year:
        shift = shifts[(idx // 2) % 4]
        if shift != "Off":
            entries.append({"date": _iso_date(t), "shift": shift, "crew": "Crew Red"})
        t += DAY
        idx += 1
    return {"year": str(year), "entries": entries,
            "shiftColors": {"Early": "#5b8def", "Late": "#e6a23c", "Night": "#b08bd9"}}


def batches(now_ms=None, count=5):
    """Batch Timeline props: syrup-room batches (S88 phases) over the last day."""
    now = _now(now_ms)
    phases = [("Charge", 25), ("Dissolve", 45), ("Blend", 60), ("QA hold", 30), ("Transfer", 35), ("CIP", 50)]
    out = []
    cycle = 5 * HOUR
    first = (now // cycle) * cycle - (count - 1) * cycle
    for b in range(count):
        t = first + b * cycle
        number = int(t // cycle) % 9000 + 1000
        name = "SYR-%d" % number
        for pname, minutes in phases:
            dur = int(minutes * (0.85 + 0.3 * _u("bt", number, pname))) * MIN
            if t >= now:
                break
            end = t + dur
            status = "Complete"
            if end > now:
                end = now
                status = "Running"
            out.append({"batch": name, "phase": pname, "start": t, "end": end, "status": status})
            t += dur
    return {"phases": out, "phaseColors": {"Charge": "#5b8def", "Dissolve": "#48b8d0", "Blend": "#3ba272",
                                           "QA hold": "#e6a23c", "Transfer": "#b08bd9", "CIP": "#6b7590"}}


def resource_heatmap(now_ms=None, hours=12):
    """Resource Heatmap props: utilisation (%) of each machine group per hour."""
    now = _now(now_ms)
    top = (now // HOUR) * HOUR
    slots = []
    h = hours - 1
    while h >= 0:
        slots.append("%02d:00" % (((top - h * HOUR) % DAY) // HOUR))
        h -= 1
    resources = []
    rows = []
    for key in LINE_ORDER:
        for machine in ("Filler", "Labeller", "Packer"):
            resources.append("%s %s" % (LINES[key]["name"], machine))
            row = []
            h = hours - 1
            while h >= 0:
                w = _window(key, top - h * HOUR, top - (h - 1) * HOUR)
                wobble = 6.0 * _noise(machine + key, float(top - h * HOUR) / HOUR)
                row.append(int(round(_clamp(w["availability"] * w["performance"] / 100.0 + wobble, 0.0, 100.0))))
                h -= 1
            rows.append(row)
    return {"resources": resources, "timeSlots": slots, "utilization": rows, "maxValue": 100}


def sku_mix(now_ms=None):
    """Hierarchy for sunburst / treemap: line -> SKU -> units today. Also a flat list for pies."""
    now = _now(now_ms)
    day0 = (now // DAY) * DAY
    tree = []
    flat = []
    for key in LINE_ORDER:
        info = LINES[key]
        total = _window(key, day0, max(now, day0 + HOUR))["good"]
        weights = [0.2 + _u("mix", info["seed"], sku, day0 // DAY) for sku in info["sku"]]
        wsum = sum(weights)
        children = []
        for i in range(len(info["sku"])):
            value = _r(total * weights[i] / wsum / 1000.0)
            children.append({"name": info["sku"][i], "value": value})
            flat.append({"name": info["sku"][i], "value": value})
        tree.append({"name": info["name"], "children": children})
    return {"tree": tree, "flat": flat, "unit": "k units"}


def calendar_days(now_ms=None, days=182):
    """[date, value] rows for a calendar heatmap: plant OEE per day, oldest first, and the date range."""
    now = _now(now_ms)
    today = (now // DAY) * DAY
    rows = []
    d = days - 1
    while d >= 0:
        t = today - d * DAY
        value = 74.0 + 9.0 * _drift("cal", t, 21 * DAY) + 4.0 * _noise("cald", float(t) / DAY)
        if _weekday(t) >= 5:
            value -= 5.0
        rows.append([_iso_date(t), _r(value)])
        d -= 1
    return {"data": rows, "range": [rows[0][0], rows[-1][0]]}


# >>> line / quality page helpers (begin)
# --------------------------------------------------------------------------
# Line Performance page (line_*) and Quality page (quality_*)
# Helpers that only these two pages use. They derive from the plant model
# above, so their numbers agree with the building blocks the other pages use.
# --------------------------------------------------------------------------

def line_allocate(total, weights):
    """Split the integer `total` over `weights` (largest remainder): integers that sum to total."""
    wsum = 0.0
    for w in weights:
        wsum += max(float(w), 0.0)
    n = len(weights)
    if n == 0:
        return []
    if wsum <= 0:
        out = [0] * n
        out[0] = int(total)
        return out
    out = []
    rest = []
    used = 0
    for i in range(n):
        exact = max(float(weights[i]), 0.0) * total / wsum
        base = int(math.floor(exact))
        out.append(base)
        used += base
        rest.append((base - exact, i))
    rest.sort()
    left = int(total) - used
    i = 0
    while left > 0:
        out[rest[i % n][1]] += 1
        left -= 1
        i += 1
    return out


def line_machines():
    """The machines the Line Performance page shows, in the order of the line."""
    return ["Filler", "Capper", "Labeller", "Packer", "Palletiser"]


def line_owner(reason):
    """Index into line_machines() of the machine a stop reason belongs to."""
    return {
        "Filler jam": 0, "Fill-level hold": 0, "Low CO2": 0, "Infeed jam": 0,
        "Capper wear": 1, "Closure feed": 1,
        "Labeller drive": 2, "Label reel": 2,
        "Packer sensor": 3, "Belt tracking": 3,
        "Wrap film": 4,
    }.get(reason, 0)


def line_machine_states(line, now_ms=None, hours=8):
    """State Timeline props: one lane per machine of the line. The faulted machine is Stopped,
    the ones before it block and the ones after it starve, a little later per machine in between."""
    now = _now(now_ms)
    line, info = _line(line)
    t0 = now - hours * HOUR
    stops = _stops(line, t0, now)
    names = line_machines()
    events = []
    # last machine first: the component draws the first lane at the bottom
    idx = len(names) - 1
    while idx >= 0:
        mine = []
        for s in stops:
            if s[2] != "Stopped":
                mine.append((s[0], s[1], s[2]))
                continue
            owner = line_owner(s[4])
            if idx == owner:
                mine.append((s[0], s[1], "Stopped"))
            else:
                start = s[0] + 30000 * abs(idx - owner)
                if start < s[1]:
                    mine.append((start, s[1], "Blocked" if idx < owner else "Starved"))
        events.extend(_lane(names[idx], t0, now, mine))
        idx -= 1
    return {"events": events, "stateColors": STATE_COLORS}


def line_downtime(line, now_ms=None, hours=24):
    """Downtime Tracker props: the unplanned stops of the line, booked on the machine that caused them."""
    now = _now(now_ms)
    line, info = _line(line)
    names = line_machines()
    rows = []
    for s in _stops(line, now - hours * HOUR, now):
        if s[2] == "Stopped":
            # negative index: the component draws the first equipment at the bottom
            rows.append((-line_owner(s[4]), s[0], s[1], s[3], s[4]))
    rows.sort()
    events = []
    for r in rows:
        events.append({"equipment": names[-r[0]], "start": r[1], "end": r[2], "category": r[3], "reason": r[4]})
    return {"events": events, "categoryColors": CATEGORY_COLORS}


def line_pareto(line, now_ms=None, hours=24, top=6):
    """Pareto props: stop minutes by reason for the same stops as line_downtime(), so both totals agree.
    Minutes carry one decimal and are balanced to add up to the total the Downtime Tracker prints."""
    now = _now(now_ms)
    line, info = _line(line)
    totals = {}
    all_ms = 0
    for s in _stops(line, now - hours * HOUR, now):
        if s[2] == "Stopped":
            totals[s[4]] = totals.get(s[4], 0) + (s[1] - s[0])
            all_ms += s[1] - s[0]
    names = sorted(totals.keys(), key=lambda k: (-totals[k], k))
    head = names[:top]
    weights = [totals[k] for k in head]
    rest = 0
    for k in names[top:]:
        rest += totals[k]
    categories = list(head)
    if rest > 0:
        categories.append("Other")
        weights.append(rest)
    tenths = line_allocate(int(round(all_ms / 6000.0)), weights)
    return {"categories": categories, "counts": [t / 10.0 for t in tenths], "barLabel": "Downtime (min)",
            "total": int(round(all_ms / 6000.0)) / 10.0}


def line_waterfall(line, now_ms=None, hours=8):
    """Waterfall props: planned time down to productive time. Uses the factors of oee(), so
    run time / planned time is the availability and productive time / planned time is the OEE."""
    now = _now(now_ms)
    line, info = _line(line)
    t0 = now - hours * HOUR
    w = _window(line, t0, now)
    planned = w["plannedMin"]
    minor = 0.0
    breakdown = 0.0
    for s in _stops(line, t0, now):
        mins = (s[1] - s[0]) / float(MIN)
        if s[2] in ("Starved", "Blocked"):
            minor += mins
        elif s[2] == "Stopped":
            breakdown += mins
    run = planned - breakdown - minor - w["changeMin"]
    speed_loss = run * (1.0 - w["performance"] / 100.0)
    scrap_loss = (run - speed_loss) * (1.0 - w["quality"] / 100.0)
    productive = run - speed_loss - scrap_loss
    # tenths of a minute that add up to the planned time exactly
    parts = line_allocate(int(round(planned * 10)), [breakdown, w["changeMin"], minor, speed_loss, scrap_loss, productive])
    return {
        "unit": "min",
        "decimals": 1,
        "steps": [
            {"name": "Planned time", "value": int(round(planned * 10)) / 10.0, "type": "total"},
            {"name": "Breakdowns", "value": -parts[0] / 10.0},
            {"name": "Changeover", "value": -parts[1] / 10.0},
            {"name": "Minor stops", "value": -parts[2] / 10.0},
            {"name": "Run time", "type": "subtotal"},
            {"name": "Reduced speed", "value": -parts[3] / 10.0},
            {"name": "Scrap", "value": -parts[4] / 10.0},
            {"name": "Productive time", "type": "total"},
        ],
    }


def line_hourly_output(line, now_ms=None, hours=8):
    """Bullet Chart props: good units per clock hour against the plan (82 % of rated speed, as bullets()).
    The running hour gets the plan for the minutes elapsed."""
    now = _now(now_ms)
    line, info = _line(line)
    top = (now // HOUR) * HOUR
    plan = info["rated"] * 0.82 / 1000.0
    items = []
    h = hours - 1
    while h >= 0:
        start = top - h * HOUR
        end = start + HOUR
        share = 1.0
        if h == 0:
            end = max(now, start + 5 * MIN)
            share = (end - start) / float(HOUR)
        w = _window(line, start, end)
        items.append({"name": _hhmm(start), "value": _r(w["good"] / 1000.0), "target": _r(plan * share),
                      "max": _r(plan * 1.3)})
        h -= 1
    return {"items": items, "unit": "k", "decimals": 1}


def line_stop_stats(line, t0, t1):
    """(number of unplanned stops, their minutes, run minutes) of a line in [t0, t1]. Minor stops count."""
    count = 0
    down = 0
    change = 0
    for s in _stops(line, t0, t1):
        if s[2] == "Changeover":
            change += s[1] - s[0]
        else:
            count += 1
            down += s[1] - s[0]
    return count, down / float(MIN), (t1 - t0 - down - change) / float(MIN)


def line_kpis(line, now_ms=None, hours=8):
    """KPI Tile props for the Line Performance page: the three line tiles of kpis() plus
    stops, MTTR and MTBF. MTTR x stops is the unplanned downtime of kpis()."""
    now = _now(now_ms)
    line, info = _line(line)
    out = kpis(line, now)
    span = hours * HOUR
    top = (now // HOUR) * HOUR
    stops_h = []
    mttr_h = []
    mtbf_h = []
    i = 23
    while i >= 0:
        end = top - i * HOUR
        if i == 0:
            end = now
        n, down, run = line_stop_stats(line, end - span, end)
        hour_n = line_stop_stats(line, top - i * HOUR, max(now, top + MIN) if i == 0 else top - (i - 1) * HOUR)[0]
        stops_h.append(hour_n)
        mttr_h.append(_r(down / n if n else 0.0))
        mtbf_h.append(_r(run / n if n else run, 0))
        i -= 1
    n, down, run = line_stop_stats(line, now - span, now)
    pn, pdown, prun = line_stop_stats(line, now - 2 * span, now - span)
    return {
        "throughput": out["throughput"], "good": out["good"], "downtime": out["downtime"],
        "stops": {
            "title": "Unplanned stops", "unit": "", "decimals": 0, "value": n, "previous": pn, "target": None,
            "higherIsBetter": False, "deltaLabel": "vs prev 8 h", "history": stops_h,
        },
        "mttr": {
            "title": "MTTR", "unit": "min", "decimals": 1, "value": _r(down / n if n else 0.0),
            "previous": _r(pdown / pn if pn else 0.0), "target": None, "higherIsBetter": False,
            "deltaLabel": "vs prev 8 h", "history": mttr_h,
        },
        "mtbf": {
            "title": "MTBF", "unit": "min", "decimals": 0, "value": _r(run / n if n else run, 0),
            "previous": _r(prun / pn if pn else prun, 0), "target": None, "higherIsBetter": True,
            "deltaLabel": "vs prev 8 h", "history": mtbf_h,
        },
    }


def quality_spec(line, tag="fill"):
    """(target, sigma, lsl, usl, unit, decimals) of a measured characteristic on a line."""
    if tag == "torque":
        return (1.90, 0.075, 1.50, 2.30, u"N\u00b7m", 2)
    return {
        "L1": (330.0, 0.62, 327.0, 333.0, "mL", 1),
        "L2": (1500.0, 2.3, 1490.0, 1510.0, "mL", 1),
        "L3": (500.0, 0.85, 496.0, 504.0, "mL", 1),
    }[line]


def quality_drift(line, t_ms):
    """0..1: how far the filler of Line 2 has crept up at a time. The story of the Quality page:
    it runs centred for an hour, creeps up for three and is re-centred every four hours
    (02:20, 06:20, ... UTC). The other lines stay centred."""
    if line != "L2":
        return 0.0
    phase = ((t_ms - 140 * MIN) % (4 * HOUR)) / float(4 * HOUR)
    if phase < 0.25:
        return 0.0
    return (phase - 0.25) / 0.75


def quality_fill_values(line, end_ms, subgroups=24, size=5):
    """Fill volumes, oldest first: `size` consecutive containers every 10 minutes up to end_ms."""
    info = LINES[line]
    target, sigma, lsl, usl, unit, decimals = quality_spec(line, "fill")
    period = 10 * MIN
    last = end_ms // period
    seed = "qfill" + str(info["seed"])
    values = []
    i = subgroups - 1
    while i >= 0:
        k = last - i
        t = k * period
        centre = target + 0.12 * sigma + 0.22 * sigma * _drift(seed + "m", t, 3 * HOUR)
        centre += 2.7 * sigma * quality_drift(line, t)
        for j in range(size):
            values.append(_r(centre + sigma * _gauss(seed, k, j), decimals))
        i -= 1
    return values


def quality_stats(values, lsl, usl, size=5):
    """Statistics of measurements the way the SPC Chart (X-bar & R) and the Capability Histogram
    (overall sigma) calculate them, so that tiles and charts show the same numbers."""
    d2 = {2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326}[size]
    a2 = {2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577}[size]
    n = len(values)
    mean = sum(values) / float(n)
    squares = 0.0
    out = 0
    for v in values:
        squares += (v - mean) * (v - mean)
        if v < lsl or v > usl:
            out += 1
    sigma = math.sqrt(squares / (n - 1))
    means = []
    ranges = []
    g = 0
    while (g + 1) * size <= n:
        group = values[g * size:(g + 1) * size]
        means.append(sum(group) / float(size))
        ranges.append(max(group) - min(group))
        g += 1
    centre = sum(means) / float(len(means))
    rbar = sum(ranges) / float(len(ranges))
    within = rbar / d2
    ucl = centre + a2 * rbar
    lcl = centre - a2 * rbar
    signals = 0
    for m in means:
        if m > ucl or m < lcl:
            signals += 1
    return {
        "n": n, "mean": mean, "sigma": sigma, "sigmaWithin": within,
        "pp": (usl - lsl) / (6.0 * sigma), "ppk": min(usl - mean, mean - lsl) / (3.0 * sigma),
        "cpk": min(usl - mean, mean - lsl) / (3.0 * within),
        "ucl": ucl, "lcl": lcl, "signals": signals, "outOfSpec": out, "means": means,
    }


def quality_torque_values(line, end_ms, heads=8, count=24):
    """Closure torque per capper head, oldest first: one closure per head every 10 minutes.
    Head 4 of Line 2 has a worn chuck: it runs low and scatters more."""
    info = LINES[line]
    target, sigma, lsl, usl, unit, decimals = quality_spec(line, "torque")
    period = 10 * MIN
    last = end_ms // period
    seed = "qtrq" + str(info["seed"])
    out = []
    for head in range(heads):
        offset = 0.045 * (_u(seed, "off", head) * 2.0 - 1.0)
        spread = sigma * (0.85 + 0.3 * _u(seed, "spr", head))
        if line == "L2" and head == 3:
            offset = -0.21
            spread = sigma * 1.75
        row = []
        i = count - 1
        while i >= 0:
            k = last - i
            row.append(_r(target + offset + spread * _gauss(seed, head, k), decimals))
            i -= 1
        out.append(row)
    return out


def quality_quantile(ordered, q):
    """Quantile of an ascending list by linear interpolation."""
    pos = q * (len(ordered) - 1)
    lo = int(math.floor(pos))
    hi = min(lo + 1, len(ordered) - 1)
    return ordered[lo] + (ordered[hi] - ordered[lo]) * (pos - lo)


def quality_torque(line, now_ms=None):
    """Boxplot option data for closure torque by capper head (whiskers at 1.5 IQR, the rest as
    outliers), the specification, and the pooled Ppk."""
    now = _now(now_ms)
    line, info = _line(line)
    target, sigma, lsl, usl, unit, decimals = quality_spec(line, "torque")
    rows = quality_torque_values(line, now)
    boxes = []
    outliers = []
    pooled = []
    heads = []
    low = lsl
    high = usl
    for head in range(len(rows)):
        ordered = sorted(rows[head])
        pooled.extend(rows[head])
        q1 = quality_quantile(ordered, 0.25)
        q2 = quality_quantile(ordered, 0.5)
        q3 = quality_quantile(ordered, 0.75)
        fence = 1.5 * (q3 - q1)
        inside = [v for v in ordered if q1 - fence <= v <= q3 + fence]
        boxes.append([inside[0], _r(q1, 3), _r(q2, 3), _r(q3, 3), inside[-1]])
        for v in ordered:
            if v < q1 - fence or v > q3 + fence:
                outliers.append([head, v])
        heads.append("Head %d" % (head + 1))
        low = min(low, ordered[0])
        high = max(high, ordered[-1])
    stats = quality_stats(pooled, lsl, usl, 2)
    return {
        "heads": heads, "boxes": boxes, "outliers": outliers,
        "limits": [{"name": "USL", "yAxis": usl}, {"name": "LSL", "yAxis": lsl},
                   {"name": "Target", "yAxis": target, "lineStyle": {"color": "#3ba272"}, "label": {"color": "#3ba272"}}],
        "min": _r(math.floor((low - 0.05) * 10.0) / 10.0, 1), "max": _r(math.ceil((high + 0.05) * 10.0) / 10.0, 1),
        "axisName": u"Torque (%s)" % unit, "lsl": lsl, "usl": usl, "target": target,
        "ppk": _r(stats["ppk"], 2), "outOfSpec": stats["outOfSpec"], "n": stats["n"],
    }


def quality_defect_types():
    """(category, defect type, weight) of the reject reasons at the inspection stations."""
    return [
        ("Fill", "Underfill", 13), ("Fill", "Overfill", 8),
        ("Closure", "Loose cap", 9), ("Closure", "Cocked cap", 7),
        ("Label", "Skewed label", 17), ("Label", "Missing code", 8),
        ("Container", "Damaged", 21), ("Container", "Foreign body", 5),
    ]


def quality_rejects(line, now_ms=None, hours=12):
    """Rejects by defect type and clock hour for the last `hours` (the last column is the running hour).
    An hour's rejects are its units times its scrap rate (the plant model), split over the defect
    types with whole numbers. On Line 2 the split follows the story: overfills grow with the filler
    drift and the worn capper head keeps loose caps high."""
    now = _now(now_ms)
    line, info = _line(line)
    seed = info["seed"]
    types = quality_defect_types()
    top = (now // HOUR) * HOUR
    labels = []
    units = []
    totals = []
    matrix = [[] for t in types]
    h = hours - 1
    while h >= 0:
        start = top - h * HOUR
        end = start + HOUR
        if h == 0:
            end = max(now, start + 5 * MIN)
        w = _window(line, start, end)
        rejects = int(round(w["units"] * w["scrapPct"] / 100.0))
        drift = quality_drift(line, min(start + 30 * MIN, now))
        weights = []
        for ti in range(len(types)):
            wt = types[ti][2] * (0.7 + 0.6 * _u("qdef", seed, types[ti][1], start // HOUR))
            if line == "L2":
                if types[ti][1] == "Overfill":
                    wt *= 1.0 + 5.0 * drift
                elif types[ti][1] == "Underfill":
                    wt *= 1.0 - 0.6 * drift
                elif types[ti][1] == "Loose cap":
                    wt *= 2.6
            weights.append(wt)
        cells = line_allocate(rejects, weights)
        for ti in range(len(types)):
            matrix[ti].append(cells[ti])
        labels.append(_hhmm(start))
        units.append(w["units"])
        totals.append(rejects)
        h -= 1
    return {"labels": labels, "units": units, "totals": totals, "matrix": matrix}


def quality_summary(line, now_ms=None):
    """The headline quality numbers of one line, from the same data the charts of the page use:
    first-pass yield and rejects (12 h), fill and torque capability (4 h), QA holds (4 h)."""
    now = _now(now_ms)
    line, info = _line(line)
    target, sigma, lsl, usl, unit, decimals = quality_spec(line, "fill")
    fill = quality_stats(quality_fill_values(line, now), lsl, usl, 5)
    torque = quality_torque(line, now)
    rej = quality_rejects(line, now, 12)
    types = quality_defect_types()
    units = sum(rej["units"])
    total = sum(rej["totals"])
    by_cat = {}
    for ti in range(len(types)):
        by_cat[types[ti][0]] = by_cat.get(types[ti][0], 0) + sum(rej["matrix"][ti])
    return {
        "fpy": _r(100.0 * (1.0 - total / units) if units > 0 else 100.0, 2), "rejects": total,
        "fillPpk": _r(fill["ppk"], 2), "fillCpk": _r(fill["cpk"], 2), "torquePpk": torque["ppk"],
        "fillPer10k": _r(10000.0 * by_cat["Fill"] / units if units > 0 else 0.0, 0),
        "closurePer10k": _r(10000.0 * by_cat["Closure"] / units if units > 0 else 0.0, 0),
        # a hold is raised for every fill subgroup outside its control limits and every closure out of spec
        "holds": fill["signals"] + torque["outOfSpec"],
        "signals": fill["signals"],
    }


def quality_radar(now_ms=None):
    """Radar Comparison props: the three lines on six quality metrics, each from quality_summary()."""
    now = _now(now_ms)
    series = []
    for key in LINE_ORDER:
        s = quality_summary(key, now)
        series.append({"name": LINES[key]["name"], "values": [
            s["fpy"], s["fillPpk"], s["torquePpk"], s["fillPer10k"], s["closurePer10k"], s["holds"]]})
    return {
        "metrics": [
            {"name": "First-pass yield", "unit": "%", "min": 96, "max": 100},
            {"name": "Fill Ppk", "unit": "", "min": 0.4, "max": 2.0},
            {"name": "Torque Ppk", "unit": "", "min": 0.4, "max": 2.0},
            {"name": "Fill rejects", "unit": "/10k", "min": 0, "max": 120, "higherIsBetter": False},
            {"name": "Closure rejects", "unit": "/10k", "min": 0, "max": 120, "higherIsBetter": False},
            {"name": "QA holds", "unit": "", "min": 0, "max": 12, "higherIsBetter": False},
        ],
        "series": series,
        "target": {"name": "Target", "values": [98.5, 1.33, 1.33, 40, 35, 1]},
    }


def quality_kpis(line, now_ms=None):
    """KPI Tile props for the Quality page. Values come from quality_summary(), so the tiles agree
    with the SPC chart, the histogram, the box plot, the defect charts and the radar."""
    now = _now(now_ms)
    line, info = _line(line)
    cur = quality_summary(line, now)
    target, sigma, lsl, usl, unit, decimals = quality_spec(line, "fill")
    # the 4 h before: same calculation, one window earlier
    before = now - 4 * HOUR
    fill_prev = quality_stats(quality_fill_values(line, before), lsl, usl, 5)
    torque_prev = quality_torque(line, before)
    # 24 clock hours: the last 12 are the page's window, the 12 before give the comparison
    day = quality_rejects(line, now, 24)
    fpy_h = []
    for i in range(24):
        fpy_h.append(_r(100.0 * (1.0 - day["totals"][i] / day["units"][i]) if day["units"][i] > 0 else 100.0, 2))
    prev_units = sum(day["units"][:12])
    prev_rej = sum(day["totals"][:12])
    # capability over a sliding 50-container window of the same measurements, for the sparklines
    values = quality_fill_values(line, now)
    ppk_h = []
    cpk_h = []
    g = 0
    while g * 5 + 50 <= len(values):
        s = quality_stats(values[g * 5:g * 5 + 50], lsl, usl, 5)
        ppk_h.append(_r(s["ppk"], 2))
        cpk_h.append(_r(s["cpk"], 2))
        g += 1
    # holds raised so far in the window: fill subgroups outside the limits, then closures out of spec
    full = quality_stats(values, lsl, usl, 5)
    rows = quality_torque_values(line, now)
    tspec = quality_spec(line, "torque")
    holds_h = []
    held = 0
    for g in range(len(full["means"])):
        if full["means"][g] > full["ucl"] or full["means"][g] < full["lcl"]:
            held += 1
        for row in rows:
            if row[g] < tspec[2] or row[g] > tspec[3]:
                held += 1
        holds_h.append(held)
    tq_h = []
    g = 0
    while g + 8 <= len(rows[0]):
        pooled = []
        for row in rows:
            pooled.extend(row[g:g + 8])
        tq_h.append(_r(quality_stats(pooled, tspec[2], tspec[3], 2)["ppk"], 2))
        g += 1
    return {
        "fpy": {
            "title": "First-pass yield", "unit": "%", "decimals": 2, "value": cur["fpy"],
            "previous": _r(100.0 * (1.0 - prev_rej / prev_units) if prev_units > 0 else 100.0, 2), "target": 98.5,
            "higherIsBetter": True, "deltaLabel": "vs prev 12 h", "history": fpy_h,
        },
        "rejects": {
            "title": "Rejects, last 12 h", "unit": "", "decimals": 0, "value": cur["rejects"], "previous": prev_rej,
            "target": None, "higherIsBetter": False, "deltaLabel": "vs prev 12 h", "history": day["totals"],
        },
        "ppk": {
            "title": "Fill volume Ppk", "unit": "", "decimals": 2, "value": cur["fillPpk"],
            "previous": _r(fill_prev["ppk"], 2), "target": 1.33, "higherIsBetter": True, "deltaLabel": "vs prev 4 h",
            "history": ppk_h,
        },
        "cpk": {
            "title": "Fill volume Cpk", "unit": "", "decimals": 2, "value": cur["fillCpk"],
            "previous": _r(fill_prev["cpk"], 2), "target": 1.33, "higherIsBetter": True, "deltaLabel": "vs prev 4 h",
            "history": cpk_h,
        },
        "torque": {
            "title": "Closure torque Ppk", "unit": "", "decimals": 2, "value": cur["torquePpk"],
            "previous": torque_prev["ppk"], "target": 1.33, "higherIsBetter": True, "deltaLabel": "vs prev 4 h",
            "history": tq_h,
        },
        "holds": {
            "title": "QA holds, last 4 h", "unit": "", "decimals": 0, "value": cur["holds"],
            "previous": fill_prev["signals"] + torque_prev["outOfSpec"], "target": None, "higherIsBetter": False,
            "deltaLabel": "vs prev 4 h", "history": holds_h,
        },
    }


def quality_fill(line, now_ms=None):
    """SPC Chart and Capability Histogram props for fill volume: 24 subgroups of 5 containers."""
    now = _now(now_ms)
    line, info = _line(line)
    target, sigma, lsl, usl, unit, decimals = quality_spec(line, "fill")
    values = quality_fill_values(line, now)
    s = quality_stats(values, lsl, usl, 5)
    state = "In control"
    if s["signals"] > 0:
        state = "%d of %d subgroups outside the control limits" % (s["signals"], len(s["means"]))
    return {
        "values": values, "subgroupSize": 5, "target": target, "lsl": lsl, "usl": usl, "unit": unit,
        "decimals": decimals, "state": state,
        "specHint": u"%g\u2013%g %s  \u00b7  target %g" % (lsl, usl, unit, target),
    }


def quality_defects(line, now_ms=None):
    """Generic chart data for the defects of the last 12 h: a type x hour heat map and a
    category > type hierarchy. Both add up to the rejects tile."""
    now = _now(now_ms)
    line, info = _line(line)
    rej = quality_rejects(line, now, 12)
    types = quality_defect_types()
    cells = []
    peak = 1
    tree = []
    index = {}
    for ti in range(len(types)):
        cat, name, weight = types[ti]
        for hi in range(len(rej["labels"])):
            v = rej["matrix"][ti][hi]
            cells.append([hi, ti, v])
            peak = max(peak, v)
        if cat not in index:
            index[cat] = len(tree)
            tree.append({"name": cat, "children": []})
        tree[index[cat]]["children"].append({"name": name, "value": sum(rej["matrix"][ti])})
    return {
        "hours": rej["labels"], "types": [t[1] for t in types], "cells": cells, "max": peak,
        "tree": tree, "total": sum(rej["totals"]),
        "hint": u"last 12 h  \u00b7  %d rejects" % sum(rej["totals"]),
    }


def quality_reject_heatmap(line, now_ms=None):
    """Event Heatmap props: rejects (thousands) by weekday and hour over the last 4 weeks.
    Start-ups after the shift handovers (06, 14, 22 UTC) and Monday mornings reject most."""
    now = _now(now_ms)
    line, info = _line(line)
    seed = info["seed"]
    week = now // (7 * DAY)
    # an average hour: 93 % of rated speed, 1.6 % scrap, four weeks
    base = info["rated"] * 0.93 * 0.016 * 4.0 / 1000.0
    cells = []
    for day in range(1, 8):
        for hour in range(24):
            f = 0.82 + 0.1 * math.sin((hour - 2) * math.pi / 12.0)
            if hour in (6, 14, 22):
                f += 0.75
            if hour in (7, 15, 23):
                f += 0.25
            if day == 1 and 6 <= hour <= 9:
                f += 0.5
            if day >= 6:
                f *= 0.6
            if line == "L2" and 10 <= hour <= 13:
                f += 0.3
            f *= 0.8 + 0.4 * _u("qhm", seed, week, day, hour)
            cells.append({"day": day, "hour": hour, "value": _r(base * f)})
    return {"cells": cells, "valueLabel": "k rejects"}
# <<< line / quality page helpers (end)


# --------------------------------------------------------------------------
# Page functions - one per view; a view binds view.custom.data to one of these
#   runScript("demo.data.overview", 5000, {session.custom.line})
# and its components bind to view.custom.data.<...> with property bindings.
# --------------------------------------------------------------------------

def overview(line, now_ms=None):
    now = _now(now_ms)
    line, info = _line(line)
    util = utilities(now)
    return {
        "meta": meta(line, now),
        "kpi": kpis(line, now),
        "oee": oee(line, now),
        "trend": trend(line, now),
        "rings": rings(now),
        "states": state_timeline(None, now, 8, "line"),
        "pareto": pareto(None, now, 24, "category", 6),
        "bullet": bullets(now),
        "heatmap": alarm_heatmap(None, now),
        "air": util["air"], "chilled": util["chilled"], "steam": util["steam"],
    }


def line_page(line, now_ms=None):
    now = _now(now_ms)
    line, info = _line(line)
    return {
        "meta": meta(line, now),
        "kpi": line_kpis(line, now),
        "oee": oee(line, now),
        "waterfall": line_waterfall(line, now),
        "trend": trend(line, now, 240),
        "hourly": line_hourly_output(line, now),
        "machines": line_machine_states(line, now, 8),
        "downtime": line_downtime(line, now, 24),
        "pareto": line_pareto(line, now, 24, 6),
    }


def quality_page(line, now_ms=None):
    now = _now(now_ms)
    line, info = _line(line)
    return {
        "meta": meta(line, now),
        "kpi": quality_kpis(line, now),
        "fill": quality_fill(line, now),
        "torque": quality_torque(line, now),
        "radar": quality_radar(now),
        "defects": quality_defects(line, now),
        "heatmap": quality_reject_heatmap(line, now),
    }


# ---- Energy & Utilities page ---------------------------------------------
# One electrical model of the site (energy_* / _energy_*): kW per consumer on a 30-minute grid,
# driven by the plant model (_speed), the time of day and the weather. The Sankey, the KPI tiles,
# the 24 h profile, the bridge and the load rings are all sums of the same samples.

ENERGY_STEP = 30 * MIN
ENERGY_CONTRACT_KW = 2400
ENERGY_SOLAR_KWP = 900.0
ENERGY_LINE_KW = {"L1": (70.0, 250.0), "L2": (60.0, 230.0), "L3": (80.0, 300.0)}  # (idle, extra at rated speed)
ENERGY_CAPACITY_KW = {"total": 3000.0, "air": 440.0, "chill": 560.0, "boil": 400.0}
ENERGY_SKU_FACTOR = [0.93, 1.0, 1.04, 1.1]
ENERGY_AIR_SPECIFIC = 6.4  # kW per m3/min at design efficiency


def _energy_sample(t):
    """The site's electrical load at one instant: kW per consumer, and what drives it."""
    t = int(t)
    out = {"t": t}
    run = 0.0
    units = 0.0
    lines = 0.0
    variable = 0.0
    for key in LINE_ORDER:
        speed = _speed(key, t)
        frac = speed / float(LINES[key]["rated"])
        # the product on the line (it changes with meta()'s SKU, every six hours) needs more or less energy
        sku = ENERGY_SKU_FACTOR[_h("sku", LINES[key]["seed"], t // (6 * HOUR)) % len(ENERGY_SKU_FACTOR)]
        kw = ENERGY_LINE_KW[key][0] + ENERGY_LINE_KW[key][1] * frac * sku
        out[key] = kw
        lines += kw
        variable += ENERGY_LINE_KW[key][1] * frac * sku
        units += speed
        run += frac / 3.0
    hour = (t % DAY) / float(HOUR)
    day = math.sin((hour - 9.0) * math.pi / 12.0)  # warmest at 15:00
    weather = _drift("wx", t, 3 * DAY)
    air_eff = 1.0 + 0.07 * _drift("airsp", t, 2 * DAY)
    out["lines"] = lines
    out["air"] = (185.0 + 150.0 * run) * air_eff + 10.0 * _noise("ea", float(t) / (40 * MIN))
    out["chill"] = 300.0 + 105.0 * day + 95.0 * weather + 50.0 * run + 10.0 * _noise("ec", float(t) / (50 * MIN))
    out["boil"] = 235.0 + 60.0 * run + 24.0 * _drift("eb", t, 5 * HOUR)
    out["hvac"] = 135.0 + 50.0 * day + 40.0 * weather + 5.0 * _noise("eh", float(t) / (70 * MIN))
    out["total"] = lines + out["air"] + out["chill"] + out["boil"] + out["hvac"]
    sun = max(0.0, math.sin((hour - 6.0) * math.pi / 12.0))
    out["solar"] = ENERGY_SOLAR_KWP * sun * (0.74 + 0.2 * _drift("sun", t, 2 * HOUR))
    out["units"] = units
    out["airEff"] = air_eff
    # the parts of the load that follow volume, product mix and weather (for the bridge)
    out["volume"] = run * (780.0 + 150.0 + 50.0 + 60.0)
    out["mix"] = variable - 780.0 * run
    out["weather"] = 135.0 * weather
    return out


def _energy_mwh(samples, key):
    """Energy of one consumer over the samples (each stands for ENERGY_STEP), in MWh."""
    total = 0.0
    for s in samples:
        total += s[key]
    return total * ENERGY_STEP / float(HOUR) / 1000.0


def _energy_flows(samples):
    """Flow Diagram props: where the electricity of the window went. Every node balances."""
    # (consumer, key, share that is useful work, share lost as air leaks); the rest is heat and idle loss
    split = [
        ("Line 1", "L1", 0.87, 0.0), ("Line 2", "L2", 0.86, 0.0), ("Line 3", "L3", 0.88, 0.0),
        ("Compressed air", "air", 0.58, 0.24), ("Chillers", "chill", 0.78, 0.0),
        ("Boilers", "boil", 0.91, 0.0), ("HVAC & lighting", "hvac", 0.72, 0.0),
    ]
    feeds = []
    ends = []
    bus = 0.0
    for name, key, useful_share, leak_share in split:
        energy = _energy_mwh(samples, key)
        useful = _r(energy * useful_share)
        leaks = _r(energy * leak_share)
        losses = _r(energy * (1.0 - useful_share - leak_share))
        # the node's input is the sum of its rounded outputs, so the diagram balances to the digit
        total = _r(useful + leaks + losses)
        bus += total
        feeds.append({"source": "Main bus", "target": name, "value": total})
        ends.append({"source": name, "target": "Useful work", "value": useful})
        if leaks > 0:
            ends.append({"source": name, "target": "Air leaks", "value": leaks})
        ends.append({"source": name, "target": "Losses", "value": losses})
    bus = _r(bus)
    solar = min(_r(_energy_mwh(samples, "solar")), bus)
    flows = [
        {"source": "Grid import", "target": "Main bus", "value": _r(bus - solar)},
        {"source": "Solar PV", "target": "Main bus", "value": solar},
    ]
    return {"flows": flows + feeds + ends, "unit": "MWh", "decimals": 1, "total": bus, "solar": solar,
            "useful": _r(sum([e["value"] for e in ends if e["target"] == "Useful work"]))}


def _energy_intensity(samples):
    """kWh per 1,000 units over the samples (None while nothing is produced)."""
    energy = 0.0
    units = 0.0
    for s in samples:
        energy += s["total"]
        units += s["units"]
    if units < 1000.0:
        return None
    return 1000.0 * energy / units


def _energy_kpis(prev, cur, live, before, flows):
    """KPI Tile props of the Energy page. prev / cur: the two 24 h windows of samples."""
    totals = [_r(s["total"], 0) for s in cur]
    peak = max(totals)
    hourly = []
    intensity = []
    last = None
    i = 0
    while i + 1 < len(cur):
        pair = cur[i:i + 2]
        hourly.append(_r(_energy_mwh(pair, "total"), 2))
        value = _energy_intensity(pair)
        if value is not None:
            last = _r(value)
        if last is not None:
            intensity.append(last)
        i += 2
    now_int = _energy_intensity(cur[-16:])
    prev_int = _energy_intensity(cur[-32:-16])
    share = lambda s: _r(100.0 * s["solar"] / s["total"])
    return {
        "power": {
            "title": "Site power", "unit": "kW", "decimals": 0, "value": _r(live["total"], 0),
            "previous": _r(before["total"], 0), "target": None, "higherIsBetter": False,
            "deltaLabel": "vs 24 h ago", "history": totals,
        },
        "intensity": {
            "title": "Energy per 1,000 units", "unit": "kWh", "decimals": 1,
            "value": None if now_int is None else _r(now_int),
            "previous": None if prev_int is None else _r(prev_int), "target": 21.0, "higherIsBetter": False,
            "deltaLabel": "vs prev 8 h", "history": intensity,
        },
        "solar": {
            "title": "Solar share", "unit": "%", "decimals": 1,
            "value": _r(100.0 * flows["solar"] / flows["total"]),
            "previous": _r(100.0 * _energy_mwh(prev, "solar") / _energy_mwh(prev, "total")), "target": None,
            "higherIsBetter": True, "deltaLabel": "vs prev 24 h", "history": [share(s) for s in cur],
        },
        "peak": {
            "title": "Peak demand", "unit": "kW", "decimals": 0, "value": peak, "previous": None,
            "target": ENERGY_CONTRACT_KW, "higherIsBetter": False, "deltaLabel": "vs contract", "history": totals,
        },
        "air": {
            "title": "Air specific power", "unit": u"kW/(m\u00b3/min)", "decimals": 2,
            "value": _r(ENERGY_AIR_SPECIFIC * live["airEff"], 2),
            "previous": _r(ENERGY_AIR_SPECIFIC * before["airEff"], 2), "target": 6.5, "higherIsBetter": False,
            "deltaLabel": "vs 24 h ago", "history": [_r(ENERGY_AIR_SPECIFIC * s["airEff"], 2) for s in prev + cur],
        },
        "energy": {
            "title": "Energy, last 24 h", "unit": "MWh", "decimals": 1, "value": flows["total"],
            "previous": _r(_energy_mwh(prev, "total")), "target": None, "higherIsBetter": False,
            "deltaLabel": "vs prev 24 h", "history": hourly,
        },
    }


def _energy_bridge(prev, cur, total):
    """Waterfall props: the previous 24 h to the last 24 h, by cause. `total` closes the bridge."""
    start = _r(_energy_mwh(prev, "total"))
    volume = _r(_energy_mwh(cur, "volume") - _energy_mwh(prev, "volume"))
    mix = _r(_energy_mwh(cur, "mix") - _energy_mwh(prev, "mix"))
    weather = _r(_energy_mwh(cur, "weather") - _energy_mwh(prev, "weather"))
    # whatever volume, mix and weather do not explain is efficiency: compressor specific power, idling, boiler trim
    efficiency = _r(total - start - volume - mix - weather)
    return {
        "unit": "MWh", "decimals": 1,
        "steps": [
            {"name": "Prev 24 h", "value": start, "type": "total"},
            {"name": "Volume", "value": volume},
            {"name": "Product mix", "value": mix},
            {"name": "Efficiency", "value": efficiency},
            {"name": "Weather", "value": weather},
            {"name": "Last 24 h", "type": "total"},
        ],
    }


def _energy_profile(cur):
    """[time, kW] rows per consumer for the stacked 24 h profile, and the contract demand."""
    out = {"contract": ENERGY_CONTRACT_KW}
    for key in ("lines", "air", "chill", "boil", "hvac"):
        out[key] = [[s["t"], _r(s[key], 0)] for s in cur]
    return out


def _energy_rings(live):
    """Metric Rings props: load of each utility in percent of its installed capacity."""
    names = [("Transformer", "total"), ("Air comp.", "air"), ("Chillers", "chill"), ("Boilers", "boil")]
    return {"metrics": [{"name": name, "value": _r(100.0 * live[key] / ENERGY_CAPACITY_KW[key], 0), "target": 85}
                        for name, key in names]}


def energy_dials(now_ms=None):
    """Dial Gauge props: the two header pressures and two temperatures (the first three are utilities())."""
    now = _now(now_ms)
    util = utilities(now)
    hot = 82.0 + 2.6 * _drift("hotw", now, 50 * MIN)
    return {
        "air": util["air"], "steam": util["steam"], "chilled": util["chilled"],
        "hot": {"title": "Hot water loop", "value": _r(hot, 1), "unit": u"\u00b0C", "min": 70, "max": 95,
                "decimals": 1, "target": 82.0, "stages": [{"upTo": 76.0, "color": "#e05252", "name": "Low"},
                                                           {"upTo": 79.0, "color": "#e6a23c", "name": "Cool"},
                                                           {"upTo": 86.0, "color": "#3ba272", "name": "Normal"},
                                                           {"color": "#e6a23c", "name": "Hot"}]},
    }


def energy_calendar(now_ms=None, days=182):
    """[date, MWh] rows for a calendar heatmap of daily site energy, up to yesterday."""
    now = _now(now_ms)
    today = (now // DAY) * DAY
    rows = []
    lo = None
    hi = None
    d = days
    while d >= 1:
        t = today - d * DAY
        value = _r(47.6 + 2.6 * _drift("ecal", t, 24 * DAY) + 1.5 * _noise("ecald", float(t) / DAY))
        rows.append([_iso_date(t), value])
        lo = value if lo is None else min(lo, value)
        hi = value if hi is None else max(hi, value)
        d -= 1
    return {"data": rows, "range": [rows[0][0], rows[-1][0]], "min": int(math.floor(lo)), "max": int(math.ceil(hi))}


def energy_peaks(now_ms=None):
    """Event Heatmap props: 30-minute intervals above 90 % of the contract demand, by weekday and hour, 4 weeks."""
    now = _now(now_ms)
    week = now // (7 * DAY)
    cells = []
    for day in range(1, 8):
        for hour in range(24):
            warm = math.sin((hour - 9.0) * math.pi / 12.0)
            p = _clamp((warm - 0.2) / 0.8, 0.0, 1.0)
            value = 8.0 * p * p * (0.45 + 0.75 * _u("epk", week, day, hour))
            if day >= 6:
                value *= 0.6
            cells.append({"day": day, "hour": hour, "value": int(round(value))})
    return {"cells": cells, "valueLabel": "intervals", "utcOffsetMinutes": 0}


def energy_page(line, now_ms=None):
    now = _now(now_ms)
    line, info = _line(line)
    end = (now // ENERGY_STEP) * ENERGY_STEP
    samples = [_energy_sample(end - k * ENERGY_STEP) for k in range(95, -1, -1)]
    prev = samples[:48]
    cur = samples[48:]
    live = _energy_sample(now)
    flows = _energy_flows(cur)
    data = meta(line, now)
    data["subtitle"] = u"Whole site  \u00b7  electricity  \u00b7  last 24 h"
    return {
        "meta": data,
        "kpi": _energy_kpis(prev, cur, live, _energy_sample(now - DAY), flows),
        "flow": flows,
        "balance": {"total": "%.1f MWh" % flows["total"],
                    "useful": "%d %% useful" % int(round(100.0 * flows["useful"] / flows["total"]))},
        "load": _energy_profile(samples[47:]),
        "bridge": _energy_bridge(prev, cur, flows["total"]),
        "rings": _energy_rings(live),
        "dials": energy_dials(now),
        "calendar": energy_calendar(now),
        "peaks": energy_peaks(now),
    }


# ---- Scheduling page ------------------------------------------------------
# One order book (schedule_* / _schedule_*): every plant week (Monday 00:00 UTC) each line gets a
# deterministic sequence of production orders with changeovers between them, and one line a week
# has a maintenance window. The Gantt, the bullet chart, the KPI tiles and the campaign calendar
# all read the same orders.

SCHEDULE_COLORS = {"L1": "#6f8ce8", "L2": "#48b8d0", "L3": "#b08bd9", "Maintenance": "#5d6785"}
SCHEDULE_PALETTE = ["#6f8ce8", "#48b8d0", "#b08bd9", "#d98bb6"]
SCHEDULE_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
SCHEDULE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _schedule_monday(t_ms):
    """Start of the plant week (Monday 00:00 UTC) a time is in."""
    return int((t_ms // DAY - _weekday(t_ms)) * DAY)


def _schedule_maintenance(key, week_start):
    """The line's maintenance window in a week as (start, end), or None. One line a week, in turn."""
    week = int(week_start // (7 * DAY))
    if (week + LINE_ORDER.index(key)) % 3 != 0:
        return None
    start = week_start + (1 + _h("smd", week) % 4) * DAY + 6 * HOUR  # Tuesday to Friday, early shift
    return (start, start + 8 * HOUR)


def _schedule_line_week(key, week_start, now):
    """One line's week: (orders, changeover hours). Orders are dicts, in plan order."""
    info = LINES[key]
    seed = info["seed"]
    week = int(week_start // (7 * DAY))
    week_end = week_start + 7 * DAY
    maint = _schedule_maintenance(key, week_start)
    segments = [(week_start, week_end)]
    if maint is not None:
        segments = [(week_start, maint[0] - HOUR), (maint[1] + 30 * MIN, week_end)]
    first_sku = _h("ssku", seed, week)
    number = 4000 + (week % 300) * 20 + LINE_ORDER.index(key) * 6
    orders = []
    changeover = 0.0
    n = 0
    for seg_start, seg_end in segments:
        t = seg_start
        fresh = True
        while seg_end - t >= 16 * HOUR:
            if not fresh:
                gap = (3 + _h("sgap", seed, week, n) % 4) * 30 * MIN  # 1.5 to 3 h changeover
                if seg_end - (t + gap) < 16 * HOUR:
                    break
                changeover += gap / float(HOUR)
                t += gap
            fresh = False
            end = min(t + (30 + _h("sdur", seed, week, n) % 17) * HOUR, seg_end)
            dur = float(end - t)
            u = _u("sperf", seed, week, n)
            perf = 1.03 - 0.2 * u ** 8  # most orders run to plan, a few fall behind
            elapsed = _clamp((now - t) / dur, 0.0, 1.0)
            done = min(1.0, elapsed * perf)
            qty = int(round(info["rated"] * 0.8 * dur / HOUR / 1000.0))
            status = "Planned"
            if now >= end:
                status = "Done"
            elif now >= t:
                status = "Running"
            orders.append({
                "id": "PO-%d" % (number + n), "line": key, "lineName": info["name"],
                "sku": info["sku"][(first_sku + n) % len(info["sku"])],
                "start": int(t), "end": int(end), "qty": qty, "status": status,
                "progress": 100.0 * done, "produced": qty * done, "expected": qty * elapsed,
                "late": status != "Planned" and perf < 0.95,
            })
            t = end
            n += 1
    return orders, changeover


def _schedule_week(week_start, now):
    """All lines' orders of a week (line by line, each in plan order) and the week's changeover hours."""
    orders = []
    changeover = 0.0
    for key in LINE_ORDER:
        mine, hours = _schedule_line_week(key, week_start, now)
        orders.extend(mine)
        changeover += hours
    return orders, changeover


def _schedule_gantt(orders, week_start, now):
    """Gantt props: a marker for now, then each line's orders, its maintenance window and two delivery milestones."""
    tasks = [{"name": u"Now  \u00b7  %s %s" % (SCHEDULE_DAYS[_weekday(now)], _hhmm(now)), "start": now, "end": now,
              "milestone": True, "category": "Now"}]
    for key in LINE_ORDER:
        mine = [o for o in orders if o["line"] == key]
        maint = _schedule_maintenance(key, week_start)
        placed = maint is None
        i = 0
        for o in mine:
            if not placed and o["start"] > maint[0]:
                tasks.append({"name": u"%s  \u00b7  Maintenance" % LINES[key]["name"], "start": maint[0], "end": maint[1],
                              "progress": _r(_clamp(100.0 * (now - maint[0]) / (maint[1] - maint[0]), 0.0, 100.0), 0),
                              "category": "Maintenance", "color": SCHEDULE_COLORS["Maintenance"]})
                placed = True
            tasks.append({"name": u"%s  \u00b7  %s" % (o["id"], o["sku"]), "start": o["start"], "end": o["end"],
                          "progress": _r(o["progress"], 0), "category": o["lineName"], "color": SCHEDULE_COLORS[key]})
            # one customer collection per line group that has one: the truck is booked 3 h after the planned finish
            if (key == "L1" and i == 1) or (key == "L3" and i == 2):
                tasks.append({"name": u"Truck  \u00b7  %s" % o["id"], "start": o["end"] + 3 * HOUR,
                              "end": o["end"] + 3 * HOUR, "milestone": True, "category": "Delivery"})
            i += 1
        if not placed:
            tasks.append({"name": u"%s  \u00b7  Maintenance" % LINES[key]["name"], "start": maint[0], "end": maint[1],
                          "progress": _r(_clamp(100.0 * (now - maint[0]) / (maint[1] - maint[0]), 0.0, 100.0), 0),
                          "category": "Maintenance", "color": SCHEDULE_COLORS["Maintenance"]})
    return {"tasks": tasks}


def _schedule_bullets(orders, previous):
    """Bullet Chart props: per line the last finished order and the running one, in k units.
    value = produced, target = what the plan wanted by now (the whole order once it is due), max = order size."""
    items = []
    for key in LINE_ORDER:
        done = [o for o in previous + orders if o["line"] == key and o["status"] == "Done"]
        running = [o for o in orders if o["line"] == key and o["status"] == "Running"]
        for o in done[-1:] + running[:1]:
            items.append({"name": u"%s \u00b7 %s" % (key, o["id"]), "value": _r(o["produced"], 0), "target": _r(max(o["expected"], 1.0), 0),
                          "max": o["qty"]})
    return {"items": items, "unit": "k", "decimals": 0}


def _schedule_counts(orders, changeover):
    started = [o for o in orders if o["status"] != "Planned"]
    produced = sum([o["produced"] for o in started])
    expected = sum([o["expected"] for o in started])
    return {
        "late": len([o for o in started if o["late"]]), "changeover": changeover, "produced": produced,
        "expected": expected, "adherence": 100.0 * produced / expected if expected > 0 else 100.0,
        "running": len([o for o in started if o["status"] == "Running"]),
    }


def _schedule_kpis(orders, changeover, week_start, now):
    """KPI Tile props of the Scheduling page, counted from the order book."""
    this = _schedule_counts(orders, changeover)
    weeks = []  # the seven finished weeks before this one, oldest first
    k = 7
    while k >= 1:
        start = week_start - k * 7 * DAY
        old, hours = _schedule_week(start, start + 7 * DAY)
        weeks.append(_schedule_counts(old, hours))
        if k == 1:
            last_orders = old
        k -= 1
    last = weeks[-1]
    day0 = (now // DAY) * DAY
    both = last_orders + orders
    due = []  # orders that are due (planned finish) on each of the last seven days, today last
    d = 6
    while d >= 0:
        due.append(len([o for o in both if day0 - d * DAY <= o["end"] - 1 < day0 - (d - 1) * DAY]))
        d -= 1
    output = []  # units produced since Monday, every six hours
    t = week_start + 6 * HOUR
    while t < now:
        output.append(_r(_schedule_counts(_schedule_week(week_start, t)[0], 0.0)["produced"], 0))
        t += 6 * HOUR
    output.append(_r(this["produced"], 0))
    return {
        "adherence": {
            "title": "Schedule adherence", "unit": "%", "decimals": 1, "value": _r(this["adherence"]),
            "previous": _r(last["adherence"]), "target": 98, "higherIsBetter": True, "deltaLabel": "vs last week",
            "history": [_r(w["adherence"]) for w in weeks] + [_r(this["adherence"])],
        },
        "due": {
            "title": "Orders due today", "unit": "", "decimals": 0, "value": due[-1], "previous": due[-2],
            "target": None, "higherIsBetter": True, "deltaLabel": "vs yesterday", "history": due,
        },
        "late": {
            "title": "Late orders", "unit": "", "decimals": 0, "value": this["late"], "previous": last["late"],
            "target": None, "higherIsBetter": False, "deltaLabel": "vs last week",
            "history": [w["late"] for w in weeks] + [this["late"]],
        },
        "changeover": {
            "title": "Changeover hours", "unit": "h", "decimals": 1, "value": _r(this["changeover"]),
            "previous": _r(last["changeover"]), "target": None, "higherIsBetter": False, "deltaLabel": "vs last week",
            "history": [_r(w["changeover"]) for w in weeks] + [_r(this["changeover"])],
        },
        "output": {
            "title": "Week output", "unit": "k units", "decimals": 0, "value": _r(this["produced"], 0),
            "previous": None, "target": _r(this["expected"], 0), "higherIsBetter": True,
            "deltaLabel": "vs plan to date", "history": output,
        },
    }


def schedule_shifts(now_ms=None, days=28):
    """Shift Calendar props: the four crews over this week and the three after it."""
    now = _now(now_ms)
    monday = _schedule_monday(now)
    return {
        "patterns": [
            {"name": "Early", "color": "#6f8ce8", "days": [1, 2, 3, 4, 5]},
            {"name": "Late", "color": "#48b8d0", "days": [1, 2, 3, 4, 5]},
            {"name": "Night", "color": "#b08bd9", "days": [0, 1, 2, 3, 4]},
            {"name": "Weekend", "color": "#d98bb6", "days": [0, 6]},
        ],
        "crews": [
            {"crew": "Crew Red", "pattern": "Early"}, {"crew": "Crew Blue", "pattern": "Late"},
            {"crew": "Crew Green", "pattern": "Night"}, {"crew": "Crew Amber", "pattern": "Weekend"},
        ],
        "dateRange": [_iso_date(monday), _iso_date(monday + (days - 1) * DAY)],
    }


def schedule_campaigns(line, now_ms=None):
    """Schedule Calendar props: the product the line is planned to fill on every day of the current year
    (the order running at noon), with its maintenance days. This week's cells are the Gantt's orders."""
    now = _now(now_ms)
    line, info = _line(line)
    year = _ymd(now)[0]
    entries = []
    week_start = _schedule_monday(now)
    while _ymd(week_start + 6 * DAY)[0] >= year:
        week_start -= 7 * DAY
    week_start += 7 * DAY
    while _ymd(week_start)[0] <= year:
        orders = _schedule_line_week(line, week_start, now)[0]
        maint = _schedule_maintenance(line, week_start)
        for d in range(7):
            noon = week_start + d * DAY + 12 * HOUR
            if _ymd(noon)[0] != year:
                continue
            if maint is not None and maint[0] <= noon < maint[1]:
                entries.append({"date": _iso_date(noon), "shift": "Maintenance"})
                continue
            for o in orders:
                if o["start"] <= noon < o["end"]:
                    entries.append({"date": _iso_date(noon), "shift": o["sku"], "crew": o["id"]})
                    break
        week_start += 7 * DAY
    colors = {"Maintenance": SCHEDULE_COLORS["Maintenance"]}
    for i in range(len(info["sku"])):
        colors[info["sku"][i]] = SCHEDULE_PALETTE[i % len(SCHEDULE_PALETTE)]
    return {"year": str(year), "entries": entries, "shiftColors": colors}


def schedule_page(line, now_ms=None):
    now = _now(now_ms)
    line, info = _line(line)
    week_start = _schedule_monday(now)
    orders, changeover = _schedule_week(week_start, now)
    previous = _schedule_week(week_start - 7 * DAY, now)[0]
    first = _ymd(week_start)
    last = _ymd(week_start + 6 * DAY)
    running = len([o for o in orders if o["status"] == "Running"])
    data = meta(line, now)
    data["subtitle"] = u"Week of %d %s to %d %s  \u00b7  three lines  \u00b7  times in UTC" % (
        first[2], SCHEDULE_MONTHS[first[1] - 1], last[2], SCHEDULE_MONTHS[last[1] - 1])
    return {
        "meta": data,
        "plan": {"orders": "%d orders this week" % len(orders), "running": "%d running" % running,
                 "campaign": u"%s  \u00b7  %s" % (info["name"], info["product"])},
        "kpi": _schedule_kpis(orders, changeover, week_start, now),
        "gantt": _schedule_gantt(orders, week_start, now),
        "bullet": _schedule_bullets(orders, previous),
        "shifts": schedule_shifts(now),
        "calendar": schedule_campaigns(line, now),
        "batches": batches(now),
        "resources": resource_heatmap(now),
    }


def gallery_live(line, now_ms=None):
    """Values for the live tiles of the chart gallery: two gauges and one set of bars.

    Each block is bound over part of a static ECharts option, for example
    option.series[0].data[0].value <- view.custom.data.live.speed.value
    """
    now = _now(now_ms)
    line, info = _line(line)
    seed = str(info["seed"])
    names = ["Filler", "Capper", "Labeller", "Packer", "Palletiser"]
    base = [64.0, 71.0, 78.0, 84.0, 90.0]
    values = []
    for i in range(len(names)):
        v = base[i] + 5.0 * _drift("gal_m" + seed + names[i], now, 2 * MIN)
        values.append(_r(_clamp(v, 40.0, 99.0), 0))
    return {
        # hall temperature at the filler, on the 0-60 scale of the gauge
        "temperature": {"value": _r(24.0 + 5.0 * _drift("gal_t" + seed, now, 3 * MIN))},
        # line speed in units per minute; the dial ends 20 % above the rated speed
        "speed": {"value": _r(_speed(line, now) / 60.0, 0), "max": info["rated"] // 50},
        "machines": {"names": names, "values": values},
    }


def gallery_page(line, now_ms=None):
    now = _now(now_ms)
    line, info = _line(line)
    return {
        "meta": meta(line, now),
        "hourly": energy_series(now, 24),
        "mix": sku_mix(now),
        "calendar": calendar_days(now),
        "radar": radar(now),
        "flow": flow("energy", now),
        "live": gallery_live(line, now),
    }

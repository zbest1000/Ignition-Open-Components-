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
        "kpi": kpis(line, now),
        "oee": oee(line, now),
        "trend": trend(line, now, 240),
        "machines": state_timeline(line, now, 8, "machine"),
        "waterfall": waterfall(line, now),
        "pareto": pareto(line, now, 24, "reason", 6),
        "downtime": downtime_events(line, now, 24),
        "radar": radar(now),
    }


def quality_page(line, now_ms=None):
    now = _now(now_ms)
    line, info = _line(line)
    return {
        "meta": meta(line, now),
        "kpi": kpis(line, now),
        "fill": samples(line, "fill", now),
        "torque": samples(line, "torque", now),
        "co2": samples(line, "co2", now),
        "brix": samples(line, "brix", now, 60),
        "fillTrend": process_trend(line, "fill", now),
        "material": flow("material", now),
        "pareto": pareto(line, now, 72, "category", 6),
    }


def energy_page(line, now_ms=None):
    now = _now(now_ms)
    line, info = _line(line)
    return {
        "meta": meta(line, now),
        "utilities": utilities(now),
        "flow": flow("energy", now),
        "hourly": energy_series(now, 24),
        "kpi": kpis(line, now),
        "heatmap": alarm_heatmap(None, now),
        "calendar": calendar_days(now),
    }


def schedule_page(line, now_ms=None):
    now = _now(now_ms)
    line, info = _line(line)
    return {
        "meta": meta(line, now),
        "gantt": gantt(now),
        "shifts": shift_calendar(now),
        "calendar": schedule_calendar(now),
        "downtime": downtime_events(None, now, 24),
        "batches": batches(now),
        "resources": resource_heatmap(now),
        "states": state_timeline(None, now, 24, "line"),
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
    }

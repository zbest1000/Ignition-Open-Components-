"""Runs functions of the project's script library under CPython, for the tools.

The project library (project/ignition/script-python/**/code.py) is written in the
common subset of Jython 2.7 and Python 3, so the previewer and the validator can
execute the very code the gateway runs instead of a port of it.

stdin : {"now_ms": 1795000000000, "calls": [{"fn": "demo.data.overview", "args": ["L1"]}, ...]}
stdout: {"results": [{"ok": true, "value": ...} | {"ok": false, "error": "..."}, ...]}

Every public function of the library takes an optional trailing `now_ms`; it is
passed by keyword so that the tools get reproducible numbers.
"""
import json
import os
import sys
import types


def load_library(root):
    """Builds the package tree the way Ignition does: a folder with code.py is a module,
    a folder without one is a package whose attributes are its children."""
    top = {}

    def build(directory, dotted):
        code = os.path.join(directory, "code.py")
        module = types.ModuleType(dotted)
        if os.path.isfile(code):
            with open(code) as handle:
                source = handle.read()
            module.__dict__.update(top)  # top-level packages are implicit globals in Ignition
            exec(compile(source, code, "exec"), module.__dict__)
            return module
        for name in sorted(os.listdir(directory)):
            child = os.path.join(directory, name)
            if os.path.isdir(child):
                setattr(module, name, build(child, dotted + "." + name))
        return module

    for name in sorted(os.listdir(root)):
        path = os.path.join(root, name)
        if os.path.isdir(path):
            top[name] = build(path, name)
    return top


def resolve(top, dotted):
    parts = dotted.split(".")
    target = top[parts[0]]
    for part in parts[1:]:
        target = getattr(target, part)
    return target


def main():
    root = sys.argv[1]
    request = json.load(sys.stdin)
    top = load_library(root)
    results = []
    for call in request["calls"]:
        try:
            fn = resolve(top, call["fn"])
            kwargs = {}
            if request.get("now_ms") is not None:
                kwargs["now_ms"] = request["now_ms"]
            results.append({"ok": True, "value": fn(*call.get("args", []), **kwargs)})
        except Exception as error:  # reported to the caller, which decides what to do
            results.append({"ok": False, "error": "%s: %s" % (type(error).__name__, error)})
    json.dump({"results": results}, sys.stdout, allow_nan=False)


if __name__ == "__main__":
    main()

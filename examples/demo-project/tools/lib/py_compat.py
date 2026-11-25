"""Checks that a project library file stays inside the common subset of Jython 2.7 and Python 3.

Static part (syntax tree and bytes): constructs Python 2.7 does not have, and things that
behave differently between the two.

Dynamic part (--run): every `a / b` in the file is rewritten to a checked division and the
given functions are called. A division of two integers raises, because Python 2 would floor it
where Python 3 does not.

usage: python3 py_compat.py <code.py> [--run <library root> <dotted.function> ...]
Prints one problem per line as "<line>: <message>" and exits 1 if there are any.
"""
import ast
import sys

ALLOWED_IMPORTS = {"math", "time"}
PY3_ONLY_BUILTINS = {"nonlocal", "breakpoint", "ascii", "exec"}
PY2_ONLY_NAMES = {"unicode", "xrange", "basestring", "long", "raw_input", "unichr", "reduce", "file"}
PY2_ONLY_METHODS = {"iteritems", "itervalues", "iterkeys", "has_key"}


def static_problems(path):
    problems = []
    raw = open(path, "rb").read()
    for number, line in enumerate(raw.split(b"\n"), 1):
        if any(byte > 127 for byte in bytearray(line)):
            problems.append((number, "non-ASCII character: Jython 2.7 needs ASCII source (write u\"\\uXXXX\")"))
    if b"\t" in raw:
        problems.append((1, "tab character: indent library code with spaces"))
    tree = ast.parse(raw.decode("utf-8"), path)
    add = lambda node, message: problems.append((getattr(node, "lineno", 0), message))
    for node in ast.walk(tree):
        if isinstance(node, ast.JoinedStr):
            add(node, "f-string (Python 3.6+)")
        elif isinstance(node, ast.Nonlocal):
            add(node, "nonlocal (Python 3)")
        elif isinstance(node, (ast.AnnAssign,)):
            add(node, "annotated assignment (Python 3)")
        elif isinstance(node, ast.NamedExpr):
            add(node, "walrus operator (Python 3.8+)")
        elif isinstance(node, (ast.AsyncFunctionDef, ast.AsyncFor, ast.AsyncWith, ast.Await)):
            add(node, "async / await (Python 3)")
        elif isinstance(node, ast.YieldFrom):
            add(node, "yield from (Python 3)")
        elif isinstance(node, ast.MatMult):
            add(node, "@ operator (Python 3.5+)")
        elif isinstance(node, ast.Raise) and node.cause is not None:
            add(node, "raise ... from ... (Python 3)")
        elif hasattr(ast, "Match") and isinstance(node, ast.Match):
            add(node, "match statement (Python 3.10+)")
        elif isinstance(node, (ast.FunctionDef, ast.Lambda)):
            args = node.args
            if args.kwonlyargs:
                add(node, "keyword-only arguments (Python 3)")
            if getattr(args, "posonlyargs", None):
                add(node, "positional-only arguments (Python 3.8+)")
            everything = list(args.args) + list(args.kwonlyargs) + [a for a in (args.vararg, args.kwarg) if a]
            if any(a.annotation is not None for a in everything) or getattr(node, "returns", None) is not None:
                add(node, "type annotations (Python 3)")
        elif isinstance(node, ast.ClassDef) and node.keywords:
            add(node, "class keywords such as metaclass= (Python 3)")
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            names = [alias.name.split(".")[0] for alias in node.names] if isinstance(node, ast.Import) else [(node.module or "").split(".")[0]]
            for name in names:
                if name not in ALLOWED_IMPORTS:
                    add(node, "import %s: the library may only import %s" % (name, ", ".join(sorted(ALLOWED_IMPORTS))))
        elif isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Name) and func.id == "print":
                add(node, "print(): a statement in Python 2; log with system.util.getLogger instead")
            if isinstance(func, ast.Name) and func.id == "super" and not node.args:
                add(node, "super() without arguments (Python 3)")
            if isinstance(func, ast.Attribute) and func.attr in PY2_ONLY_METHODS:
                add(node, ".%s() exists only in Python 2" % func.attr)
            if any(isinstance(arg, ast.Starred) for arg in node.args[:-1]) or sum(isinstance(a, ast.Starred) for a in node.args) > 1:
                add(node, "more than one * argument, or * before positional arguments (Python 3.5+)")
            if sum(1 for kw in node.keywords if kw.arg is None) > 1:
                add(node, "more than one ** argument (Python 3.5+)")
        elif isinstance(node, (ast.List, ast.Tuple, ast.Set)) and isinstance(getattr(node, "ctx", None), ast.Load):
            if any(isinstance(element, ast.Starred) for element in node.elts):
                add(node, "* unpacking inside a list / tuple / set display (Python 3.5+)")
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, (ast.Tuple, ast.List)) and any(isinstance(e, ast.Starred) for e in target.elts):
                    add(node, "starred assignment target (Python 3)")
        elif isinstance(node, ast.Dict) and any(key is None for key in node.keys):
            add(node, "** unpacking inside a dict display (Python 3.5+)")
        elif isinstance(node, ast.Name):
            if node.id in PY2_ONLY_NAMES:
                add(node, "%s exists only in Python 2" % node.id)
            if node.id in PY3_ONLY_BUILTINS:
                add(node, "%s differs between Python 2 and 3" % node.id)
        elif isinstance(node, ast.Constant) and isinstance(node.value, bytes):
            add(node, "bytes literal: str in Python 2, bytes in Python 3")
        elif isinstance(node, ast.Constant) and isinstance(node.value, int) and not isinstance(node.value, bool):
            segment = ast.get_source_segment(raw.decode("utf-8"), node) or ""
            if "_" in segment:
                add(node, "underscore in a number literal (Python 3.6+)")
    return problems


class CheckedDivision(ast.NodeTransformer):
    def visit_BinOp(self, node):
        self.generic_visit(node)
        if isinstance(node.op, ast.Div):
            call = ast.Call(func=ast.Name(id="__checked_div__", ctx=ast.Load()),
                            args=[node.left, node.right, ast.Constant(value=node.lineno)], keywords=[])
            return ast.copy_location(call, node)
        return node

    def visit_AugAssign(self, node):
        self.generic_visit(node)
        if isinstance(node.op, ast.Div):
            raise SyntaxError("line %d: `/=` is not checked; write x = x / float(y)" % node.lineno)
        return node


def dynamic_problems(path, root, functions):
    import os
    import types
    found = {}

    def checked_div(a, b, line):
        if isinstance(a, int) and isinstance(b, int) and not isinstance(a, bool):
            found[line] = "int / int: Python 2 floors this, Python 3 does not (use // or float())"
        return a / b

    top = {}

    def build(directory, dotted):
        module = types.ModuleType(dotted)
        code = os.path.join(directory, "code.py")
        if os.path.isfile(code):
            tree = ast.parse(open(code).read(), code)
            if os.path.abspath(code) == os.path.abspath(path):
                tree = ast.fix_missing_locations(CheckedDivision().visit(tree))
                module.__dict__["__checked_div__"] = checked_div
            module.__dict__.update(top)
            exec(compile(tree, code, "exec"), module.__dict__)
            return module
        for name in sorted(os.listdir(directory)):
            if os.path.isdir(os.path.join(directory, name)):
                setattr(module, name, build(os.path.join(directory, name), dotted + "." + name))
        return module

    for name in sorted(os.listdir(root)):
        if os.path.isdir(os.path.join(root, name)):
            top[name] = build(os.path.join(root, name), name)
    for dotted in functions:
        parts = dotted.split(".")
        target = top[parts[0]]
        for part in parts[1:]:
            target = getattr(target, part)
        for line in ("L1", "L2", "L3"):
            for now in (1795009200000, 1795031999000, 1795046400000):
                try:
                    target(line, now_ms=now)
                except TypeError:
                    target(now_ms=now)
    return sorted(found.items())


def main():
    path = sys.argv[1]
    problems = static_problems(path)
    if "--run" in sys.argv:
        at = sys.argv.index("--run")
        problems += dynamic_problems(path, sys.argv[at + 1], sys.argv[at + 2:])
    for line, message in sorted(set(problems)):
        print("%d: %s" % (line, message))
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()

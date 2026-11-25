'use strict';
/**
 * The subset of the Ignition expression language this project is allowed to use, so that
 * the previewer can evaluate every expression binding and the validator can reject the rest.
 *
 *   literals   "text"  'text'  12  3.5  true  false  null
 *   references {view.custom.x}  {view.params.x}  {session.custom.x}  {session.props.x}
 *              {page.props.path}  {this.props.x}  {value} (in an expression transform)
 *   operators  + - * / %   = != < <= > >=   && ||  !   ( )
 *   functions  see FUNCTIONS below
 *
 * parse() returns an AST; evaluate() runs it against a scope. Anything outside the subset is
 * a parse error with a position, which validate.js reports.
 */

const FUNCTIONS = {
    // name: [minArgs, maxArgs]
    now: [0, 1], dateFormat: [2, 2], if: [3, 3], runScript: [1, 12], concat: [1, 20], toStr: [1, 2], toInt: [1, 2],
    toFloat: [1, 2], coalesce: [1, 20], upper: [1, 1], lower: [1, 1], numberFormat: [2, 2], round: [1, 2], len: [1, 1],
    isNull: [1, 1], min: [1, 20], max: [1, 20], abs: [1, 1],
};

function tokenize(src) {
    const tokens = [];
    let i = 0;
    while (i < src.length) {
        const c = src[i];
        if (/\s/.test(c)) { i++; continue; }
        if (c === '"' || c === "'") {
            let j = i + 1, text = '';
            while (j < src.length && src[j] !== c) {
                if (src[j] === '\\' && j + 1 < src.length) { text += src[j + 1] === 'n' ? '\n' : src[j + 1]; j += 2; } else text += src[j++];
            }
            if (j >= src.length) throw new Error(`unterminated string at ${i}`);
            tokens.push({ t: 'str', v: text, at: i });
            i = j + 1;
            continue;
        }
        if (c === '{') {
            const j = src.indexOf('}', i);
            if (j < 0) throw new Error(`unterminated reference at ${i}`);
            tokens.push({ t: 'ref', v: src.slice(i + 1, j).trim(), at: i });
            i = j + 1;
            continue;
        }
        const num = /^\d+(\.\d+)?/.exec(src.slice(i));
        if (num) { tokens.push({ t: 'num', v: Number(num[0]), at: i }); i += num[0].length; continue; }
        const id = /^[A-Za-z_]\w*/.exec(src.slice(i));
        if (id) { tokens.push({ t: 'id', v: id[0], at: i }); i += id[0].length; continue; }
        const op = /^(&&|\|\||!=|<=|>=|[-+*/%=<>!(),])/.exec(src.slice(i));
        if (op) { tokens.push({ t: 'op', v: op[0], at: i }); i += op[0].length; continue; }
        throw new Error(`unexpected character ${JSON.stringify(c)} at ${i}`);
    }
    return tokens;
}

function parse(src) {
    const tokens = tokenize(src);
    let pos = 0;
    const peek = () => tokens[pos];
    const isOp = v => peek() && peek().t === 'op' && peek().v === v;
    const eat = v => { if (!isOp(v)) throw new Error(`expected ${v} at ${peek() ? peek().at : 'end'}`); pos++; };
    const binary = (next, ops) => () => {
        let left = next();
        while (peek() && peek().t === 'op' && ops.includes(peek().v)) {
            const op = tokens[pos++].v;
            left = { k: 'bin', op, left, right: next() };
        }
        return left;
    };
    const primary = () => {
        const tok = tokens[pos++];
        if (!tok) throw new Error('unexpected end of expression');
        if (tok.t === 'num' || tok.t === 'str') return { k: 'lit', v: tok.v };
        if (tok.t === 'ref') return { k: 'ref', path: tok.v };
        if (tok.t === 'id') {
            if (tok.v === 'true' || tok.v === 'false') return { k: 'lit', v: tok.v === 'true' };
            if (tok.v === 'null') return { k: 'lit', v: null };
            if (!isOp('(')) throw new Error(`unknown name ${tok.v} at ${tok.at}`);
            if (!FUNCTIONS[tok.v]) throw new Error(`function ${tok.v}() is outside the previewable subset (at ${tok.at})`);
            eat('(');
            const args = [];
            if (!isOp(')')) { args.push(or()); while (isOp(',')) { pos++; args.push(or()); } }
            eat(')');
            const [lo, hi] = FUNCTIONS[tok.v];
            if (args.length < lo || args.length > hi) throw new Error(`${tok.v}() takes ${lo}..${hi} arguments, got ${args.length}`);
            return { k: 'call', name: tok.v, args };
        }
        if (tok.t === 'op' && tok.v === '(') { const inner = or(); eat(')'); return inner; }
        if (tok.t === 'op' && tok.v === '-') return { k: 'neg', arg: primary() };
        if (tok.t === 'op' && tok.v === '!') return { k: 'not', arg: primary() };
        throw new Error(`unexpected ${tok.v} at ${tok.at}`);
    };
    const mul = binary(primary, ['*', '/', '%']);
    const add = binary(mul, ['+', '-']);
    const cmp = binary(add, ['=', '!=', '<', '<=', '>', '>=']);
    const and = binary(cmp, ['&&']);
    const or = binary(and, ['||']);
    const ast = or();
    if (pos < tokens.length) throw new Error(`unexpected ${tokens[pos].v} at ${tokens[pos].at}`);
    return ast;
}

/** Every {reference} and every runScript("fn", ...) call in an expression. */
function inspect(ast, out = { refs: [], scripts: [] }) {
    if (!ast) return out;
    if (ast.k === 'ref') out.refs.push(ast.path);
    if (ast.k === 'call') {
        if (ast.name === 'runScript') out.scripts.push(ast);
        ast.args.forEach(a => inspect(a, out));
    }
    ['left', 'right', 'arg'].forEach(key => ast[key] && inspect(ast[key], out));
    return out;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** java.text.SimpleDateFormat, the letters this project uses, in UTC. */
function dateFormat(ms, pattern) {
    const d = new Date(ms);
    const pad = (n, w) => String(n).padStart(w, '0');
    return pattern.replace(/'([^']*)'|y+|M+|d+|E+|H+|h+|m+|s+|a/g, (m, quoted) => {
        if (quoted !== undefined) return quoted;
        switch (m[0]) {
            case 'y': return m.length === 2 ? pad(d.getUTCFullYear() % 100, 2) : String(d.getUTCFullYear());
            case 'M': return m.length >= 4 ? MONTHS[d.getUTCMonth()] : m.length === 3 ? MONTHS[d.getUTCMonth()].slice(0, 3) : pad(d.getUTCMonth() + 1, m.length);
            case 'd': return pad(d.getUTCDate(), m.length);
            case 'E': return m.length >= 4 ? DAYS[d.getUTCDay()] : DAYS[d.getUTCDay()].slice(0, 3);
            case 'H': return pad(d.getUTCHours(), m.length);
            case 'h': return pad(d.getUTCHours() % 12 || 12, m.length);
            case 'm': return pad(d.getUTCMinutes(), m.length);
            case 's': return pad(d.getUTCSeconds(), m.length);
            default: return d.getUTCHours() < 12 ? 'AM' : 'PM';
        }
    });
}

/**
 * scope: { ref(path) -> value, nowMs, runScript(fn, args) -> value }
 */
function evaluate(ast, scope) {
    const ev = node => evaluate(node, scope);
    switch (ast.k) {
        case 'lit': return ast.v;
        case 'ref': return scope.ref(ast.path);
        case 'neg': return -ev(ast.arg);
        case 'not': return !ev(ast.arg);
        case 'bin': {
            if (ast.op === '&&') return Boolean(ev(ast.left)) && Boolean(ev(ast.right));
            if (ast.op === '||') return Boolean(ev(ast.left)) || Boolean(ev(ast.right));
            const a = ev(ast.left), b = ev(ast.right);
            switch (ast.op) {
                case '+': return typeof a === 'string' || typeof b === 'string' ? `${a === null ? '' : a}${b === null ? '' : b}` : a + b;
                case '-': return a - b;
                case '*': return a * b;
                case '/': return a / b;
                case '%': return a % b;
                case '=': return a === b;
                case '!=': return a !== b;
                case '<': return a < b;
                case '<=': return a <= b;
                case '>': return a > b;
                default: return a >= b;
            }
        }
        default: break;
    }
    const args = ast.args;
    switch (ast.name) {
        case 'now': return { date: scope.nowMs };
        case 'dateFormat': { const d = ev(args[0]); return dateFormat(d && d.date !== undefined ? d.date : d, ev(args[1])); }
        case 'if': return ev(args[0]) ? ev(args[1]) : ev(args[2]);
        case 'runScript': return scope.runScript(ev(args[0]), args.slice(2).map(ev));
        case 'concat': return args.map(ev).join('');
        case 'toStr': { const v = ev(args[0]); return v === null || v === undefined ? (args[1] ? ev(args[1]) : null) : String(v); }
        case 'toInt': { const v = Number(ev(args[0])); return Number.isFinite(v) ? Math.trunc(v) : (args[1] ? ev(args[1]) : null); }
        case 'toFloat': { const v = Number(ev(args[0])); return Number.isFinite(v) ? v : (args[1] ? ev(args[1]) : null); }
        case 'coalesce': { for (const a of args) { const v = ev(a); if (v !== null && v !== undefined) return v; } return null; }
        case 'upper': return String(ev(args[0])).toUpperCase();
        case 'lower': return String(ev(args[0])).toLowerCase();
        case 'isNull': { const v = ev(args[0]); return v === null || v === undefined; }
        case 'len': { const v = ev(args[0]); return v === null || v === undefined ? 0 : v.length; }
        case 'abs': return Math.abs(ev(args[0]));
        case 'min': return Math.min(...args.map(ev));
        case 'max': return Math.max(...args.map(ev));
        case 'round': { const p = args[1] ? ev(args[1]) : 0; return Math.round(ev(args[0]) * 10 ** p) / 10 ** p; }
        case 'numberFormat': {
            // DecimalFormat patterns of the form #,##0.00 only
            const v = ev(args[0]), pattern = ev(args[1]);
            const decimals = (pattern.split('.')[1] || '').length;
            return Number(v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: pattern.includes(',') });
        }
        default: throw new Error(`cannot evaluate ${ast.name}()`);
    }
}

module.exports = { FUNCTIONS, parse, inspect, evaluate, dateFormat };

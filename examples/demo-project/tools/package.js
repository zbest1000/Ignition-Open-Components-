#!/usr/bin/env node
'use strict';
/**
 * Packs project/ into dist/OpenEChartsDemo.zip in the layout of a project export:
 * project.json and the module folders at the root of the archive, no enclosing folder.
 *
 *   node examples/demo-project/tools/package.js            write the archive
 *   node examples/demo-project/tools/package.js --check    exit 1 if the archive does not hold exactly project/
 *
 * The archive is reproducible: entries sorted by name, one fixed timestamp, no extra fields.
 * Run it after every change to project/ (tools/validate.js fails when the archive is stale).
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const lib = require('./lib/project');
const zip = require('./lib/zip');

const OUT = path.join(lib.DEMO, 'dist', 'OpenEChartsDemo.zip');
const SKIP = name => name.includes('__pycache__') || name.endsWith('.pyc') || path.posix.basename(name).startsWith('.');

function entries() {
    return lib.walk(lib.PROJECT).filter(name => !SKIP(name)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
        .map(name => ({ name, data: fs.readFileSync(path.join(lib.PROJECT, name)) }));
}

/** null when the archive holds exactly the files of project/, otherwise what differs. */
function difference() {
    if (!fs.existsSync(OUT)) return 'dist/OpenEChartsDemo.zip does not exist';
    const packed = new Map(zip.read(fs.readFileSync(OUT)).map(e => [e.name, e.data]));
    const current = entries();
    for (const entry of current) {
        if (!packed.has(entry.name)) return `${entry.name} is not in the archive`;
        if (!packed.get(entry.name).equals(entry.data)) return `${entry.name} differs from the archive`;
    }
    if (packed.size !== current.length) return `the archive holds ${packed.size - current.length} file(s) that project/ no longer has`;
    return null;
}

if (require.main === module) {
    if (process.argv.includes('--check')) {
        const diff = difference();
        console.log(diff ? `stale: ${diff}. Run: node examples/demo-project/tools/package.js` : 'dist/OpenEChartsDemo.zip matches project/');
        process.exit(diff ? 1 : 0);
    }
    const list = entries();
    if (!list.some(e => e.name === 'project.json')) throw new Error('project/project.json is missing: run tools/build.js first');
    const archive = zip.write(list);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, archive);
    const total = list.reduce((sum, e) => sum + e.data.length, 0);
    console.log(`${path.relative(process.cwd(), OUT)}: ${list.length} files, ${total} bytes -> ${archive.length} bytes`);
    console.log(`sha256 ${crypto.createHash('sha256').update(archive).digest('hex')}`);
}

module.exports = { difference, OUT };

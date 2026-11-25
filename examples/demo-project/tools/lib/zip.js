'use strict';
/**
 * A minimal, deterministic ZIP writer and reader on Node built-ins.
 * Entries are written in the order given with one fixed timestamp, no extra fields and no
 * directory entries, so the same input gives the same bytes (with the same zlib).
 */
const zlib = require('zlib');

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(buffer) {
    let c = 0xffffffff;
    for (let i = 0; i < buffer.length; i++) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

/** 2026-01-01 00:00:00 in DOS date / time form. */
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

/** entries: [{ name: 'a/b.json', data: Buffer }] -> Buffer */
function write(entries) {
    const locals = [];
    const centrals = [];
    let offset = 0;
    for (const entry of entries) {
        const name = Buffer.from(entry.name, 'utf8');
        const deflated = zlib.deflateRawSync(entry.data, { level: 9 });
        const stored = deflated.length >= entry.data.length;
        const body = stored ? entry.data : deflated;
        const crc = crc32(entry.data);
        const common = Buffer.alloc(26);
        common.writeUInt16LE(20, 0); // version needed
        common.writeUInt16LE(0x0800, 2); // UTF-8 names
        common.writeUInt16LE(stored ? 0 : 8, 4);
        common.writeUInt16LE(DOS_TIME, 6);
        common.writeUInt16LE(DOS_DATE, 8);
        common.writeUInt32LE(crc, 10);
        common.writeUInt32LE(body.length, 14);
        common.writeUInt32LE(entry.data.length, 18);
        common.writeUInt16LE(name.length, 22);
        common.writeUInt16LE(0, 24); // no extra field
        const local = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), common, name, body]);
        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4); // version made by: 2.0, FAT attributes
        common.copy(central, 6);
        central.writeUInt16LE(0, 32); // comment length
        central.writeUInt16LE(0, 34); // disk number
        central.writeUInt16LE(0, 36); // internal attributes
        central.writeUInt32LE(0, 38); // external attributes
        central.writeUInt32LE(offset, 42);
        locals.push(local);
        centrals.push(Buffer.concat([central, name]));
        offset += local.length;
    }
    const directory = Buffer.concat(centrals);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(directory.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, directory, end]);
}

/** Buffer -> [{ name, data }] in directory order. Enough for archives written by write(). */
function read(buffer) {
    const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (end < 0) throw new Error('not a zip archive');
    const count = buffer.readUInt16LE(end + 10);
    let at = buffer.readUInt32LE(end + 16);
    const out = [];
    for (let i = 0; i < count; i++) {
        const method = buffer.readUInt16LE(at + 10);
        const size = buffer.readUInt32LE(at + 20);
        const nameLength = buffer.readUInt16LE(at + 28);
        const extraLength = buffer.readUInt16LE(at + 30);
        const commentLength = buffer.readUInt16LE(at + 32);
        const local = buffer.readUInt32LE(at + 42);
        const name = buffer.toString('utf8', at + 46, at + 46 + nameLength);
        const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
        const body = buffer.subarray(start, start + size);
        out.push({ name, data: method === 0 ? Buffer.from(body) : zlib.inflateRawSync(body) });
        at += 46 + nameLength + extraLength + commentLength;
    }
    return out;
}

module.exports = { write, read, crc32 };

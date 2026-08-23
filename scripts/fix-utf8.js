/**
 * Repairs globals.css (or any file) that contains stray CP1252 bytes inside
 * otherwise-valid UTF-8 — e.g. an em-dash written as 0x97 by PowerShell's
 * ANSI Add-Content. Each invalid byte is re-encoded as proper UTF-8.
 */
const fs = require("fs");

const FILE = process.argv[2] || "src/app/globals.css";
const buf = fs.readFileSync(FILE);

// CP1252 byte -> Unicode char (only the 0x80–0x9F range differs from latin1)
const CP1252 = {
  0x80: "\u20AC", 0x82: "\u201A", 0x83: "\u0192", 0x84: "\u201E",
  0x85: "\u2026", 0x86: "\u2020", 0x87: "\u2021", 0x88: "\u02C6",
  0x89: "\u2030", 0x8A: "\u0160", 0x8B: "\u2039", 0x8C: "\u0152",
  0x8E: "\u017D", 0x91: "\u2018", 0x92: "\u2019", 0x93: "\u201C",
  0x94: "\u201D", 0x95: "\u2022", 0x96: "\u2013", 0x97: "\u2014",
  0x98: "\u02DC", 0x99: "\u2122", 0x9A: "\u0161", 0x9B: "\u203A",
  0x9C: "\u0153", 0x9E: "\u017E", 0x9F: "\u0178",
};

// Walk the buffer and validate UTF-8 sequences
const out = [];
let i = 0;
let fixed = 0;
while (i < buf.length) {
  const b = buf[i];
  if (b < 0x80) {
    out.push(b);
    i++;
    continue;
  }
  let seqLen = 0;
  if ((b & 0xe0) === 0xc0) seqLen = 2;
  else if ((b & 0xf0) === 0xe0) seqLen = 3;
  else if ((b & 0xf8) === 0xf0) seqLen = 4;

  let valid = seqLen > 0 && i + seqLen <= buf.length;
  if (valid) {
    for (let j = 1; j < seqLen; j++) {
      if ((buf[i + j] & 0xc0) !== 0x80) { valid = false; break; }
    }
  }

  if (valid) {
    for (let j = 0; j < seqLen; j++) out.push(buf[i + j]);
    i += seqLen;
  } else if (CP1252[b] !== undefined) {
    // Stray CP1252 byte — re-encode as proper UTF-8
    const chars = Buffer.from(CP1252[b], "utf8");
    for (const cb of chars) out.push(cb);
    fixed++;
    i++;
  } else {
    // Unknown invalid byte — replace with U+FFFD
    out.push(0xef, 0xbf, 0xbd);
    fixed++;
    i++;
  }
}

if (fixed > 0) {
  fs.writeFileSync(FILE, Buffer.from(out));
  console.log(`fixed ${fixed} invalid byte(s) in ${FILE}`);
} else {
  console.log(`${FILE} is already valid UTF-8`);
}

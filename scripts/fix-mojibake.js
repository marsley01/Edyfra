/**
 * Scans source files for mojibake (UTF-8 read as CP1252) introduced by
 * PowerShell round-trips and repairs the known sequences in place.
 */
const fs = require("fs");
const path = require("path");

// CP1252-misread sequences -> correct characters
const MAP = {
  "Ã¢â‚¬â€": "—",
  "â€”": "—",
  "â€œ": "\u201C",
  "â€\u009D": "\u201D",
  "â€™": "\u2019",
  "â€˜": "\u2018",
  "â€¦": "…",
  "â€“": "–",
  "Â·": "·",
  "Â©": "©",
  "âŒ˜": "⌘",
  "â†’": "→",
  "Ã—": "×",
  "Ã©": "é",
};

// Emoji sequences (flag + common emoji seen in the codebase)
const EMOJI_MAP = {
  "ðŸ‡°ðŸ‡ª": "🇰🇪",
  "ðŸ‘‹": "👋",
  "ðŸ§®": "🧮",
  "ðŸ”¬": "🔬",
  "ðŸ’»": "💻",
  "ðŸ“š": "📚",
  "ðŸŽ“": "🎓",
  "â˜•": "☕",
  "ðŸ’¡": "💡",
  "ðŸ”¥": "🔥",
  "â¤": "🤍",
  "ðŸ'š": "📚",
};

const ALL = { ...MAP, ...EMOJI_MAP };

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, out);
    } else if (/\.(tsx?|css|md|json)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const root = path.join(__dirname, "..", "src");
let touched = 0;
for (const file of walk(root)) {
  const before = fs.readFileSync(file, "utf8");
  let after = before;
  for (const [bad, good] of Object.entries(ALL)) {
    if (after.includes(bad)) after = after.split(bad).join(good);
  }
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    touched++;
    console.log("fixed:", path.relative(process.cwd(), file));
  }
}
console.log(touched === 0 ? "no mojibake found" : `${touched} file(s) repaired`);

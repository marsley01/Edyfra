/**
 * Removes the legacy purple/indigo brand from all source files and maps it to
 * the current brand tokens (brand orange / coral / primary).
 *
 * Rules:
 *   - Legacy hexes -> brand hexes
 *   - Gradient stops (from-/via-/to-) purple|violet|fuchsia -> rose/pink family
 *     (keeps multi-color variety without purple); indigo -> blue family
 *   - text/bg/border/ring/fill/etc purple|violet|indigo|fuchsia -> primary
 */
const fs = require("fs");
const path = require("path");

const HEX_MAP = [
  [/ #3730A3/gi, " #FF9500"],
  [/#3730A3/gi, "#FF9500"],
  [/#4f46e5/gi, "#E8521B"],
  [/#818cf8/gi, "#FF9500"],
  [/#6366f1/gi, "#FF9500"],
  [/#5A3ACA/gi, "#FF9500"],
  [/#3A2A9A/gi, "#E8521B"],
  [/#2D1FE8/gi, "#FF9500"],
  [/electric-ultramarine/g, "brand-orange"],
];

const CLASS_RULES = [
  // Gradient stops: purple family -> rose/pink, indigo -> blue
  [/(from)-(?:purple|violet|fuchsia)-\d{2,3}/g, "$1-rose-500"],
  [/(via)-(?:purple|violet|fuchsia)-\d{2,3}/g, "$1-rose-500"],
  [/(to)-(?:purple|violet|fuchsia)-\d{2,3}/g, "$1-pink-600"],
  [/(from|via|to)-indigo-\d{2,3}/g, "$1-blue-500"],
  // Utility colors -> primary (keep opacity modifier)
  [
    /(text|bg|border|ring|fill|stroke|decoration|divide|caret|accent|shadow|outline)-(?:purple|violet|indigo|fuchsia)-(\d{2,3})(\/\d{1,3})?/g,
    "$1-primary$3",
  ],
  // Shade-less variants
  [
    /(text|bg|border|ring|fill|stroke|decoration|divide|caret|accent)-(?:purple|violet|indigo|fuchsia)(?![-\w])(\/\d{1,3})?/g,
    "$1-primary$2",
  ],
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".next"].includes(entry.name)) walk(full, out);
    } else if (/\.(tsx?|css)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

let touched = 0;
for (const file of walk(path.join(__dirname, "..", "src"))) {
  const before = fs.readFileSync(file, "utf8");
  let after = before;
  for (const [re, to] of HEX_MAP) after = after.replace(re, to);
  for (const [re, to] of CLASS_RULES) after = after.replace(re, to);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    touched++;
    console.log("updated:", path.relative(process.cwd(), file));
  }
}
console.log(touched === 0 ? "nothing to change" : `${touched} file(s) updated`);

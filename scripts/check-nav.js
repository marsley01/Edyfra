const fs = require("fs");
for (const f of [
  "src/components/dashboard/MobileNav.tsx",
  "src/components/dashboard/TutorMobileNav.tsx",
]) {
  const t = fs.readFileSync(f, "utf8");
  const m = t.match(/<nav className="fixed bottom-0[^"]*"/);
  console.log(f.split("/").pop(), "=>", m ? m[0].slice(0, 140) : "nav not found");
  const inner = t.match(/nav[^>]*>\s*\$?\s*\{?[\s\S]{0,200}?(h-\d+|py-\d)/);
  if (inner) console.log("   inner height hint:", inner[1]);
}

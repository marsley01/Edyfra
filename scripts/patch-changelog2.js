const fs = require("fs");
const f = "src/app/changelog/changelog-client.tsx";
let c = fs.readFileSync(f, "utf8");

// 1. Remove the inline form state/handler block I added earlier
const start = c.indexOf("  // Feedback / complaints form");
const end = c.indexOf("  return (");
if (start > -1 && end > start) {
  c = c.slice(0, start) + c.slice(end);
  console.log("removed inline state block");
}

// 2. Remove unused imports
c = c.replace(/import \{ Button \} from "@\/components\/ui\/button";\r?\n/, "");
c = c.replace(/import \{ Input \} from "@\/components\/ui\/input";\r?\n/, "");
c = c.replace(/import \{ submitFeedback \} from "@\/app\/actions\/feedback";\r?\n/, "");
c = c.replace(/import \{ showError, showSuccess \} from "@\/lib\/toast";\r?\n/, "");
c = c.replace(/import \{ MiniBlobs \} from "@\/components\/ui\/mini-blobs";\r?\n/, "");
c = c.replace(/\r?\n\s*Bug,\r?\n/g, "\r\n");
c = c.replace(/\r?\n\s*Zap,\r?\n/g, "\r\n");
c = c.replace(/\r?\n\s*type LucideIcon,\r?\n/g, "\r\n  type LucideIcon,\r\n");

// 3. Add FeedbackSection import
c = c.replace(
  'import { LottieAnimation } from "@/components/lottie-animation";',
  'import { LottieAnimation } from "@/components/lottie-animation";\r\nimport { FeedbackSection } from "@/components/changelog/feedback-section";'
);

// 4. Insert <FeedbackSection /> before the final closing div
const anchor = "        })}\r\n        </div>\r\n      </div>\r\n    </div>\r\n  );\r\n}";
if (!c.includes(anchor)) {
  console.error("ANCHOR MISSING");
  process.exit(1);
}
c = c.replace(
  anchor,
  "        })}\r\n        </div>\r\n      </div>\r\n\r\n      <FeedbackSection />\r\n    </div>\r\n  );\r\n}"
);

fs.writeFileSync(f, c, "utf8");
console.log("changelog wired to FeedbackSection");

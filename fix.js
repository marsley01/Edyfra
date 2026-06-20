const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'actions', 'user.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Add import if not present
if (!content.includes('captureServerError')) {
  content = content.replace(
    'import { SESSION_CONFIG, TUTOR_CONFIG, TIER_CONFIG } from "@/lib/config";',
    'import { SESSION_CONFIG, TUTOR_CONFIG, TIER_CONFIG } from "@/lib/config";\nimport { captureServerError } from "@/lib/sentry";'
  );
}

// Replace console.error calls
content = content.replace(/console\.error\("Error in ([\w]+):", (.*?)\);/g, (match, actionName, errVar) => {
  return `captureServerError(${errVar}, { action: "${actionName}" });`;
});

// Also replace others like console.error('Error creating test tutor:', error);
content = content.replace(/console\.error\('Error creating test tutor:', error\);/g, `captureServerError(error, { action: "createTestTutorAction" });`);
content = content.replace(/console\.error\("Error recalibrating tier:", error\);/g, `captureServerError(error, { action: "recalibrateTier" });`);


fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated user.ts');

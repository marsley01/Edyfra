const fs = require('fs');

const content = fs.readFileSync('prisma/schema.prisma', 'utf8');

const regex = /<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> main/;
const match = content.match(regex);

if (!match) {
  console.log("Conflict markers not found!");
  process.exit(1);
}

const headSec = match[1];
const mainSec = match[2];

// We want to use mainSec as base.
// 1. Find User model in mainSec and add fields.
const userRegex = /(model User \{[\s\S]*?\n\})/;
const userMatch = mainSec.match(userRegex);

if (!userMatch) {
  console.log("User model not found in main section!");
  process.exit(1);
}

const userContent = userMatch[1];
const lines = userContent.split('\n');
const insertIdx = lines.length - 2; // right before closing brace
lines.splice(insertIdx, 0, "  institutionStudent       InstitutionStudent?", "  institutionTutors        InstitutionTutor[]");
const newUserContent = lines.join('\n');

let resolvedMain = mainSec.replace(userContent, newUserContent);

// 2. Extract Institution models from headSec
const models = ["Institution", "InstitutionStaff", "InstitutionStudent", "InstitutionTutor"];
let instModels = "";

for (const model of models) {
  const modelRegex = new RegExp(`(model ${model} \\{[\\s\\S]*?\\n\\})`);
  const modelMatch = headSec.match(modelRegex);
  if (modelMatch) {
    instModels += "\n\n" + modelMatch[1];
  } else {
    console.log(`Model ${model} not found in HEAD section!`);
  }
}

const resolvedSchema = resolvedMain + instModels + "\n";
fs.writeFileSync('prisma/schema.prisma', resolvedSchema, 'utf8');
console.log("Successfully resolved prisma/schema.prisma!");

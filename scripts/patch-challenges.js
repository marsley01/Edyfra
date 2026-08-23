const fs = require("fs");
const f = "src/app/actions/challenge-ai.ts";
let c = fs.readFileSync(f, "utf8");

const oldBlock = [
  '    } catch (aiErr) {',
  '      console.warn("[getOrCreateDailyChallenge] AI generation failed, using static fallback:", aiErr);',
    '    }',
    '',
    '    // Fallback: static challenge when AI is unavailable',
    '    return await seedStaticChallenge(level, subject);',
].join("\r\n");

const newBlock = [
  '    } catch (aiErr) {',
  '      console.warn("[getOrCreateDailyChallenge] AI generation failed:", aiErr);',
  '      // No demo fallback — challenges are AI-generated only. Caller surfaces a retry.',
  '      return null;',
    '    }',
].join("\r\n");

if (!c.includes(oldBlock)) {
  console.error("BLOCK NOT FOUND");
  process.exit(1);
}
c = c.replace(oldBlock, newBlock);
fs.writeFileSync(f, c, "utf8");
console.log("getOrCreateDailyChallenge fallback removed");

const fs = require("fs");
const f = "src/app/actions/challenge-ai.ts";
let c = fs.readFileSync(f, "utf8");

const startMarker = "export async function generatePersonalizedChallenge";
const startIdx = c.indexOf(startMarker);
if (startIdx === -1) { console.error("start marker not found"); process.exit(1); }

// Find the end: the closing of the function is the last "}" before EOF in this file region
// The function runs to the end of the file (it is the last export).
const replacement = `export async function generatePersonalizedChallenge(userId: string, level: string) {
  try {
    // ── 1. Onboarding profile: the subjects the student picked + weak topics ──
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { subjects: true, weakTopics: true },
    });
    const selectedSubjects = (profile?.subjects as string[] | null) ?? [];
    const weakTopics = (profile?.weakTopics as string[] | null) ?? [];

    // ── 2. Attempt history: real performance per subject ──
    const recentAttempts = await prisma.dailyChallengeAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { challenge: { select: { subject: true, level: true } } },
    });

    const subjectPerformance: Record<string, { correct: number; total: number }> = {};
    recentAttempts.forEach((attempt) => {
      const subject = attempt.challenge.subject;
      if (!subjectPerformance[subject]) subjectPerformance[subject] = { correct: 0, total: 0 };
      subjectPerformance[subject].total++;
      if (attempt.correct) subjectPerformance[subject].correct++;
    });

    // ── 3. Pick the target subject ──
    //    a) Weakest performed subject (needs >= 3 attempts for a real signal)
    //    b) Otherwise rotate through the subjects chosen at onboarding, so the
    //       challenge always targets something the student actually studies.
    let targetSubject = "";
    let targetNote = "";
    let lowestScore = 100;
    Object.entries(subjectPerformance).forEach(([subject, performance]) => {
      if (performance.total >= 3) {
        const score = (performance.correct / performance.total) * 100;
        if (score < lowestScore) {
          lowestScore = score;
          targetSubject = subject;
          targetNote = \`(recent success rate \${Math.round(score)}% — weakest performed subject)\`;
        }
      }
    });

    if (!targetSubject && selectedSubjects.length > 0) {
      // Deterministic daily rotation through the student's own subjects
      const dayIndex = Math.floor(Date.now() / 86_400_000);
      targetSubject = selectedSubjects[dayIndex % selectedSubjects.length];
      targetNote = "(chosen from the subjects you selected during onboarding)";
    }

    if (!targetSubject) {
      targetSubject = "Mathematics";
      targetNote = "(default — set your subjects on your profile for targeted challenges)";
    }

    // Weak topics from onboarding that map to the target subject get drilled
    const relevantWeakTopics = weakTopics
      .map((t) => String(t).trim())
      .filter(Boolean);

    // ── 4. AI generates the real challenge ──
    const adaptivePrompt = \`Create a challenging but achievable multiple-choice question for \${level === "UNIVERSITY" ? "university" : "high school"} level students.

STUDENT ANALYSIS:
- Target subject: \${targetSubject} \${targetNote}
- Recent success rate: \${recentAttempts.length > 0 ? Math.round((recentAttempts.filter((a) => a.correct).length / recentAttempts.length) * 100) : 0}%
- Subjects the student studies: \${selectedSubjects.join(", ") || "not set"}
\${relevantWeakTopics.length > 0 ? \`- Weak topics flagged by the student: \${relevantWeakTopics.join(", ")} — aim the question at ONE of these topics.\` : ""}

TASK:
Generate a question for \${targetSubject} that:
1. Is slightly challenging (target 60-70% success rate)
2. Addresses common misconceptions in this subject
3. Includes real-world Kenyan context
4. Builds confidence while teaching critical thinking

Format: {"question": "...", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "..."}\`;

    const aiResponse = await generateAIResponse(adaptivePrompt, targetSubject);
    if (!aiResponse?.trim()) {
      throw new Error("AI generation failed");
    }

    const [parsed] = parseChallengesFromAI(
      aiResponse.trim().startsWith("[") ? aiResponse : \`[\${aiResponse.match(/\\{[\\s\\S]*\\}/)?.[0] || aiResponse}]\`
    );

    return await prisma.dailyChallenge.create({
      data: {
        subject: targetSubject,
        level: level as EduLevel,
        question: parsed.question,
        options: parsed.options,
        answer: parsed.answer,
        explanation: parsed.explanation,
        date: new Date(),
      },
    });
  } catch (error) {
    // No demo fallback — if the AI is unavailable the UI shows a retry.
    console.warn("Error generating personalized challenge:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to generate personalized challenge");
  }
}
`;

c = c.slice(0, startIdx) + replacement;
fs.writeFileSync(f, c, "utf8");
console.log("generatePersonalizedChallenge rewritten (onboarding-aware, no static fallback)");

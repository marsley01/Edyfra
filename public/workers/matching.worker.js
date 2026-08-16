/**
 * matching.worker.js — Layer 3: Off-main-thread matching scorer.
 *
 * The main thread posts a message with:
 *   { type: "RANK", payload: { candidates: TutorCandidate[], student: StudentContext } }
 *
 * The worker responds with:
 *   { type: "RESULT", payload: { ranked: TutorCandidate[] } }
 *
 * This keeps heavy sorting/scoring loops off the UI thread so the page
 * never jank while the matching algorithm runs.
 *
 * NOTE: This runs in a plain Web Worker context (no React, no imports).
 * Keep it as vanilla JS.
 */

self.onmessage = function (event) {
  const { type, payload } = event.data;

  if (type === "RANK") {
    try {
      const ranked = rankCandidates(payload.candidates, payload.student);
      self.postMessage({ type: "RESULT", payload: { ranked } });
    } catch (err) {
      self.postMessage({
        type: "ERROR",
        payload: { message: err?.message || "Worker ranking failed" },
      });
    }
    return;
  }

  if (type === "FILTER") {
    try {
      const filtered = filterCandidates(payload.candidates, payload.filters);
      self.postMessage({ type: "FILTER_RESULT", payload: { filtered } });
    } catch (err) {
      self.postMessage({
        type: "ERROR",
        payload: { message: err?.message || "Worker filter failed" },
      });
    }
    return;
  }
};

// ── Scoring ────────────────────────────────────────────────────────────────────

/**
 * Multi-factor tutor ranking — mirrors the TypeScript match-algorithm.ts logic.
 *
 * Score components:
 *   - Subject match (exact = 1.0, none = 0)
 *   - Rating (0-1 normalised from 0-5)
 *   - Load factor (fewer active sessions = higher score)
 *   - Education level match
 *   - Response rate
 *   - Recency (last active)
 */
function scoreTutor(candidate, student) {
  let score = 0;

  // ── Subject match (40% weight)
  const subjects = candidate.subjects || [];
  const subjectMatch = student.subject
    ? subjects.some((s) =>
        s.toLowerCase().includes(student.subject.toLowerCase())
      )
      ? 1.0
      : 0.2
    : 0.5;
  score += subjectMatch * 40;

  // ── Rating (25% weight) — normalised 0-5 → 0-1
  const rating = Math.min(Math.max(candidate.rating || 0, 0), 5) / 5;
  score += rating * 25;

  // ── Load factor (20% weight) — fewer sessions = better
  const maxSessions = candidate.maxConcurrentSessions || 1;
  const activeSessions = candidate.currentActiveSessions || 0;
  const loadFactor = Math.max(0, 1 - activeSessions / maxSessions);
  score += loadFactor * 20;

  // ── Education level match (10% weight)
  if (student.educationLevel && candidate.educationLevels) {
    const levelMatch = candidate.educationLevels.includes(student.educationLevel)
      ? 1.0
      : 0.5;
    score += levelMatch * 10;
  } else {
    score += 5; // neutral
  }

  // ── Response rate (5% weight)
  const responseRate = Math.min(Math.max(candidate.responseRate || 0.5, 0), 1);
  score += responseRate * 5;

  return score;
}

function rankCandidates(candidates, student) {
  return candidates
    .map((c) => ({ ...c, _score: scoreTutor(c, student) }))
    .sort((a, b) => b._score - a._score)
    .map(({ _score, ...c }) => c); // strip internal score
}

function filterCandidates(candidates, filters) {
  return candidates.filter((c) => {
    if (filters.subject && c.subjects) {
      const hasSubject = c.subjects.some((s) =>
        s.toLowerCase().includes(filters.subject.toLowerCase())
      );
      if (!hasSubject) return false;
    }
    if (filters.educationLevel && c.educationLevels) {
      if (!c.educationLevels.includes(filters.educationLevel)) return false;
    }
    if (filters.maxPrice !== undefined && c.hourlyRate !== undefined) {
      if (c.hourlyRate > filters.maxPrice) return false;
    }
    if (filters.minRating !== undefined) {
      if ((c.rating || 0) < filters.minRating) return false;
    }
    return true;
  });
}

import { describe, it, expect } from "vitest";
import {
  atRiskScore,
  competitionRanks,
  computeMovers,
  fitPriorModel,
  gradeForPoints,
  gradeForScore,
  linearTrend,
  parseTermParam,
  meanGrade,
  parseClassStream,
  percentileRank,
  previousTerm,
  rankStudents,
  recommendCoaching,
  resultKey,
  sampleStd,
  subjectDifficulty,
  teacherEffectiveness,
  toCsv,
  type ValueAddedRecord,
} from "@/lib/institution-analytics";

describe("KCSE grading", () => {
  it("maps boundaries inclusively", () => {
    expect(gradeForScore(80)).toEqual({ grade: "A", points: 12 });
    expect(gradeForScore(79.9)).toEqual({ grade: "A-", points: 11 });
    expect(gradeForScore(50)).toEqual({ grade: "C", points: 6 });
    expect(gradeForScore(29.99)).toEqual({ grade: "E", points: 1 });
    expect(gradeForScore(0)).toEqual({ grade: "E", points: 1 });
  });

  it("rounds mean points half-up and clamps", () => {
    expect(gradeForPoints(6.5)).toBe("C+");
    expect(gradeForPoints(6.49)).toBe("C");
    expect(gradeForPoints(0)).toBe("E");
    expect(gradeForPoints(13)).toBe("A");
  });

  it("averages points, not marks", () => {
    // marks mean is 57.5 (C+), but points are (12 + 1)/2 = 6.5 → C+
    expect(meanGrade([85, 30 - 0.5])).toEqual({ meanPoints: 6.5, grade: "C+" });
    expect(meanGrade([])).toBeNull();
  });
});

describe("terms", () => {
  it("parses the ?term= search param", () => {
    expect(parseTermParam("2026-2")).toEqual({ year: 2026, term: 2 });
    expect(parseTermParam(["2025-3"])).toEqual({ year: 2025, term: 3 });
    expect(parseTermParam("2026-4")).toBeNull();
    expect(parseTermParam(undefined)).toBeNull();
  });

  it("wraps term 1 to the previous year's term 3", () => {
    expect(previousTerm({ term: 1, year: 2026 })).toEqual({ term: 3, year: 2025 });
    expect(previousTerm({ term: 3, year: 2026 })).toEqual({ term: 2, year: 2026 });
  });
});

describe("linearTrend", () => {
  it("returns null below the minimum data guard", () => {
    expect(linearTrend([50, 60])).toBeNull();
    expect(linearTrend([50, 60], { minPoints: 2 })).not.toBeNull();
  });

  it("fits an exact line", () => {
    const fit = linearTrend([40, 45, 50, 55])!;
    expect(fit.slope).toBeCloseTo(5);
    expect(fit.intercept).toBeCloseTo(40);
    expect(fit.r2).toBeCloseTo(1);
  });

  it("only uses the last maxPoints values", () => {
    const fit = linearTrend([90, 10, 60, 55, 50], { maxPoints: 3 })!;
    expect(fit.n).toBe(3);
    expect(fit.slope).toBeCloseTo(-5);
  });

  it("treats a flat series as zero slope", () => {
    const fit = linearTrend([50, 50, 50])!;
    expect(fit.slope).toBe(0);
    expect(fit.r2).toBe(1);
  });
});

describe("atRiskScore", () => {
  const healthy = {
    slope: 1,
    latest: 70,
    classMean: 60,
    classSd: 10,
    expectedAssessments: 6,
    completedAssessments: 6,
    daysSinceActive: 1,
  };

  it("scores a healthy student zero with no reasons", () => {
    const r = atRiskScore(healthy);
    expect(r.score).toBe(0);
    expect(r.level).toBe("LOW");
    expect(r.reasons).toEqual([]);
  });

  it("saturates every component for a worst case", () => {
    const r = atRiskScore({
      slope: -10,
      latest: 20,
      classMean: 60,
      classSd: 10,
      expectedAssessments: 6,
      completedAssessments: 0,
      daysSinceActive: null,
    });
    expect(r.score).toBe(100);
    expect(r.level).toBe("HIGH");
    expect(r.reasons).toHaveLength(4);
  });

  it("weights each component", () => {
    // decline: slope −2.5 → 0.5 × 0.30 = 0.15
    // below mean: z = −1.5 → 0.75 × 0.35 = 0.2625
    // missing: 1/4 → 0.25 × 0.20 = 0.05
    // inactivity: 18.5 days → (18.5−7)/23 = 0.5 × 0.15 = 0.075
    const r = atRiskScore({
      slope: -2.5,
      latest: 45,
      classMean: 60,
      classSd: 10,
      expectedAssessments: 4,
      completedAssessments: 3,
      daysSinceActive: 18.5,
    });
    expect(r.score).toBeCloseTo(53.8, 1);
    expect(r.level).toBe("MEDIUM");
  });

  it("does not flag a score within k SD of the mean", () => {
    const r = atRiskScore({ ...healthy, latest: 51 });
    expect(r.components.belowMean).toBe(0);
  });
});

describe("value-added", () => {
  // Two subjects, Maths is 10 marks harder than English after controlling for prior.
  const records: ValueAddedRecord[] = [];
  const priors = [40, 50, 60, 70, 80, 45, 55, 65];
  priors.forEach((p, i) => {
    records.push({ studentId: `s${i}`, subject: "English", score: p + 5, priorMean: p, teacherId: "tE" });
    records.push({ studentId: `s${i}`, subject: "Maths", score: p - 5, priorMean: p, teacherId: i < 4 ? "tA" : "tB" });
  });

  it("fits score on prior attainment", () => {
    const m = fitPriorModel(records)!;
    expect(m.slope).toBeCloseTo(1);
    expect(m.intercept).toBeCloseTo(0);
  });

  it("falls back to a flat model without spread", () => {
    const m = fitPriorModel([
      { studentId: "a", subject: "x", score: 40, priorMean: 50 },
      { studentId: "b", subject: "x", score: 60, priorMean: 50 },
    ])!;
    expect(m.slope).toBe(0);
    expect(m.intercept).toBe(50);
    expect(fitPriorModel([{ studentId: "a", subject: "x", score: 1, priorMean: null }])).toBeNull();
  });

  it("ranks Maths as harder than English", () => {
    const rows = subjectDifficulty(records, { minN: 3 });
    expect(rows.map((r) => r.subject)).toEqual(["Maths", "English"]);
    expect(rows[0].meanResidual).toBeCloseTo(-5);
    expect(rows[0].difficultyZ!).toBeGreaterThan(0);
    expect(rows[1].difficultyZ!).toBeLessThan(0);
  });

  it("omits subjects with too little data", () => {
    expect(subjectDifficulty(records, { minN: 100 })).toEqual([]);
  });

  it("credits a shared record to every listed teacher", () => {
    const shared = records.map((r) => (r.subject === "English" ? { ...r, teacherId: null, teacherIds: ["t1", "t2"] } : r));
    const rows = teacherEffectiveness(shared, { minN: 3 });
    const ids = rows.map((r) => r.teacherId).sort();
    expect(ids).toEqual(["t1", "t2", "tA", "tB"]);
    expect(rows.find((r) => r.teacherId === "t1")!.n).toBe(8);
  });

  it("measures teacher value-added within subject", () => {
    // Give tA's students +4 above expectation, tB's −4.
    const adjusted = records.map((r) =>
      r.teacherId === "tA" ? { ...r, score: r.score + 4 } : r.teacherId === "tB" ? { ...r, score: r.score - 4 } : r,
    );
    const rows = teacherEffectiveness(adjusted, { minN: 3 });
    const byId = Object.fromEntries(rows.map((r) => [r.teacherId, r]));
    expect(byId.tA.valueAdded).toBeGreaterThan(byId.tB.valueAdded);
    expect(byId.tA.valueAdded).toBeCloseTo(4, 0);
    expect(byId.tE.valueAdded).toBeCloseTo(0, 5);
    expect(byId.tA.effectivenessZ!).toBeGreaterThan(0);
    expect(byId.tB.effectivenessZ!).toBeLessThan(0);
  });
});

describe("ranking", () => {
  it("uses standard competition ranking with ties", () => {
    const items = [
      { id: "a", v: 90 },
      { id: "b", v: 80 },
      { id: "c", v: 80 },
      { id: "d", v: 70 },
    ];
    const r = competitionRanks(items, (x) => x.v);
    expect(items.map((i) => r.get(i))).toEqual([1, 2, 2, 4]);
  });

  it("treats floating point noise as a tie", () => {
    const items = [{ v: 0.1 + 0.2 }, { v: 0.3 }];
    const r = competitionRanks(items, (x) => x.v);
    expect(r.get(items[0])).toBe(1);
    expect(r.get(items[1])).toBe(1);
  });

  it("computes percentile rank with half credit for ties", () => {
    expect(percentileRank(80, [60, 70, 80, 80])).toBe(75);
    expect(percentileRank(60, [60, 70, 80, 90])).toBe(12.5);
    expect(percentileRank(1, [])).toBe(0);
  });

  it("parses class and stream labels", () => {
    expect(parseClassStream("Form 3 East")).toEqual({ className: "Form 3", stream: "East" });
    expect(parseClassStream("3E")).toEqual({ className: "Form 3", stream: "E" });
    expect(parseClassStream("Grade 7 blue")).toEqual({ className: "Grade 7", stream: "Blue" });
    expect(parseClassStream("F2-North")).toEqual({ className: "Form 2", stream: "North" });
    expect(parseClassStream("Form 4")).toEqual({ className: "Form 4", stream: null });
    expect(parseClassStream("")).toEqual({ className: "Unassigned", stream: null });
    expect(parseClassStream("Remedial")).toEqual({ className: "Remedial", stream: null });
  });

  it("ranks overall, by class and by stream", () => {
    const ranked = rankStudents(
      [
        { studentId: "a", name: "A", form: "Form 3 East", mean: 70, subjects: 7 },
        { studentId: "b", name: "B", form: "Form 3 West", mean: 80, subjects: 7 },
        { studentId: "c", name: "C", form: "Form 3 East", mean: 70, subjects: 7 },
        { studentId: "d", name: "D", form: "Form 4", mean: 60, subjects: 7 },
      ],
      new Map([["b", 11.2]]),
    );
    const by = Object.fromEntries(ranked.map((r) => [r.studentId, r]));
    expect(ranked[0].studentId).toBe("b");
    expect(by.b.meanGrade).toBe("A-");
    expect(by.a.overallRank).toBe(2);
    expect(by.c.overallRank).toBe(2);
    expect(by.d.overallRank).toBe(4);
    expect(by.a.classRank).toBe(2);
    expect(by.a.classOf).toBe(3);
    expect(by.a.streamRank).toBe(1);
    expect(by.a.streamOf).toBe(2);
    expect(by.d.classRank).toBe(1);
    expect(by.d.streamRank).toBeNull();
  });
});

describe("computeMovers", () => {
  it("returns top risers and fallers, ignoring students without a prior term", () => {
    const cur = new Map([
      ["a", { name: "A", mean: 70 }],
      ["b", { name: "B", mean: 40 }],
      ["c", { name: "C", mean: 55 }],
      ["d", { name: "D", mean: 90 }],
    ]);
    const prev = new Map([
      ["a", 60],
      ["b", 55],
      ["c", 55],
    ]);
    const { top, bottom } = computeMovers(cur, prev);
    expect(top.map((m) => [m.studentId, m.delta])).toEqual([["a", 10]]);
    expect(bottom.map((m) => [m.studentId, m.delta])).toEqual([["b", -15]]);
  });
});

describe("recommendCoaching", () => {
  const teachers = [
    { teacherId: "t1", name: "Otieno", subjects: ["Mathematics"], forms: ["Form 3"], activeLoad: 0 },
    { teacherId: "t2", name: "Wanjiku", subjects: ["mathematics", "Physics"], forms: [], activeLoad: 0 },
  ];

  it("serves higher-risk students first and respects capacity", () => {
    const students = [
      { studentId: "low", name: "Low", className: "Form 3", riskScore: 40, subjects: [{ subject: "Mathematics", score: 45 }] },
      { studentId: "high", name: "High", className: "Form 3", riskScore: 90, subjects: [{ subject: "Mathematics", score: 30 }] },
      { studentId: "mid", name: "Mid", className: "Form 3", riskScore: 60, subjects: [{ subject: "Mathematics", score: 35 }] },
    ];
    const { recommendations, unmatched } = recommendCoaching(students, teachers, { capacity: 1 });
    expect(recommendations.map((r) => [r.studentId, r.teacherId])).toEqual([
      ["high", "t1"], // class match wins
      ["mid", "t2"],
    ]);
    expect(unmatched).toEqual([
      expect.objectContaining({ studentId: "low", reason: "Every teacher of this subject is at capacity" }),
    ]);
  });

  it("limits subjects per student, worst first, and skips existing pairs", () => {
    const students = [
      {
        studentId: "s",
        name: "S",
        className: "Form 1",
        riskScore: 70,
        subjects: [
          { subject: "Physics", score: 40 },
          { subject: "Mathematics", score: 20 },
          { subject: "Chemistry", score: 30 },
          { subject: "English", score: 75 },
        ],
      },
    ];
    const { recommendations, unmatched } = recommendCoaching(students, teachers, {
      maxSubjectsPerStudent: 2,
      existing: new Set(["s|mathematics"]),
    });
    expect(recommendations.map((r) => r.subject)).toEqual(["Physics"]);
    expect(unmatched.map((u) => [u.subject, u.reason])).toEqual([["Chemistry", "No teacher is assigned to this subject"]]);
  });
});

describe("helpers", () => {
  it("computes sample standard deviation", () => {
    expect(sampleStd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(sampleStd([1])).toBeNull();
  });

  it("writes safe CSV", () => {
    const csv = toCsv(["Name", "Score"], [["Kamau, J", 71.5], ['Say "hi"', -3], ["=HYPERLINK()", null]]);
    expect(csv).toBe('Name,Score\r\n"Kamau, J",71.5\r\n"Say ""hi""",-3\r\n\'=HYPERLINK(),');
  });

  it("normalises the idempotency key", () => {
    expect(resultKey({ studentUserId: "u", subject: " Maths ", term: 2, year: 2026 })).toBe(
      resultKey({ studentUserId: "u", subject: "maths", term: 2, year: 2026 }),
    );
  });
});

// ============================================
// EDYFRA CONFIGURATION - All Hardcoded Values
// ============================================

// Session & Points Configuration
export const SESSION_CONFIG = {
  POINTS_STUDENT: 50,
  POINTS_TUTOR: 100,
  DAILY_ACTIVITY_REWARD: 100,
  NEW_USER_WELCOME_BONUS: 500,
  CHALLENGE_ATTEMPT_LIMIT: 3,
  CHALLENGE_EASY_POINTS: 25,
  CHALLENGE_MEDIUM_POINTS: 50,
  CHALLENGE_HARD_POINTS: 100,
  SESSION_MATCH_TIMEOUT_MS: 60 * 1000, // 60 seconds
  MAX_MESSAGE_RATE_PER_MINUTE: 20,
  SESSION_MAX_DURATION_MIN: 60, // Auto-end after 60 minutes
};

// Tutor Configuration
export const TUTOR_CONFIG = {
  DEFAULT_HOURLY_RATE_KSH: 500,
  DEFAULT_BIO: "Professional Academic Mentor",
  VERIFICATION_REQUIRED: false,
  RATING_CALCULATION_MIN_REVIEWS: 3,
};

// Tier Configuration
const TIER_DEFS = [
  { minPoints: 10000, maxPoints: Infinity, name: "LEGEND" },
  { minPoints: 5000,  maxPoints: 9999,     name: "PLATINUM" },
  { minPoints: 1500,  maxPoints: 4999,     name: "GOLD" },
  { minPoints: 500,   maxPoints: 1499,     name: "SILVER" },
  { minPoints: 0,     maxPoints: 499,      name: "BRONZE" },
];

export const TIER_CONFIG = {
  BRONZE: TIER_DEFS[4],
  SILVER: TIER_DEFS[3],
  GOLD: TIER_DEFS[2],
  PLATINUM: TIER_DEFS[1],
  LEGEND: TIER_DEFS[0],
  getTierFromPoints: (points: number): string => {
    return TIER_DEFS.find(t => points >= t.minPoints)?.name || "BRONZE";
  },
  getLevel: (points: number): number => Math.floor(points / 500) + 1,
  getTierProgress: (points: number): { currentTier: string; nextTier: string | null; pointsInTier: number; pointsForNext: number; progressPercent: number } => {
    const currentIdx = TIER_DEFS.findIndex(t => points >= t.minPoints && points <= t.maxPoints);
    const current = TIER_DEFS[currentIdx];
    const next = TIER_DEFS[currentIdx - 1];
    if (!next) return { currentTier: current.name, nextTier: null, pointsInTier: points - current.minPoints, pointsForNext: 0, progressPercent: 100 };
    const range = next.minPoints - current.minPoints;
    const progressPercent = Math.min(100, Math.max(0, ((points - current.minPoints) / range) * 100));
    return {
      currentTier: current.name,
      nextTier: next.name,
      pointsInTier: points - current.minPoints,
      pointsForNext: next.minPoints - points,
      progressPercent,
    };
  },
};

// Admin Configuration
export const ADMIN_CONFIG = {
  SECRET_KEY: process.env.ADMIN_SECRET_KEY, // Avoid hardcoded fallback in production
  REQUIRE_VERIFICATION: true,
};

// Challenge Configuration
export const CHALLENGE_CONFIG = {
  DEFAULT_SUBJECT: "Mathematics",
  DIFFICULTY_LEVELS: ["EASY", "MEDIUM", "HARD"] as const,
  SEED_SUBJECTS: [
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "English",
    "Kiswahili",
    "Geography",
    "History",
  ],
};

// Validation
export const VALIDATION = {
  MAX_BIO_LENGTH: 500,
  MIN_RATE_KSH: 100,
  MAX_RATE_KSH: 5000,
};

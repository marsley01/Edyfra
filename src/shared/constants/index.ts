export const APP_NAME = "Edyfra";
export const APP_TAGLINE = "Kenya's Institutional Study Platform";
export const APP_DESCRIPTION = "Connect with verified tutors and peers. AI-powered matching, live study rooms, and institutional analytics.";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://edyfra.com";
export const APP_EMAIL = "hello@edyfra.com";

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1,
} as const;

export const POINTS = {
  SESSION_STUDENT: 50,
  SESSION_TUTOR: 100,
  DAILY_ACTIVITY: 100,
  WELCOME_BONUS: 500,
  REFERRAL_BONUS: 50,
  CHALLENGE_EASY: 25,
  CHALLENGE_MEDIUM: 50,
  CHALLENGE_HARD: 100,
} as const;

export const RATE_LIMITS = {
  AUTH_LOGIN: { windowMs: 60_000, max: 5 },
  AUTH_SIGNUP: { windowMs: 60_000, max: 3 },
  API_GENERAL: { windowMs: 60_000, max: 50 },
  AI_CHAT: { windowMs: 60_000, max: 20 },
  UPLOAD: { windowMs: 60_000, max: 10 },
} as const;

export const SIZES = {
  AVATAR: { sm: 32, md: 40, lg: 56, xl: 80 },
  ICON: { sm: 16, md: 20, lg: 24, xl: 32 },
} as const;

export const DURATIONS = {
  TOAST_SHORT: 3000,
  TOAST_NORMAL: 4500,
  TOAST_LONG: 6500,
  DEBOUNCE_SEARCH: 300,
  DEBOUNCE_SAVE: 1000,
  POLL_NOTIFICATIONS: 20_000,
  SESSION_TIMEOUT_MS: 60_000,
  SESSION_MAX_MINUTES: 60,
  MATCH_TIMEOUT_MS: 60_000,
} as const;

export const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  DASHBOARD: "/dashboard",
  TUTOR: "/tutor",
  ADMIN: "/admin",
  INSTITUTION: "/institution/dashboard",
  ONBOARDING: "/onboarding",
  FORGOT_PASSWORD: "/forgot-password",
  STUDY_ROOM: "/study-room",
} as const;

export const SUBJECTS = [
  "Mathematics",
  "English",
  "Kiswahili",
  "Physics",
  "Chemistry",
  "Biology",
  "Geography",
  "History",
  "CRE",
  "IRE",
  "Computer Studies",
  "Business Studies",
  "Agriculture",
] as const;

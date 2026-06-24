export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  summary: string;
  features?: string[];
  improvements?: string[];
  fixes?: string[];
};

export const changelog: ChangelogEntry[] = [
  {
    version: "1.1.0",
    date: "June 24, 2026",
    title: "Admin Overhaul & Tutor KYC",
    summary: "Redesigned admin dashboard, new tutor verification workflow, and mobile navigation improvements.",
    features: [
      "Admin dashboard layout redesigned with better navigation and AI settings management",
      "Tutor KYC (Know Your Customer) verification workflow for tutor onboarding",
      "Favorites system — save and revisit your favourite challenges and study sessions",
      "Match algorithm improvements for better tutor-student pairing",
      "Loading states added to dashboard pages for smoother experience",
    ],
    improvements: [
      "Mobile navigation redesigned for tutors and students",
      "Dashboard page content restructured and optimized",
      "Onboarding flow polished for both students and tutors",
      "Button component updated with new variants and loading spinner",
      "Global layout refined with better theme support",
    ],
    fixes: [
      "Resolved TypeScript build configuration issues",
      "Fixed webpack memory issues during production builds",
      "Removed unused files to reduce bundle size",
    ],
  },
  {
    version: "1.0.0",
    date: "June 20, 2026",
    title: "Real-Time Study Rooms & Video Calling",
    summary: "Major update introducing real-time collaboration with Stream integration, video calls, and study rooms.",
    features: [
      "Real-time video calling and screen sharing in study rooms",
      "Dynamic Island UI for active calls — minimize and multitask",
      "Stream Chat integration with AI-assisted mentions (@Eddy)",
      "Side panel for study rooms with participant list and controls",
      "Ringtone and incoming call notifications",
      "Match context provider for seamless tutor-student connections",
      "User synchronization with Stream platform",
    ],
    improvements: [
      "Challenges page completely overhauled with better UX",
      "Study page content reorganized for clarity",
      "Settings page simplified and restructured",
      "Daily challenge cards redesigned with progress tracking",
    ],
  },
  {
    version: "0.9.0",
    date: "June 15, 2026",
    title: "Initial Launch — Foundations",
    summary: "First release of Edyfra with core learning management, tutor matching, and admin tools.",
    features: [
      "Student and tutor onboarding flows",
      "Tutor dashboard with earnings and session management",
      "Challenge system with AI-generated daily challenges",
      "Admin panel for user and content management",
      "Authentication with Supabase (email + social login)",
      "Responsive design with dark/light mode support",
    ],
  },
];

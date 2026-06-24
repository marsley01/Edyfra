export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  description: string;
  highlights?: string[];
  fixes?: string[];
};

export const changelog: ChangelogEntry[] = [
  {
    version: "1.1.0",
    date: "June 24, 2026",
    title: "Admin Overhaul & Tutor KYC",
    description:
      "Redesigned admin dashboard, new tutor verification workflow, and mobile navigation improvements.",
    highlights: [
      "Redesigned admin panel with clearer navigation and AI settings",
      "Tutor verification flow — upload documents, get approved faster",
      "Save your favourite challenges and study sessions",
      "Smarter tutor-student matching",
      "Smoother loading states across the dashboard",
    ],
    fixes: [
      "Fixed build issues that caused errors on some pages",
      "Reduced app size by cleaning up unused files",
      "Improved performance on slower connections",
    ],
  },
  {
    version: "1.0.0",
    date: "June 20, 2026",
    title: "Real-Time Study Rooms & Video Calling",
    description:
      "Major update introducing real-time collaboration, video calls, and study rooms.",
    highlights: [
      "Video calling and screen sharing in study rooms",
      "Minimise your call and keep browsing — call stays in a floating bubble",
      "Chat with AI assistance using @Eddy mentions",
      "Incoming call notifications with ringtone",
      "Challenges page completely overhauled and easier to use",
      "Study page reorganized so you find content faster",
    ],
    fixes: [
      "Simplified settings page",
      "Daily challenge cards now show your progress",
    ],
  },
  {
    version: "0.9.0",
    date: "June 15, 2026",
    title: "Initial Launch — Foundations",
    description:
      "First release with core learning management, tutor matching, and admin tools.",
    highlights: [
      "Student and tutor onboarding",
      "Tutor dashboard with earnings and session management",
      "AI-generated daily challenges",
      "Admin panel for managing users and content",
      "Secure login with email or social accounts",
      "Dark mode support",
    ],
  },
];

/** Plain-TypeScript equivalents for what Prisma.UserGetPayload previously gave us. */

export interface TutorProfile {
  id: string;
  userId: string;
  bio?: string | null;
  subjects?: string[];
  hourlyRate?: number | null;
  rating?: number | null;
  totalSessions?: number | null;
  verified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface TutorAvailability {
  id: string;
  tutorId: string;
  startAt: string;
  endAt: string;
  [key: string]: unknown;
}

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  role?: string;
  username?: string | null;
  [key: string]: unknown;
}

export type TutorWithProfile = User & {
  tutorProfile?: TutorProfile | null;
  tutorAvailabilities?: TutorAvailability[];
  tutorAvailabilityBlocks?: Array<{ startAt: string; endAt: string }>;
};

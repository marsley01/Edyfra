import type {
  Prisma,
  TutorAvailability,
  TutorProfile,
  User,
} from "@/generated/client";

export type TutorWithProfile = Prisma.UserGetPayload<{
  include: {
    tutorProfile: true;
    tutorAvailabilities: true;
  };
}> & {
  tutorAvailabilityBlocks?: Array<{ startAt: string; endAt: string }>;
};

export type { TutorAvailability, TutorProfile, User };

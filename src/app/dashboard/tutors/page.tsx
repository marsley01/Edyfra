import { getVerifiedTutors } from "@/app/actions/tutor";
import { EduLevel } from "@/generated/client";
import TutorsClient from "./TutorsClient";

export const dynamic = "force-dynamic";

interface TutorsPageProps {
  searchParams: Promise<{ level?: string }>;
}

const VALID_LEVELS = new Set<EduLevel>([
  EduLevel.HIGH_SCHOOL,
  EduLevel.UNIVERSITY,
]);

function parseLevel(raw?: string): EduLevel | "ALL" {
  if (!raw) return "ALL";
  return VALID_LEVELS.has(raw as EduLevel) ? (raw as EduLevel) : "ALL";
}

export default async function TutorsPage({ searchParams }: TutorsPageProps) {
  const { level: levelParam } = await searchParams;
  const level = parseLevel(levelParam);
  const tutors = await getVerifiedTutors(level === "ALL" ? undefined : level);
  return <TutorsClient initialTutors={tutors ?? []} initialLevel={level} />;
}

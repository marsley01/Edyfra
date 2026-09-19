/** How long a pending match request counts as "this person is here and searching". */
export const LIVE_PEER_SEARCH_MS = 90_000;

export type PendingPeerRequest = {
  id: string;
  studentId: string;
  subject: string;
  createdAt: Date;
};

export function isLivePeerSearch(
  createdAt: Date,
  now: Date = new Date(),
  windowMs: number = LIVE_PEER_SEARCH_MS,
): boolean {
  return now.getTime() - createdAt.getTime() <= windowMs;
}

/**
 * Pick another student who is actively matching right now.
 *
 * Never falls back to an arbitrary user in the directory — that is how
 * rooms used to open with an offline "study buddy".
 */
export function selectLivePeerRequest(
  currentStudentId: string,
  preferredSubject: string,
  relatedSubjects: string[],
  pending: PendingPeerRequest[],
  now: Date = new Date(),
): PendingPeerRequest | null {
  const live = pending.filter(
    (p) => p.studentId !== currentStudentId && isLivePeerSearch(p.createdAt, now),
  );
  if (live.length === 0) return null;

  const sameSubject = live.find((p) => p.subject === preferredSubject);
  if (sameSubject) return sameSubject;

  const related = new Set(relatedSubjects.filter(Boolean));
  const overlap = live.find((p) => related.has(p.subject));
  if (overlap) return overlap;

  // Anyone else currently in the matching queue is still "online".
  return live[0] ?? null;
}

import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "../BaseRepository";
import { MatchTier } from "./SessionRepository";

export interface MatchRequestRecord {
  id: string;
  studentId: string;
  subject: string;
  topic?: string | null;
  tier1Tried: boolean;
  tier2Tried: boolean;
  resolvedAs?: MatchTier | null;
  sessionId?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

export class MatchRequestRepository extends BaseRepository<MatchRequestRecord> {
  constructor(client: SupabaseClient) {
    super("MatchRequest", client);
  }

  async listPendingBySubject(subject: string): Promise<MatchRequestRecord[]> {
    return this.findMany(
      { subject, sessionId: null },
      { orderBy: { column: "createdAt", ascending: true } }
    );
  }

  async findActiveByStudentId(studentId: string): Promise<MatchRequestRecord | null> {
    return this.findFirst({ studentId, sessionId: null });
  }

  async resolveMatch(
    id: string,
    sessionId: string,
    resolvedAs: MatchTier
  ): Promise<MatchRequestRecord> {
    return this.update(id, {
      sessionId,
      resolvedAs,
      resolvedAt: new Date().toISOString(),
    });
  }

  async markTiersTried(
    id: string,
    tiers: { tier1Tried?: boolean; tier2Tried?: boolean }
  ): Promise<MatchRequestRecord> {
    return this.update(id, tiers);
  }
}

import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "../BaseRepository";

export type MatchTier = "AI" | "PEER" | "TUTOR";
export type SessionStatus = "SEARCHING" | "PENDING_ACCEPTANCE" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED";
export type PayStatus = "NONE" | "PENDING" | "PAID" | "REFUNDED";

export interface SessionRecord {
  id: string;
  studentId: string;
  partnerId?: string | null;
  tier: MatchTier;
  subject: string;
  topic?: string | null;
  status: SessionStatus;
  roomId: string;
  startedAt?: string | null;
  endedAt?: string | null;
  durationMin?: number | null;
  pointsAwarded: number;
  priceKsh: number;
  paymentStatus: PayStatus;
  mpesaRef?: string | null;
}

export class SessionRepository extends BaseRepository<SessionRecord> {
  constructor(client: SupabaseClient) {
    super("Session", client);
  }

  async findByRoomId(roomId: string): Promise<SessionRecord | null> {
    return this.findFirst({ roomId });
  }

  async listByStudent(
    studentId: string,
    options?: { status?: SessionStatus; limit?: number; offset?: number }
  ): Promise<SessionRecord[]> {
    const match: Record<string, any> = { studentId };
    if (options?.status) match.status = options.status;
    return this.findMany(match, {
      orderBy: { column: "startedAt", ascending: false },
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  async listByPartner(
    partnerId: string,
    options?: { status?: SessionStatus; limit?: number; offset?: number }
  ): Promise<SessionRecord[]> {
    const match: Record<string, any> = { partnerId };
    if (options?.status) match.status = options.status;
    return this.findMany(match, {
      orderBy: { column: "startedAt", ascending: false },
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  async findActiveSessionForUser(userId: string): Promise<SessionRecord | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .or(`studentId.eq.${userId},partnerId.eq.${userId}`)
      .eq("status", "ACTIVE")
      .order("startedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      this.handleError(error, `findActiveSessionForUser:${userId}`);
    }
    return data as SessionRecord | null;
  }

  async updateStatus(
    id: string,
    status: SessionStatus,
    extra?: Partial<Pick<SessionRecord, "endedAt" | "durationMin" | "pointsAwarded" | "paymentStatus">>
  ): Promise<SessionRecord> {
    return this.update(id, { status, ...extra });
  }
}

import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "../BaseRepository";

export interface TutorProfileRecord {
  userId: string;
  subjects: string[];
  levelsTaught: string[];
  verificationPath: string;
  gradesProof?: string | null;
  hourlyRate: number;
  bio: string;
  isVerified: boolean;
  verifiedAt?: string | null;
  rating: number;
  totalSessions: number;
  mpesaNumber?: string | null;
  availability: Record<string, any>;
  sessionRate1on1?: number | null;
  sessionRateGroup?: number | null;
  payoutPhone?: string | null;
  currentActiveSessions: number;
  maxConcurrentSessions: number;
  lastAssignedAt?: string | null;
  totalAssignmentsToday: number;
  responseRate: number;
  sessionsAssigned: number;
  sessionsResponded: number;
  idPhotoUrl?: string | null;
  selfieUrl?: string | null;
}

export class TutorProfileRepository extends BaseRepository<TutorProfileRecord> {
  constructor(client: SupabaseClient) {
    super("TutorProfile", client);
  }

  async findByUserId(userId: string, select = "*"): Promise<TutorProfileRecord | null> {
    return this.findFirst({ userId }, select);
  }

  async updateByUserId(
    userId: string,
    payload: Partial<TutorProfileRecord>,
    select = "*"
  ): Promise<TutorProfileRecord> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update(payload as any)
      .eq("userId", userId)
      .select(select)
      .single();

    if (error) {
      this.handleError(error, `updateByUserId:${userId}`);
    }
    return (data as unknown) as TutorProfileRecord;
  }

  async upsertProfile(
    userId: string,
    payload: Partial<TutorProfileRecord>
  ): Promise<TutorProfileRecord> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      return this.updateByUserId(userId, payload);
    }
    return this.create({ ...payload, userId });
  }

  async listVerified(options?: { limit?: number; offset?: number }): Promise<TutorProfileRecord[]> {
    return this.findMany({ isVerified: true }, {
      orderBy: { column: "rating", ascending: false },
      ...options,
    });
  }

  /**
   * Atomically increments totalAssignmentsToday, currentActiveSessions, and sessionsAssigned,
   * while setting lastAssignedAt to the specified timestamp.
   * Invokes the `increment_tutor_assignment` PostgreSQL function.
   */
  async incrementAssignment(
    userId: string,
    assignedAt: string = new Date().toISOString()
  ): Promise<TutorProfileRecord> {
    const { data, error } = await this.client.rpc("increment_tutor_assignment", {
      p_user_id: userId,
      p_assigned_at: assignedAt,
    });

    if (error) {
      this.handleError(error, `incrementAssignment:${userId}`);
    }
    return (data as unknown) as TutorProfileRecord;
  }
}

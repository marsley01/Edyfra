import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "../BaseRepository";

/** Mirrors the scalar fields from the Prisma User model (relations excluded). */
export interface UserRecord {
  id: string;
  email: string;
  username?: string | null;
  phone?: string | null;
  name: string;
  avatar?: string | null;
  gender?: string | null;
  /** STUDENT | TUTOR | ADMIN | FOUNDER */
  role: string;
  educationLevel?: string | null;
  formYear?: number | null;
  county: string;
  points: number;
  tier: string;
  streakDays: number;
  lastActiveAt?: string | null;
  isUnder18: boolean;
  strikes: number;
  createdAt: string;
  bio?: string | null;
  settings: Record<string, any>;
  curriculum?: string | null;
  dailyMessageCount: number;
  dailySearchCount: number;
  lastCountReset?: string | null;
  subscriptionTier?: string | null;
  banned: boolean;
  suspended: boolean;
  plan: string;
  /** @map plan_started_at */
  planStartedAt?: string | null;
  /** @map plan_expires_at */
  planExpiresAt?: string | null;
  /** @map plan_billing_cycle */
  planBillingCycle?: string | null;
  /** @map token_version */
  tokenVersion: number;
  /** @map referral_code */
  referralCode?: string | null;
  /** @map referred_by */
  referredBy?: string | null;
  /** @map firebase_uid */
  firebaseUid?: string | null;
  /** @map fcm_tokens */
  fcmTokens: string[];
}

export class UserRepository extends BaseRepository<UserRecord> {
  constructor(client: SupabaseClient) {
    super("User", client);
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.findFirst({ email: email.toLowerCase().trim() });
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    return this.findFirst({ username });
  }

  async findByFirebaseUid(firebaseUid: string): Promise<UserRecord | null> {
    return this.findFirst({ firebaseUid });
  }

  /** Fetch only the fields needed for auth middleware (role + banned status). */
  async findForAuth(id: string): Promise<Pick<UserRecord, "id" | "role" | "banned" | "suspended" | "tokenVersion"> | null> {
    return this.findById(id, "id, role, banned, suspended, tokenVersion") as Promise<any>;
  }

  /**
   * Atomically increment a user's points total.
   * NOTE: When Phase 3 migration happens, convert to an RPC call for atomicity.
   */
  async incrementPoints(id: string, delta: number): Promise<UserRecord> {
    // Read-then-write is acceptable here only because points are soft currency;
    // for hard currency always use an RPC. TODO: migrate to rpc('increment_user_points').
    const user = await this.findById(id, "points");
    if (!user) throw new Error(`User ${id} not found`);
    return this.update(id, { points: (user.points ?? 0) + delta });
  }

  /** List users by role, optionally paginated. */
  async listByRole(
    role: string,
    options?: { limit?: number; offset?: number }
  ): Promise<UserRecord[]> {
    return this.findMany({ role }, {
      orderBy: { column: "createdAt", ascending: false },
      ...options,
    });
  }

  /** Update a user's plan info in a single call. */
  async updatePlan(
    id: string,
    plan: string,
    planStartedAt: string,
    planExpiresAt: string | null,
    planBillingCycle: string | null
  ): Promise<UserRecord> {
    return this.update(id, { plan, planStartedAt, planExpiresAt, planBillingCycle });
  }
}

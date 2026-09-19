import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "../BaseRepository";

export type AppStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface InstitutionApplicationRecord {
  id: string;
  name: string;
  email: string;
  /** @map institution_name */
  institutionName: string;
  phone?: string | null;
  message?: string | null;
  status: AppStatus;
  /** @map admin_notes */
  adminNotes?: string | null;
  /** @map reviewed_by_id */
  reviewedById?: string | null;
  /** @map reviewed_at */
  reviewedAt?: string | null;
  /** @map created_at */
  createdAt: string;
  /** @map updated_at */
  updatedAt: string;
  institutionId?: string | null;
}

export class InstitutionApplicationRepository extends BaseRepository<InstitutionApplicationRecord> {
  constructor(client: SupabaseClient) {
    super("institution_applications", client);
  }

  /** List all applications, optionally filtered by status (admin use). */
  async list(filter?: AppStatus): Promise<InstitutionApplicationRecord[]> {
    const match: Record<string, any> = {};
    if (filter) match.status = filter;
    return this.findMany(match, { orderBy: { column: "createdAt", ascending: false } });
  }

  /**
   * Admin review action: update status + reviewer metadata.
   * Called after an admin approves or rejects an application.
   */
  async review(
    id: string,
    reviewedById: string,
    status: AppStatus,
    adminNotes?: string
  ): Promise<InstitutionApplicationRecord> {
    return this.update(id, {
      status,
      reviewedById,
      adminNotes,
      reviewedAt: new Date().toISOString(),
    });
  }

  /** Link an approved application to the newly created institution. */
  async linkInstitution(id: string, institutionId: string): Promise<InstitutionApplicationRecord> {
    return this.update(id, { institutionId });
  }
}

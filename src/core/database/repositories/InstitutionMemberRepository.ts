import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "../BaseRepository";

export interface InstitutionMemberRecord {
  id: string;
  institutionId: string;
  userId: string;
  role: string;
  status: string;
  joinedAt: string;
  createdAt: string;
}

export class InstitutionMemberRepository extends BaseRepository<InstitutionMemberRecord> {
  // Uses standard user Supabase client to enforce RLS policies
  constructor(client: SupabaseClient) {
    super("InstitutionMember", client);
  }

  async findActiveMembership(userId: string): Promise<InstitutionMemberRecord | null> {
    return this.findFirst({ userId, status: "ACTIVE" });
  }

  async findByInstitutionAndUser(institutionId: string, userId: string): Promise<InstitutionMemberRecord | null> {
    return this.findFirst({ institutionId, userId });
  }

  async listMembers(institutionId: string, status?: string): Promise<InstitutionMemberRecord[]> {
    const match: Record<string, any> = { institutionId };
    if (status) match.status = status;
    return this.findMany(match, { orderBy: { column: "joinedAt", ascending: false } });
  }

  async updateMemberStatus(id: string, status: string): Promise<InstitutionMemberRecord> {
    return this.update(id, { status });
  }
}

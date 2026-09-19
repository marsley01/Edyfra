import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "../BaseRepository";

export interface InstitutionRecord {
  id: string;
  name: string;
  type?: string;
  code: string;
  email: string;
  isActive: boolean;
  status: string;
  schoolType?: string;
  curriculum?: string;
  county?: string;
  subCounty?: string;
  studentCount?: number;
  adminName?: string;
  adminTitle?: string;
  adminPhone?: string;
  adminEmail?: string;
  primaryAdminUserId?: string;
  planTier?: string;
  motto?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export class InstitutionRepository extends BaseRepository<InstitutionRecord> {
  // Uses standard user Supabase client to enforce RLS policies
  constructor(client: SupabaseClient) {
    super("Institution", client);
  }

  async findByCode(code: string): Promise<InstitutionRecord | null> {
    return this.findFirst({ code });
  }

  async findByEmail(email: string): Promise<InstitutionRecord | null> {
    return this.findFirst({ email: email.toLowerCase().trim() });
  }

  async listApplications(filter?: "PENDING" | "ACTIVE" | "ALL"): Promise<InstitutionRecord[]> {
    const match: Record<string, any> = {};
    if (filter === "PENDING") match.isActive = false;
    if (filter === "ACTIVE") match.isActive = true;
    return this.findMany(match, { orderBy: { column: "createdAt", ascending: false } });
  }

  async updateActiveStatus(id: string, isActive: boolean): Promise<InstitutionRecord> {
    return this.update(id, { isActive });
  }
}

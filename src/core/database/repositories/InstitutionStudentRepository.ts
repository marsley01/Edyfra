import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "../BaseRepository";

export interface InstitutionStudentRecord {
  id: string;
  institutionId: string;
  userId: string;
  studentIdStr?: string | null;
  classYear?: string | null;
  createdAt: string;
}

export class InstitutionStudentRepository extends BaseRepository<InstitutionStudentRecord> {
  constructor(client: SupabaseClient) {
    super("InstitutionStudent", client);
  }

  /** Look up a student's institution membership by their user ID. */
  async findByUserId(userId: string): Promise<InstitutionStudentRecord | null> {
    return this.findFirst({ userId });
  }

  /** List all students belonging to a given institution. */
  async listByInstitution(
    institutionId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<InstitutionStudentRecord[]> {
    return this.findMany({ institutionId }, {
      orderBy: { column: "createdAt", ascending: false },
      ...options,
    });
  }

  /** Count how many students belong to a given institution. */
  async countByInstitution(institutionId: string): Promise<number> {
    return this.count({ institutionId });
  }

  /**
   * Upsert a student's institution link. Mirrors the Prisma
   * `institutionStudent.upsert({ where: { userId }, create: ..., update: ... })` pattern.
   */
  async upsertByUserId(
    userId: string,
    payload: Omit<InstitutionStudentRecord, "id" | "createdAt">
  ): Promise<InstitutionStudentRecord> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      return this.update(existing.id, payload);
    }
    return this.create({ ...payload, userId });
  }
}

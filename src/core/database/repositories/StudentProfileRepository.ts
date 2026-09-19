import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "../BaseRepository";

export interface StudentProfileRecord {
  userId: string;
  subjects: string[];
  weakTopics: string[];
  studyStyle: string;
  preferredTimes: Record<string, any>;
  goals: string[];
  studyPreference?: string | null;
  formLevel?: string | null;
}

export class StudentProfileRepository extends BaseRepository<StudentProfileRecord> {
  constructor(client: SupabaseClient) {
    super("StudentProfile", client);
  }

  async findByUserId(userId: string, select = "*"): Promise<StudentProfileRecord | null> {
    return this.findFirst({ userId }, select);
  }

  async updateByUserId(
    userId: string,
    payload: Partial<StudentProfileRecord>,
    select = "*"
  ): Promise<StudentProfileRecord> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update(payload as any)
      .eq("userId", userId)
      .select(select)
      .single();

    if (error) {
      this.handleError(error, `updateByUserId:${userId}`);
    }
    return (data as unknown) as StudentProfileRecord;
  }

  async upsertProfile(
    userId: string,
    payload: Partial<StudentProfileRecord>
  ): Promise<StudentProfileRecord> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      return this.updateByUserId(userId, payload);
    }
    return this.create({ ...payload, userId });
  }
}

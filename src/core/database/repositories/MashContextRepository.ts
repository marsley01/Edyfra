import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "../BaseRepository";

export interface MashContextRecord {
  id: string;
  userId: string;
  subjectsStruggled: string[];
  topicsCovered: string[];
  lastSessionSummary?: string | null;
  weakAreas?: any | null;
  strongAreas?: any | null;
  updatedAt: string;
}

export class MashContextRepository extends BaseRepository<MashContextRecord> {
  constructor(client: SupabaseClient) {
    super("MashContext", client);
  }

  async findByUserId(userId: string): Promise<MashContextRecord | null> {
    return this.findFirst({ userId });
  }
}

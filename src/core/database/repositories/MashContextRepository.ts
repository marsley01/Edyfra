import { SupabaseClient } from "@supabase/supabase-js";

export interface MashContextRecord {
  id: string;
  userId: string;
  subjectsStruggled: string[];
  topicsCovered: string[];
  lastSessionSummary: string | null;
  weakAreas: Record<string, unknown>;
  strongAreas: Record<string, unknown>;
  updatedAt: string;
}

export class MashContextRepository {
  constructor(private client: SupabaseClient) {}

  private mapRow(row: any): MashContextRecord {
    return {
      id: row.id,
      userId: row.user_id,
      subjectsStruggled: row.subjects_struggled || [],
      topicsCovered: row.topics_covered || [],
      lastSessionSummary: row.last_session_summary ?? null,
      weakAreas: row.weak_areas || {},
      strongAreas: row.strong_areas || {},
      updatedAt: row.updated_at,
    };
  }

  async findByUserId(userId: string): Promise<MashContextRecord | null> {
    const { data, error } = await this.client
      .from("mash_context")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapRow(data);
  }

  async create(data: {
    userId: string;
    subjectsStruggled?: string[];
    topicsCovered?: string[];
    lastSessionSummary?: string | null;
    weakAreas?: Record<string, unknown>;
    strongAreas?: Record<string, unknown>;
  }): Promise<MashContextRecord> {
    const payload = {
      user_id: data.userId,
      subjects_struggled: data.subjectsStruggled || [],
      topics_covered: data.topicsCovered || [],
      last_session_summary: data.lastSessionSummary ?? null,
      weak_areas: data.weakAreas || {},
      strong_areas: data.strongAreas || {},
      updated_at: new Date().toISOString(),
    };

    const { data: created, error } = await this.client
      .from("mash_context")
      .insert(payload)
      .select("*")
      .single();

    if (error || !created) throw error || new Error("Failed to create mash_context");
    return this.mapRow(created);
  }

  async update(id: string, updates: Record<string, unknown>): Promise<MashContextRecord> {
    const dbUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if ("subjectsStruggled" in updates) dbUpdates.subjects_struggled = updates.subjectsStruggled;
    if ("topicsCovered" in updates) dbUpdates.topics_covered = updates.topicsCovered;
    if ("lastSessionSummary" in updates) dbUpdates.last_session_summary = updates.lastSessionSummary;
    if ("weakAreas" in updates) dbUpdates.weak_areas = updates.weakAreas;
    if ("strongAreas" in updates) dbUpdates.strong_areas = updates.strongAreas;

    const { data: updated, error } = await this.client
      .from("mash_context")
      .update(dbUpdates)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !updated) throw error || new Error("Failed to update mash_context");
    return this.mapRow(updated);
  }
}

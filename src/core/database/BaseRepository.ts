import { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { logger } from "@/core/logging";
import { AppError } from "@/core/errors";

export interface QueryOptions {
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export abstract class BaseRepository<T extends Record<string, any>> {
  protected client: SupabaseClient;
  protected tableName: string;

  constructor(tableName: string, client: SupabaseClient) {
    this.tableName = tableName;
    this.client = client;
  }

  protected get log() {
    return logger.child(`repo:${this.tableName}`);
  }

  protected handleError(error: PostgrestError, context: string): never {
    // 42501 = PostgreSQL permission_denied (RLS policy violation)
    if (error.code === "42501" || error.message.includes("permission denied") || error.message.includes("policy")) {
      this.log.error(`RLS Permission Denied on ${this.tableName} [${context}]`, {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw AppError.forbidden(`Access denied by row security policy on ${this.tableName}`);
    }

    // 23505 = unique_violation
    if (error.code === "23505") {
      this.log.warn(`Unique constraint violation on ${this.tableName} [${context}]`, {
        code: error.code,
        message: error.message,
      });
      throw AppError.conflict(`A record in ${this.tableName} with these details already exists`);
    }

    this.log.error(`Database error on ${this.tableName} [${context}]`, {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    throw AppError.internal(`Database operation failed on ${this.tableName}: ${error.message}`);
  }

  async findById(id: string, select = "*"): Promise<T | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(select)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      this.handleError(error, `findById:${id}`);
    }
    return data as T | null;
  }

  async findFirst(match: Record<string, any>, select = "*"): Promise<T | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(select)
      .match(match)
      .maybeSingle();

    if (error) {
      this.handleError(error, "findFirst");
    }
    return data as T | null;
  }

  async findMany(match?: Record<string, any>, options?: QueryOptions): Promise<T[]> {
    let query = this.client.from(this.tableName).select(options?.select || "*");

    if (match && Object.keys(match).length > 0) {
      query = query.match(match);
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }

    if (typeof options?.limit === "number") {
      const from = options.offset || 0;
      const to = from + options.limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;
    if (error) {
      this.handleError(error, "findMany");
    }
    return ((data || []) as unknown) as T[];
  }

  async create(payload: Partial<T>, select = "*"): Promise<T> {
    const { data, error } = await this.client
      .from(this.tableName)
      .insert(payload as any)
      .select(select)
      .single();

    if (error) {
      this.handleError(error, "create");
    }
    return (data as unknown) as T;
  }

  async update(id: string, payload: Partial<T>, select = "*"): Promise<T> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update(payload as any)
      .eq("id", id)
      .select(select)
      .single();

    if (error) {
      this.handleError(error, `update:${id}`);
    }
    return (data as unknown) as T;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq("id", id);

    if (error) {
      this.handleError(error, `delete:${id}`);
    }
  }

  async count(match?: Record<string, any>): Promise<number> {
    let query = this.client.from(this.tableName).select("*", { count: "exact", head: true });
    if (match && Object.keys(match).length > 0) {
      query = query.match(match);
    }
    const { count, error } = await query;
    if (error) {
      this.handleError(error, "count");
    }
    return count || 0;
  }

  async exists(match: Record<string, any>): Promise<boolean> {
    const total = await this.count(match);
    return total > 0;
  }
}

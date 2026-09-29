import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/core/logging";
import { AppError } from "@/core/errors";

/**
 * Internal DB row shape (snake_case matching Supabase schema)
 */
interface ApiKeyDbRow {
  id: string;
  name: string;
  app_name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  rate_limit_per_hour: number;
  monthly_call_limit: number;
  calls_this_month: number;
  last_used_at?: string | null;
  expires_at?: string | null;
  created_by?: string | null;
  created_at: string;
  rotating_from?: string | null;
  rotation_grace_until?: string | null;
}

/**
 * Public record shape (camelCase for app code)
 * NOTE: keyHash is INTERNAL ONLY — never return to client-facing code paths.
 *       The raw secret key is shown exactly once at creation time.
 */
export interface ApiKeyRecord {
  id: string;
  name: string;
  appName: string;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  rateLimitPerHour: number;
  monthlyCallLimit: number;
  callsThisMonth: number;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  rotatingFrom?: string | null;
  rotationGraceUntil?: string | null;
}

/**
 * Repository for api_keys table.
 * Uses explicit column mapping instead of BaseRepository to avoid camelCase/snake_case mismatch.
 */
export class ApiKeyRepository {
  private client: SupabaseClient;
  private log = logger.child("repo:api_keys");

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  private static toDb(record: Partial<ApiKeyRecord>): Record<string, any> {
    const db: Record<string, any> = {};
    if (record.name !== undefined) db.name = record.name;
    if (record.appName !== undefined) db.app_name = record.appName;
    if (record.keyHash !== undefined) db.key_hash = record.keyHash;
    if (record.keyPrefix !== undefined) db.key_prefix = record.keyPrefix;
    if (record.scopes !== undefined) db.scopes = record.scopes;
    if (record.isActive !== undefined) db.is_active = record.isActive;
    if (record.rateLimitPerHour !== undefined) db.rate_limit_per_hour = record.rateLimitPerHour;
    if (record.monthlyCallLimit !== undefined) db.monthly_call_limit = record.monthlyCallLimit;
    if (record.callsThisMonth !== undefined) db.calls_this_month = record.callsThisMonth;
    if (record.lastUsedAt !== undefined) db.last_used_at = record.lastUsedAt;
    if (record.expiresAt !== undefined) db.expires_at = record.expiresAt;
    if (record.createdBy !== undefined) db.created_by = record.createdBy;
    if (record.rotatingFrom !== undefined) db.rotating_from = record.rotatingFrom;
    if (record.rotationGraceUntil !== undefined) db.rotation_grace_until = record.rotationGraceUntil;
    return db;
  }

  private static fromDb(row: ApiKeyDbRow): ApiKeyRecord {
    return {
      id: row.id,
      name: row.name,
      appName: row.app_name,
      keyHash: row.key_hash,
      keyPrefix: row.key_prefix,
      scopes: row.scopes,
      isActive: row.is_active,
      rateLimitPerHour: row.rate_limit_per_hour,
      monthlyCallLimit: row.monthly_call_limit,
      callsThisMonth: row.calls_this_month,
      lastUsedAt: row.last_used_at,
      expiresAt: row.expires_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      rotatingFrom: row.rotating_from,
      rotationGraceUntil: row.rotation_grace_until,
    };
  }

  private handleError(error: any, context: string): never {
    if (error.code === "42501" || error.message?.includes("permission denied") || error.message?.includes("policy")) {
      this.log.error(`RLS Permission Denied on api_keys [${context}]`, {
        code: error.code,
        message: error.message,
      });
      throw AppError.forbidden("Access denied by row security policy on api_keys");
    }
    if (error.code === "23505") {
      this.log.warn(`Unique constraint violation on api_keys [${context}]`, {
        code: error.code,
        message: error.message,
      });
      throw AppError.conflict("An API key with these details already exists");
    }
    this.log.error(`Database error on api_keys [${context}]`, {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    throw AppError.internal(`Database operation failed on api_keys: ${error.message}`);
  }

  /**
   * Find an API key by its SHA-256 hash.
   * Returns full record including keyHash (INTERNAL USE ONLY).
   */
  async findByKeyHash(keyHash: string): Promise<ApiKeyRecord | null> {
    const { data, error } = await this.client
      .from("api_keys")
      .select("id, name, app_name, key_prefix, scopes, is_active, rate_limit_per_hour, monthly_call_limit, calls_this_month, last_used_at, expires_at, created_by, created_at, rotating_from, rotation_grace_until, key_hash")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (error) this.handleError(error, `findByKeyHash:${keyHash}`);
    return data ? ApiKeyRepository.fromDb(data as ApiKeyDbRow) : null;
  }

  /**
   * Find an API key by its prefix (for additional verification).
   */
  async findByKeyPrefix(keyPrefix: string): Promise<ApiKeyRecord | null> {
    const { data, error } = await this.client
      .from("api_keys")
      .select("id, name, app_name, key_prefix, scopes, is_active, rate_limit_per_hour, monthly_call_limit, calls_this_month, last_used_at, expires_at, created_by, created_at, rotating_from, rotation_grace_until, key_hash")
      .eq("key_prefix", keyPrefix)
      .maybeSingle();

    if (error) this.handleError(error, `findByKeyPrefix:${keyPrefix}`);
    return data ? ApiKeyRepository.fromDb(data as ApiKeyDbRow) : null;
  }

  /**
   * Create a new API key record.
   * The raw secret key must be provided by caller (already hashed to keyHash).
   */
  async create(payload: {
    name: string;
    appName: string;
    keyHash: string;
    keyPrefix: string;
    scopes: string[];
    isActive?: boolean;
    rateLimitPerHour?: number;
    monthlyCallLimit?: number;
    callsThisMonth?: number;
    expiresAt?: string | null;
    createdBy?: string | null;
  }): Promise<ApiKeyRecord> {
    const dbPayload = ApiKeyRepository.toDb(payload);
    const { data, error } = await this.client
      .from("api_keys")
      .insert(dbPayload)
      .select("id, name, app_name, key_prefix, scopes, is_active, rate_limit_per_hour, monthly_call_limit, calls_this_month, last_used_at, expires_at, created_by, created_at, rotating_from, rotation_grace_until, key_hash")
      .single();

    if (error) this.handleError(error, "create");
    return ApiKeyRepository.fromDb(data as ApiKeyDbRow);
  }

  /**
   * Update an existing API key.
   * Only updates provided fields.
   */
  async update(id: string, payload: Partial<ApiKeyRecord>): Promise<ApiKeyRecord> {
    const dbPayload = ApiKeyRepository.toDb(payload);
    const { data, error } = await this.client
      .from("api_keys")
      .update(dbPayload)
      .eq("id", id)
      .select("id, name, app_name, key_prefix, scopes, is_active, rate_limit_per_hour, monthly_call_limit, calls_this_month, last_used_at, expires_at, created_by, created_at, rotating_from, rotation_grace_until, key_hash")
      .single();

    if (error) this.handleError(error, `update:${id}`);
    return ApiKeyRepository.fromDb(data as ApiKeyDbRow);
  }

  /**
   * Update last_used_at to now (fire-and-forget style with error logging).
   */
  async updateLastUsed(id: string): Promise<void> {
    const { error } = await this.client
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      this.log.warn("Failed to update last_used_at", { keyId: id, error: error.message });
    }
  }

  /**
   * Rotate an API key: set rotating_from and rotation_grace_until, update key_hash.
   */
  async rotate(id: string, newKeyHash: string, rotationGraceUntil: Date): Promise<ApiKeyRecord> {
    const { data, error } = await this.client
      .from("api_keys")
      .update({
        key_hash: newKeyHash,
        rotating_from: (await this.findById(id))?.keyPrefix ?? null,
        rotation_grace_until: rotationGraceUntil.toISOString(),
        calls_this_month: 0,
        last_used_at: null,
      })
      .eq("id", id)
      .select("id, name, app_name, key_prefix, scopes, is_active, rate_limit_per_hour, monthly_call_limit, calls_this_month, last_used_at, expires_at, created_by, created_at, rotating_from, rotation_grace_until, key_hash")
      .single();

    if (error) this.handleError(error, `rotate:${id}`);
    return ApiKeyRepository.fromDb(data as ApiKeyDbRow);
  }

  /**
   * Find by ID (without key_hash in select for safety).
   */
  async findById(id: string): Promise<Omit<ApiKeyRecord, "keyHash"> | null> {
    const { data, error } = await this.client
      .from("api_keys")
      .select("id, name, app_name, key_prefix, scopes, is_active, rate_limit_per_hour, monthly_call_limit, calls_this_month, last_used_at, expires_at, created_by, created_at, rotating_from, rotation_grace_until")
      .eq("id", id)
      .maybeSingle();

    if (error) this.handleError(error, `findById:${id}`);
    if (!data) return null;

    const row = data as Omit<ApiKeyDbRow, "key_hash">;
    return {
      id: row.id,
      name: row.name,
      appName: row.app_name,
      keyPrefix: row.key_prefix,
      scopes: row.scopes,
      isActive: row.is_active,
      rateLimitPerHour: row.rate_limit_per_hour,
      monthlyCallLimit: row.monthly_call_limit,
      callsThisMonth: row.calls_this_month,
      lastUsedAt: row.last_used_at,
      expiresAt: row.expires_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      rotatingFrom: row.rotating_from,
      rotationGraceUntil: row.rotation_grace_until,
    };
  }
}
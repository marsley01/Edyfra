import { logger } from "@/core/logging";
import { AppError } from "@/core/errors";
import type { PaginationParams, PaginatedResult } from "./Pagination";
import { buildPagination, paginateResponse } from "./Pagination";

export type PrismaDelegate = {
  findUnique: (args: unknown) => Promise<unknown>;
  findFirst: (args: unknown) => Promise<unknown>;
  findMany: (args: unknown) => Promise<unknown[]>;
  count: (args: unknown) => Promise<number>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
  upsert: (args: unknown) => Promise<unknown>;
};

export type WhereInput = Record<string, unknown>;
export type IncludeInput = Record<string, unknown>;
export type SelectInput = Record<string, unknown>;
export type OrderByInput = Record<string, "asc" | "desc">;

export interface FindManyArgs {
  where?: WhereInput;
  include?: IncludeInput;
  select?: SelectInput;
  orderBy?: OrderByInput | OrderByInput[];
  skip?: number;
  take?: number;
  cursor?: Record<string, string>;
}

export interface FindUniqueArgs {
  where: WhereInput;
  include?: IncludeInput;
  select?: SelectInput;
}

export interface CreateArgs<T> {
  data: T;
  include?: IncludeInput;
}

export interface UpdateArgs<T> {
  where: WhereInput;
  data: Partial<T>;
  include?: IncludeInput;
}

export abstract class BaseRepository<T, TCreate = T, TUpdate = Partial<T>> {
  protected abstract delegate: PrismaDelegate;
  protected entityName: string;

  constructor(entityName: string) {
    this.entityName = entityName;
  }

  protected get log() {
    return logger.child(`repo:${this.entityName}`);
  }

  async findById(id: string, include?: IncludeInput): Promise<T | null> {
    try {
      const result = await this.delegate.findUnique({
        where: { id },
        include,
      });
      return result as T | null;
    } catch (err) {
      this.log.error(`findById failed`, { id, error: String(err) });
      throw AppError.internal(`Failed to find ${this.entityName}`);
    }
  }

  async findFirst(where: WhereInput, include?: IncludeInput): Promise<T | null> {
    try {
      const result = await this.delegate.findFirst({ where, include });
      return result as T | null;
    } catch (err) {
      this.log.error(`findFirst failed`, { where, error: String(err) });
      throw AppError.internal(`Failed to find ${this.entityName}`);
    }
  }

  async findMany(args?: FindManyArgs): Promise<T[]> {
    try {
      const results = await this.delegate.findMany(args as unknown as Record<string, unknown>);
      return results as T[];
    } catch (err) {
      this.log.error(`findMany failed`, { args, error: String(err) });
      throw AppError.internal(`Failed to query ${this.entityName}`);
    }
  }

  async findManyPaginated(params: PaginationParams, where?: WhereInput, orderBy?: OrderByInput): Promise<PaginatedResult<T>> {
    try {
      const { page, limit, skip, take } = buildPagination(params);

      const [items, total] = await Promise.all([
        this.delegate.findMany({
          where,
          skip,
          take,
          orderBy,
        } as unknown as Record<string, unknown>),
        this.delegate.count({ where } as unknown as Record<string, unknown>),
      ]);

      return paginateResponse(items as T[], total, { page, limit, skip, take });
    } catch (err) {
      this.log.error(`findManyPaginated failed`, { where, error: String(err) });
      throw AppError.internal(`Failed to query ${this.entityName}`);
    }
  }

  async create(data: TCreate, include?: IncludeInput): Promise<T> {
    try {
      const result = await this.delegate.create({
        data: data as Record<string, unknown>,
        include,
      } as unknown as Record<string, unknown>);
      return result as T;
    } catch (err) {
      this.log.error(`create failed`, { error: String(err) });
      throw AppError.internal(`Failed to create ${this.entityName}`);
    }
  }

  async update(where: WhereInput, data: TUpdate, include?: IncludeInput): Promise<T> {
    try {
      const existing = await this.delegate.findUnique({ where } as unknown as Record<string, unknown>);
      if (!existing) {
        throw AppError.notFound(`${this.entityName} not found`);
      }

      const result = await this.delegate.update({
        where,
        data: data as Record<string, unknown>,
        include,
      } as unknown as Record<string, unknown>);
      return result as T;
    } catch (err) {
      if (err instanceof AppError) throw err;
      this.log.error(`update failed`, { where, error: String(err) });
      throw AppError.internal(`Failed to update ${this.entityName}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const existing = await this.delegate.findUnique({
        where: { id },
      } as unknown as Record<string, unknown>);
      if (!existing) {
        throw AppError.notFound(`${this.entityName} not found`);
      }

      await this.delegate.delete({ where: { id } } as unknown as Record<string, unknown>);
    } catch (err) {
      if (err instanceof AppError) throw err;
      this.log.error(`delete failed`, { id, error: String(err) });
      throw AppError.internal(`Failed to delete ${this.entityName}`);
    }
  }

  async exists(where: WhereInput): Promise<boolean> {
    try {
      const count = await this.delegate.count({ where } as unknown as Record<string, unknown>);
      return count > 0;
    } catch (err) {
      this.log.error(`exists check failed`, { where, error: String(err) });
      return false;
    }
  }

  async count(where?: WhereInput): Promise<number> {
    try {
      return await this.delegate.count({ where } as unknown as Record<string, unknown>);
    } catch (err) {
      this.log.error(`count failed`, { where, error: String(err) });
      throw AppError.internal(`Failed to count ${this.entityName}`);
    }
  }

  protected handleNotFound(): never {
    throw AppError.notFound(`${this.entityName} not found`);
  }
}

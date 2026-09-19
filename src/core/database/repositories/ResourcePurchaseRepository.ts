import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "../BaseRepository";

export interface ResourcePurchaseRecord {
  /** UUID */
  id: string;
  /** @map user_id */
  userId: string;
  /** @map resource_id — UUID */
  resourceId: string;
  amount: number;
  /** @map platform_fee */
  platformFee: number;
  /** @map seller_payout */
  sellerPayout: number;
  /** @map mpesa_receipt */
  mpesaReceipt?: string | null;
  /** @map paid_at */
  paidAt?: string | null;
}

export class ResourcePurchaseRepository extends BaseRepository<ResourcePurchaseRecord> {
  constructor(client: SupabaseClient) {
    super("resource_purchases", client);
  }

  /** Check if a user has already purchased a specific resource. */
  async hasPurchased(userId: string, resourceId: string): Promise<boolean> {
    return this.exists({ userId, resourceId });
  }

  /** All purchases made by a given user (most recent first). */
  async listByUser(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ResourcePurchaseRecord[]> {
    return this.findMany({ userId }, {
      orderBy: { column: "paidAt", ascending: false },
      ...options,
    });
  }

  /** All purchases for a specific resource (for sellers to see earnings). */
  async listByResource(resourceId: string): Promise<ResourcePurchaseRecord[]> {
    return this.findMany({ resourceId }, {
      orderBy: { column: "paidAt", ascending: false },
    });
  }

  /** Lookup by M-Pesa receipt for payment confirmation callbacks. */
  async findByMpesaReceipt(mpesaReceipt: string): Promise<ResourcePurchaseRecord | null> {
    return this.findFirst({ mpesaReceipt });
  }
}

import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "../BaseRepository";

export interface PaymentRecord {
  /** UUID */
  id: string;
  /** @map user_id */
  userId: string;
  amount: number;
  phone: string;
  /** @map mpesa_receipt_number */
  mpesaReceiptNumber?: string | null;
  /** @map plan_type */
  planType?: string | null;
  /** @map payment_type */
  paymentType: string;
  /** pending | completed | failed */
  status: string;
  /** @map paid_at */
  paidAt?: string | null;
  /** @map created_at */
  createdAt?: string | null;
  /** @map checkout_request_id */
  checkoutRequestId?: string | null;
  /** @map target_id — polymorphic target (e.g., resource, booking, subscription) */
  targetId?: string | null;
}

export class PaymentRepository extends BaseRepository<PaymentRecord> {
  constructor(client: SupabaseClient) {
    super("payments", client);
  }

  /** Lookup a payment by M-Pesa checkout request ID (used in STK-push callbacks). */
  async findByCheckoutRequestId(checkoutRequestId: string): Promise<PaymentRecord | null> {
    return this.findFirst({ checkoutRequestId });
  }

  /** Lookup a payment by M-Pesa receipt number (used in payment confirmation). */
  async findByMpesaReceiptNumber(mpesaReceiptNumber: string): Promise<PaymentRecord | null> {
    return this.findFirst({ mpesaReceiptNumber });
  }

  /** All payments made by a given user (most recent first). */
  async listByUser(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<PaymentRecord[]> {
    return this.findMany({ userId }, {
      orderBy: { column: "createdAt", ascending: false },
      ...options,
    });
  }

  /** Transition a payment's status (e.g., pending → completed). */
  async updateStatus(
    id: string,
    status: string,
    extra?: Partial<Pick<PaymentRecord, "paidAt" | "mpesaReceiptNumber">>
  ): Promise<PaymentRecord> {
    return this.update(id, { status, ...extra });
  }
}

import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "../BaseRepository";

export interface SessionPaymentRecord {
  /** UUID */
  id: string;
  /** @map session_id */
  sessionId: string;
  /** @map student_id */
  studentId: string;
  /** @map tutor_id */
  tutorId: string;
  /** @map gross_amount — total billed to student in KES */
  grossAmount: number;
  /** @map platform_fee */
  platformFee: number;
  /** @map tutor_payout */
  tutorPayout: number;
  /** @map mpesa_receipt */
  mpesaReceipt?: string | null;
  /** @map paid_at */
  paidAt?: string | null;
  /** @map refunded_at */
  refundedAt?: string | null;
  /** @map created_at */
  createdAt?: string | null;
}

export class SessionPaymentRepository extends BaseRepository<SessionPaymentRecord> {
  constructor(client: SupabaseClient) {
    super("session_payments", client);
  }

  /** Fetch the single payment record for a session (sessions have at most one payment). */
  async findBySessionId(sessionId: string): Promise<SessionPaymentRecord | null> {
    return this.findFirst({ sessionId });
  }

  /** All payments where the user was the student (billing history). */
  async listByStudent(
    studentId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<SessionPaymentRecord[]> {
    return this.findMany({ studentId }, {
      orderBy: { column: "createdAt", ascending: false },
      ...options,
    });
  }

  /** All payments where the user was the tutor (earnings history). */
  async listByTutor(
    tutorId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<SessionPaymentRecord[]> {
    return this.findMany({ tutorId }, {
      orderBy: { column: "createdAt", ascending: false },
      ...options,
    });
  }

  /** Mark a payment as refunded. */
  async markRefunded(id: string, refundedAt?: string): Promise<SessionPaymentRecord> {
    return this.update(id, { refundedAt: refundedAt ?? new Date().toISOString() });
  }
}

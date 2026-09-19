import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "../BaseRepository";

export interface BookingRecord {
  id: string;
  /** @map student_id */
  studentId: string;
  /** @map tutor_id */
  tutorId: string;
  subject: string;
  topic?: string | null;
  /** @map education_level */
  educationLevel?: string | null;
  /** ISO date string (date only) */
  date: string;
  /** @map start_time  HH:mm */
  startTime: string;
  /** @map end_time  HH:mm */
  endTime: string;
  /** @map duration_minutes */
  durationMinutes: number;
  /** pending | confirmed | completed | cancelled | student_no_show | tutor_no_show */
  status: string;
  amount: number;
  /** @map paystack_reference */
  paystackReference?: string | null;
  /** @map decline_reason */
  declineReason?: string | null;
  /** @map meeting_url */
  meetingUrl?: string | null;
  /** @map created_at */
  createdAt: string;
  /** @map updated_at */
  updatedAt: string;
}

export class BookingRepository extends BaseRepository<BookingRecord> {
  constructor(client: SupabaseClient) {
    super("bookings", client);
  }

  /** All bookings where the current user is the student. */
  async listByStudent(
    studentId: string,
    options?: { status?: string; limit?: number; offset?: number }
  ): Promise<BookingRecord[]> {
    const match: Record<string, any> = { studentId };
    if (options?.status) match.status = options.status;
    return this.findMany(match, {
      orderBy: { column: "createdAt", ascending: false },
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  /** All bookings where the current user is the tutor. */
  async listByTutor(
    tutorId: string,
    options?: { status?: string; limit?: number; offset?: number }
  ): Promise<BookingRecord[]> {
    const match: Record<string, any> = { tutorId };
    if (options?.status) match.status = options.status;
    return this.findMany(match, {
      orderBy: { column: "createdAt", ascending: false },
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  /** Update only the status field of a booking. */
  async updateStatus(
    id: string,
    status: BookingRecord["status"],
    extra?: Partial<Pick<BookingRecord, "declineReason" | "meetingUrl">>
  ): Promise<BookingRecord> {
    return this.update(id, { status, ...extra });
  }
}

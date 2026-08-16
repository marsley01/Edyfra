/**
 * booking-client.ts — server-safe client for the FastAPI Python backend.
 *
 * All calls go through /api/python/* (the Next.js proxy route) rather than
 * directly to PYTHON_BACKEND_URL. This means:
 *   - Auth is handled by the proxy (no token forwarding needed here)
 *   - Works in both server components and client components
 *   - Works in production without CORS issues
 *
 * The proxy is at src/app/api/python/[...path]/route.ts
 */
const API_BASE = "/api/python";

async function callPython<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    userId?: string;
  } = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.userId) {
    headers["X-User-Id"] = options.userId;
  }

  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Python backend error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export interface Booking {
  id: string;
  studentId: string;
  tutorId: string;
  subject: string;
  topic: string | null;
  educationLevel?: string | null;
  date: string | null;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
  amount?: number;
  paystackReference?: string | null;
  declineReason?: string | null;
  meetingUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  student?: { id: string; name: string; avatar?: string };
  tutor?: { id: string; name: string; avatar?: string };
}

export async function pythonGetTutorAvailability(tutorId: string, userId: string) {
  return callPython<{ availability: any[] }>(`/bookings/availability/${tutorId}`, { userId });
}

export async function pythonSaveTutorAvailability(tutorId: string, slots: any[], userId: string) {
  return callPython<{ success: boolean }>("/bookings/availability", {
    method: "POST",
    body: { tutorId, slots },
    userId,
  });
}

export async function pythonGetVerifiedTutors(level?: string) {
  const path = level ? `/bookings/tutors?level=${encodeURIComponent(level)}` : "/bookings/tutors";
  return callPython<{ tutors: any[] }>(path);
}

export async function pythonSearchTutors(q: string) {
  return callPython<{ tutors: any[] }>(`/bookings/tutors/search?q=${encodeURIComponent(q)}`);
}

export async function pythonGetTutorsBySubject(subject: string, level?: string) {
  const path = level
    ? `/bookings/tutors/by-subject/${encodeURIComponent(subject)}?level=${encodeURIComponent(level)}`
    : `/bookings/tutors/by-subject/${encodeURIComponent(subject)}`;
  return callPython<{ tutors: any[] }>(path);
}

export async function pythonGetIncomingRequests(tutorId: string, userId: string) {
  return callPython<{ requests: Booking[] }>(`/bookings/incoming/${tutorId}`, { userId });
}

export async function pythonGetUpcomingTutorBookings(tutorId: string, userId: string) {
  return callPython<{ bookings: Booking[] }>(`/bookings/upcoming/tutor/${tutorId}`, { userId });
}

export async function pythonGetUpcomingStudentBookings(studentId: string, userId: string) {
  return callPython<{ bookings: Booking[] }>(`/bookings/upcoming/student/${studentId}`, { userId });
}

export async function pythonCreateBooking(
  params: {
    tutorId: string;
    subject: string;
    topic?: string;
    educationLevel?: string;
    date: string;
    startTime: string;
    durationMinutes: number;
  },
  userId: string,
) {
  return callPython<{ success: boolean; bookingId: string; booking: any }>("/bookings", {
    method: "POST",
    body: params,
    userId,
  });
}

export async function pythonUpdateBookingStatus(
  bookingId: string,
  status: string,
  userId: string,
  reason?: string,
) {
  return callPython<{ success: boolean; booking: any }>(`/bookings/${bookingId}/status`, {
    method: "PUT",
    body: { status, reason },
    userId,
  });
}

export async function pythonUpdateBookingMeetingUrl(
  bookingId: string,
  meetingUrl: string | null,
  userId: string,
) {
  return callPython<{ success: boolean }>(`/bookings/${bookingId}/meeting-url`, {
    method: "PUT",
    body: { meetingUrl },
    userId,
  });
}

export async function pythonGetBookingSessionData(bookingId: string) {
  return callPython<any>(`/bookings/${bookingId}/session-data`);
}

export async function pythonConvertBookingToMashAI(
  bookingId: string,
  userId: string,
) {
  return callPython<{ success: boolean; sessionId: string; roomId: string }>(
    `/bookings/${bookingId}/convert-to-ai`,
    { method: "POST", userId },
  );
}

export async function pythonExpireBookings() {
  return callPython<{ success: boolean; expired: number; expiredBookings: any[] }>("/bookings/expire", {
    method: "POST",
  });
}

export async function pythonCreateBookingReminders(
  bookingId: string,
  reminders: Array<{ userId: string; reminderType: string; scheduledFor: string }>,
) {
  return callPython<{ success: boolean }>("/bookings/reminders", {
    method: "POST",
    body: { bookingId, reminders },
  });
}

export async function pythonGetTutorStats(tutorId: string, userId: string) {
  return callPython<{ activeSessions: number; completedSessions: number; totalEarnings: number }>(
    `/tutor/stats/${tutorId}`,
    { userId },
  );
}

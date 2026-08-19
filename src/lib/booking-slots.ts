/**
 * booking-slots.ts — shared helpers for building bookable time slots.
 *
 * Slots are filtered against tutor_availability_blocks (Google Calendar
 * imports + manual blocks) so students never see a time the tutor is busy.
 */

export interface TutorBlock {
  startAt: string;
  endAt: string;
}

export interface AvailabilitySlot {
  dayOfWeek?: number;
  startTime: string;
  endTime: string;
  isBlocked?: boolean;
  date?: string;
}

/**
 * True if a concrete slot (local date + start time + duration) overlaps any of
 * the tutor's blocked windows.
 */
export function slotOverlapsBlock(
  dateKey: string,
  startTime: string,
  durationMinutes: number,
  blocks?: TutorBlock[] | null,
): boolean {
  if (!blocks || blocks.length === 0) return false;

  const slotStart = new Date(`${dateKey}T${startTime}:00`);
  if (Number.isNaN(slotStart.getTime())) return false;
  const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);

  return blocks.some((block) => {
    const blockStart = new Date(block.startAt);
    const blockEnd = new Date(block.endAt);
    if (Number.isNaN(blockStart.getTime()) || Number.isNaN(blockEnd.getTime())) return false;
    return blockStart < slotEnd && blockEnd > slotStart;
  });
}
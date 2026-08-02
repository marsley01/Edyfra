# Google Calendar Sync — Non-Google User Plan

## Context
Google Calendar sync was implemented as an opt-in third-party connection (OAuth is
separate from Edyfra auth, so users who sign in with email/phone can still connect
their Google account). But users without any Google account are excluded from
calendar event reminders — they only get the existing in-app push/web notifications.

## Key Distinction: OAuth Connection ≠ Google Sign-In
Edyfra does NOT need to support Google sign-in for the calendar integration to work.
The OAuth flow is a **third-party connection**, not an auth provider.

Flow:
1. User signs into Edyfra with their existing method (email, phone, etc.)
2. In Settings → Calendar, they click "Connect Google Calendar"
3. Edyfra redirects them to Google's OAuth consent screen
4. They grant calendar permissions using their Google account
5. Google redirects back to Edyfra with an auth code
6. Edyfra stores the tokens server-side, linked to their Edyfra user ID
7. When their booking is confirmed, an event is created in THEIR Google Calendar

Users just need *a* Google account (any Gmail address counts) — they do NOT need to
sign into Edyfra with Google. This is the same pattern used by Notion, Linear,
GitHub, etc.

## Goal
Provide a calendar-event fallback for users who do not have (or do not want to use)
a Google account.

## Design Decision
Use **ICS file generation** as the universal fallback. ICS is the standard calendar
import/export format supported by Google Calendar, Apple Calendar, Outlook,
Yahoo Calendar, and virtually every calendar app on mobile and desktop.

## Affected Boundaries
- `src/app/actions/calendar.ts` — add `generateICalFile(bookingId)` server action
- `src/app/api/calendar/[bookingId]/route.ts` — serve ICS file (GET endpoint)
- `src/app/dashboard/sessions/[id]/page.tsx` — add "Add to Calendar" button (renders
  download link for the ICS file)
- `src/app/dashboard/settings/page.tsx` — keep Google Calendar tab as primary;
  ICS download is always available regardless of Google connection

## Data Flow
1. User clicks "Add to Calendar" on any confirmed booking session page.
2. Frontend calls `/api/calendar/{bookingId}` which triggers a server action.
3. Server action fetches booking + session data (subject, tutor, time, study-room URL).
4. Server generates an ICS file (`.ics`) with the event details.
5. Browser triggers a download of the `.ics` file.
6. User opens the file in their calendar app (Apple Calendar, Outlook, etc.) or
   imports it manually.

## ICS File Format (minimal example)
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Edyfra//Booking//EN
BEGIN:VEVENT
UID:edyfra-{bookingId}@edyfra.com
SUMMARY:Mathematics Session with Tutor Name
DESCRIPTION:Study session on Edyfra\nJoin: https://edyfra-v2.vercel.app/study-room/{sessionId}
DTSTART:20260815T140000Z
DTEND:20260815T150000Z
LOCATION:https://edyfra-v2.vercel.app/study-room/{sessionId}
END:VEVENT
END:VCALENDAR
```

## Security
- ICS files are generated server-side; no credentials required.
- No OAuth token needed — purely a data-export format.
- Download link is scoped to the authenticated user's own bookings only.

## Rollout / Migration
- No migration required — this is purely additive.
- Google Calendar sync remains available for users who connect it.
- ICS is available to all users as a fallback.

## Validation
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] Clicking "Add to Calendar" downloads a valid `.ics` file that imports correctly
  into Apple Calendar and Google Calendar (manual import).

from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone
import resend

from config import settings
from utils.supabase import supabase, execute_async
from models.responses import StandardResponse, ResponseMeta
from models.requests import SessionBookRequest

router = APIRouter(prefix="/v1/sessions", tags=["Sessions"])

resend.api_key = settings.RESEND_API_KEY

EMAIL_SENDER = "Edyfra <bookings@edyfra.app>"


def send_booking_confirmation(booking: dict) -> None:
    """Sends a booking confirmation email to the student via Resend."""
    try:
        resend.Emails.send({
            "from": EMAIL_SENDER,
            "to": [booking["student_email"]],
            "subject": f"Booking received — {booking.get('topic') or booking.get('subject', 'Session')}",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
              <h2 style="color: #6d28d9;">Edyfra Session Booking</h2>
              <p>Hi {booking.get('student_name', 'there')},</p>
              <p>We received your session booking on <strong>{booking.get('source_platform', 'an Edyfra partner platform')}</strong>.
                 Here is a summary:</p>
              <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Subject</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">{booking.get('subject', '-')}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Topic</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">{booking.get('topic', '-')}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Preferred time</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">{booking.get('preferred_datetime', '-')}</td></tr>
              </table>
              <p>A tutor will confirm your session shortly. You can manage your bookings anytime at
                 <a href="https://edyfra-v2.vercel.app" style="color: #6d28d9;">edyfra.app</a>.</p>
              <p style="color: #888; font-size: 12px; margin-top: 24px;">You received this email because a booking was made
                 on your behalf on an Edyfra partner platform. If this wasn't you, ignore this message.</p>
            </div>
            """
        })
    except Exception as e:
        print(f"[sessions] Failed to send confirmation email: {e}")


@router.post("/book", response_model=StandardResponse)
async def book_session(payload: SessionBookRequest, request: Request):
    """
    Books a study session from an external platform.
    Scope required: sessions.book

    Resolves the student to an existing Edyfra user when possible and creates a
    pending booking row. If the student has no Edyfra account yet, the request
    is recorded in the webhooks table and a confirmation email is still sent.
    """
    try:
        # 1. Verify the tutor exists and is verified
        tutor_res = await execute_async(
            supabase.table("User")
            .select("id, name, TutorProfile!inner(isVerified)")
            .eq("id", payload.tutor_id)
            .single()
        )
        if not tutor_res.data or not tutor_res.data.get("TutorProfile", {}).get("isVerified", False):
            raise HTTPException(status_code=404, detail="Tutor not found or not verified")

        booking_record = {
            "tutor_id": payload.tutor_id,
            "subject": payload.subject_id,
            "topic": payload.topic,
            "preferred_datetime": payload.preferred_datetime.isoformat(),
            "student_external_id": payload.student_external_id,
            "student_name": payload.student_name,
            "student_email": payload.student_email,
            "source_platform": payload.source_platform,
            "source_resource_id": payload.source_resource_id,
        }

        student_user_id = None
        # 2. Try to resolve the student to an existing Edyfra user by email
        user_res = await execute_async(
            supabase.table("User")
            .select("id")
            .eq("email", payload.student_email)
        )
        if user_res.data:
            student_user_id = user_res.data[0]["id"]

        if student_user_id:
            # 3a. Insert a pending booking into the bookings table
            preferred = payload.preferred_datetime
            await execute_async(
                supabase.table("bookings")
                .insert({
                    "id": f"ext_{payload.student_external_id}_{int(preferred.timestamp())}",
                    "student_id": student_user_id,
                    "tutor_id": payload.tutor_id,
                    "subject": payload.subject_id,
                    "date": preferred.date().isoformat(),
                    "start_time": preferred.strftime("%H:%M"),
                    "end_time": (preferred.replace(hour=preferred.hour + 1)).strftime("%H:%M"),
                    "duration_minutes": 60,
                    "status": "pending",
                    "amount": 0,
                })
            )
            booking_record["booking_status"] = "pending"
            booking_record["student_id"] = student_user_id
        else:
            # 3b. No Edyfra account yet — record as webhook event for follow-up
            await execute_async(
                supabase.table("api_webhooks")
                .insert({
                    "api_key_id": request.state.api_key["id"],
                    "event_type": "external_booking_request",
                    "payload": booking_record,
                })
            )
            booking_record["booking_status"] = "recorded_for_followup"

        # 4. Send confirmation email (best effort, non-blocking failure tolerance)
        send_booking_confirmation(booking_record)

        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data={
                "booking_status": booking_record["booking_status"],
                "tutor_id": payload.tutor_id,
                "subject": payload.subject_id,
                "preferred_datetime": payload.preferred_datetime.isoformat(),
                "confirmation_email_sent": True,
            },
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to book session: {str(e)}")
import { NextRequest, NextResponse } from "next/server";
import { getResend } from "@/lib/email";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_INBOX = process.env.CONTACT_INBOX_EMAIL || "edyfraplatform@gmail.com";

/**
 * POST /api/contact
 * Public contact form endpoint. Validates inputs and forwards the message
 * to the platform inbox via Resend. Never leaks technical details to callers.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();
    // Honey-pot field — bots fill this; real humans never see it.
    const honeypot = String(body.website || "").trim();

    if (honeypot) {
      // Pretend success so the bot moves on without retrying.
      return NextResponse.json({ success: true });
    }

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Tell us your name (at least 2 characters) so we know who to reply to." },
        { status: 400 },
      );
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "That email address doesn't look right — double-check the spelling." },
        { status: 400 },
      );
    }
    if (!message || message.length < 10) {
      return NextResponse.json(
        { error: "Your message is a little short — give us at least 10 characters so we can help." },
        { status: 400 },
      );
    }
    if (message.length > 5000) {
      return NextResponse.json(
        { error: "Whoa — keep it under 5,000 characters. Send a couple of messages if you need to." },
        { status: 400 },
      );
    }

    const safeSubject = subject || "New message from edyfra.space";
    const cleanBody = message.replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"));

    try {
      await getResend().emails.send({
        from: "Edyfra Contact <hello@edyfra.com>",
        to: CONTACT_INBOX,
        replyTo: email,
        subject: `[Contact] ${safeSubject}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a;">
            <h2 style="margin: 0 0 16px; font-size: 18px;">New message from edyfra.space</h2>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #64748b; width: 90px;">From</td><td style="padding: 6px 0;"><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Subject</td><td style="padding: 6px 0;">${escapeHtml(safeSubject)}</td></tr>
            </table>
            <hr style="margin: 20px 0; border: 0; border-top: 1px solid #e2e8f0;" />
            <pre style="white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.6; margin: 0;">${cleanBody}</pre>
          </div>
        `,
      });
    } catch (err) {
      console.error("[Contact] Resend error:", err);
      return NextResponse.json(
        {
          error:
            "We couldn't deliver your message just now. Try emailing edyfraplatform@gmail.com directly.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Contact] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something tripped on our end. Please try again in a moment." },
      { status: 500 },
    );
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

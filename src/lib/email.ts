import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder_123");

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    await resend.emails.send({
      from: "Edyfra <welcome@edyfra.com>",
      to: email,
      subject: "Welcome to the Edyfra Scholar Community!",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
          <h1 style="color: #0f172a; font-size: 24px; font-weight: 800; tracking: -0.05em;">Welcome to Edyfra, ${name.split(" ")[0]}!</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #475569;">
            We're thrilled to have you join our community of dedicated scholars. Your journey to academic excellence starts today.
          </p>
          <div style="background: #f8fafc; border-radius: 16px; padding: 24px; margin: 32px 0;">
            <h2 style="font-size: 18px; font-weight: 700; margin-top: 0;">Next Steps:</h2>
            <ul style="padding-left: 20px; color: #475569;">
              <li>Explore the <strong>Knowledge Hub</strong> for live help.</li>
              <li>Challenge yourself with the <strong>Daily Quests</strong>.</li>
              <li>Climb the <strong>Leaderboard</strong> and earn rewards.</li>
            </ul>
          </div>
          <a href="https://edyfra.com/dashboard" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px;">Access Your Dashboard</a>
          <hr style="margin: 40px 0; border: 0; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            &copy; 2024 Edyfra Platforms. All rights reserved.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Resend Error:", error);
  }
}

export async function sendTutorWelcomeEmail(email: string, name: string) {
  try {
    await resend.emails.send({
      from: "Edyfra Experts <experts@edyfra.com>",
      to: email,
      subject: "Your Edyfra Expert Application Received",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
          <h1 style="color: #0f172a; font-size: 24px; font-weight: 800;">Hello Expert ${name.split(" ")[0]}!</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #475569;">
            Thank you for applying to become a verified Edyfra Expert. Our team is currently reviewing your academic credentials.
          </p>
          <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 16px; padding: 24px; margin: 32px 0;">
            <p style="margin: 0; color: #166534; font-weight: 600;">
              What happens next?
            </p>
            <p style="margin-top: 8px; font-size: 14px; color: #166534;">
              Once approved, you'll receive another email and your profile will go live in the Match Feed. You can then start accepting student requests and earning.
            </p>
          </div>
          <p style="font-size: 14px; color: #64748b;">
            In the meantime, you can customize your profile settings in the Tutor Desk.
          </p>
          <hr style="margin: 40px 0; border: 0; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            Building the future of African education.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Resend Error:", error);
  }
}

import { Resend } from "resend";

let resend: Resend;
function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM_EMAIL = "JZ Vacation Stays <noreply@jzvacationstays.com>";

export async function sendOtpEmail(email: string, code: string) {
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Your login code: ${code}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1c1917; margin-bottom: 8px;">JZ Vacation Stays</h2>
        <p style="color: #57534e; font-size: 16px;">Your verification code is:</p>
        <div style="background: #f5f5f4; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 600; letter-spacing: 8px; color: #1c1917;">${code}</span>
        </div>
        <p style="color: #78716c; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendRawEmail(to: string, subject: string, html: string) {
  await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });
}

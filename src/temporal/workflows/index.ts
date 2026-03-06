import { proxyActivities, sleep } from "@temporalio/workflow";

import type * as activities from "../activities";

const { sendEmail, getBookingDetails } = proxyActivities<typeof activities>({
  startToCloseTimeout: "30 seconds",
  retry: { maximumAttempts: 3 },
});

/**
 * Post-booking workflow: sends confirmation email, then schedules
 * a check-in reminder and post-stay review request.
 *
 * Expand this workflow as features are built out.
 */
export async function bookingLifecycle(bookingId: string): Promise<void> {
  const details = await getBookingDetails(bookingId);
  if (!details) return;

  const { booking, property } = details;
  if (!property) return;

  // 1. Send booking confirmation email
  await sendEmail({
    to: booking.guestEmail,
    subject: `Booking confirmed — ${property.name}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1c1917;">Booking Confirmed</h2>
        <p style="color: #57534e;">Your stay at <strong>${property.name}</strong> is confirmed.</p>
        <div style="background: #f5f5f4; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="margin: 4px 0; color: #1c1917;"><strong>Check-in:</strong> ${booking.checkIn}</p>
          <p style="margin: 4px 0; color: #1c1917;"><strong>Check-out:</strong> ${booking.checkOut}</p>
          <p style="margin: 4px 0; color: #1c1917;"><strong>Guests:</strong> ${booking.guestsCount}</p>
        </div>
        <p style="color: #78716c; font-size: 14px;">We'll send you a reminder before your check-in date.</p>
      </div>
    `,
  });

  // 2. Wait until 1 day before check-in, then send reminder
  const checkInDate = new Date(booking.checkIn);
  const reminderDate = new Date(checkInDate.getTime() - 24 * 60 * 60 * 1000);
  const now = new Date();

  if (reminderDate > now) {
    const waitMs = reminderDate.getTime() - now.getTime();
    await sleep(waitMs);

    await sendEmail({
      to: booking.guestEmail,
      subject: `Reminder: Your stay at ${property.name} is tomorrow!`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1c1917;">Check-in Tomorrow</h2>
          <p style="color: #57534e;">Just a reminder that your stay at <strong>${property.name}</strong> begins tomorrow.</p>
          <p style="color: #78716c; font-size: 14px;">We hope you have a wonderful trip!</p>
        </div>
      `,
    });
  }

  // 3. Wait until 1 day after check-out, then send review request
  const checkOutDate = new Date(booking.checkOut);
  const reviewDate = new Date(checkOutDate.getTime() + 24 * 60 * 60 * 1000);
  const nowAfterReminder = new Date();

  if (reviewDate > nowAfterReminder) {
    const waitMs = reviewDate.getTime() - nowAfterReminder.getTime();
    await sleep(waitMs);

    await sendEmail({
      to: booking.guestEmail,
      subject: `How was your stay at ${property.name}?`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1c1917;">We'd love your feedback</h2>
          <p style="color: #57534e;">Thank you for staying at <strong>${property.name}</strong>! We'd appreciate it if you could leave a review.</p>
          <p style="color: #78716c; font-size: 14px;">Your feedback helps future guests and helps us improve.</p>
        </div>
      `,
    });
  }
}

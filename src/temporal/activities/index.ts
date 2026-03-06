/**
 * Temporal activities — side-effectful operations called by workflows.
 *
 * Activities run in the worker process and can access the database,
 * call external APIs (Resend, Stripe), etc.
 *
 * Add activity implementations here as features are built out:
 * - sendBookingConfirmationEmail
 * - sendCheckInReminderEmail
 * - sendReviewRequestEmail
 * - syncCalendarFeed
 */

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  // Lazy import to avoid pulling in Resend at module level
  const { sendRawEmail } = await import("../../server/services/email");
  await sendRawEmail(params.to, params.subject, params.html);
}

export async function getBookingDetails(bookingId: string) {
  const { getDb } = await import("../../db");
  const { bookings, properties } = await import("../../db/schema");
  const { eq } = await import("drizzle-orm");

  const db = getDb();
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) return null;

  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, booking.propertyId))
    .limit(1);

  return { booking, property };
}

import { defineEventHandler, readRawBody, getHeader } from "vinxi/http";
import { eq } from "drizzle-orm";

import { getStripe } from "../../../src/server/services/stripe";
import { getDb } from "../../../src/db";
import { bookings } from "../../../src/db/schema";

export default defineEventHandler(async (event) => {
  const stripe = getStripe();
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const rawBody = await readRawBody(event);
  const sig = getHeader(event, "stripe-signature");

  if (!rawBody || !sig) {
    return new Response("Missing body or signature", { status: 400 });
  }

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response("Invalid signature", { status: 400 });
  }

  const db = getDb();

  switch (stripeEvent.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = stripeEvent.data.object;
      const bookingId = paymentIntent.metadata?.bookingId;

      if (bookingId) {
        await db
          .update(bookings)
          .set({ status: "confirmed" })
          .where(eq(bookings.id, bookingId));

        console.log(`Booking ${bookingId} confirmed via webhook`);
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = stripeEvent.data.object;
      const bookingId = paymentIntent.metadata?.bookingId;

      if (bookingId) {
        await db
          .update(bookings)
          .set({ status: "cancelled" })
          .where(eq(bookings.id, bookingId));

        console.log(`Booking ${bookingId} cancelled due to payment failure`);
      }
      break;
    }
  }

  return new Response("ok", { status: 200 });
});

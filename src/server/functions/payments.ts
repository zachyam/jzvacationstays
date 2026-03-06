import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

import { db } from "../../db";
import { bookings } from "../../db/schema";
import { getStripe } from "../services/stripe";

export const createPaymentIntent = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { bookingId: string; amount: number }) => {
      if (!data.bookingId || !data.amount) {
        throw new Error("Booking ID and amount are required");
      }
      return data;
    },
  )
  .handler(async ({ data }) => {
    const stripe = getStripe();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: data.amount,
      currency: "usd",
      metadata: { bookingId: data.bookingId },
    });

    // Store the payment intent ID on the booking
    await db
      .update(bookings)
      .set({ stripePaymentIntentId: paymentIntent.id })
      .where(eq(bookings.id, data.bookingId));

    return { clientSecret: paymentIntent.client_secret };
  });

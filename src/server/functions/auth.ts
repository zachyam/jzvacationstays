import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

import { db } from "../../db";
import { users, sessions, otpCodes } from "../../db/schema";
import { sendOtpEmail } from "../services/email";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Send OTP to email.
 * If the email doesn't exist yet, this is a sign-up — name is required.
 * If the email exists, this is a sign-in — name is ignored.
 */
export const sendOtp = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { email: string; name?: string }) => {
      if (!data.email || !data.email.includes("@")) {
        throw new Error("Valid email is required");
      }
      return data;
    },
  )
  .handler(async ({ data }) => {
    const { email, name } = data;

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    const isNewUser = !existingUser;

    // New user requires name
    if (isNewUser && !name?.trim()) {
      return { success: false, isNewUser: true, needsName: true };
    }

    // Skip OTP for admin users - directly create session
    if (existingUser && existingUser.role === "admin") {
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await db.insert(sessions).values({
        userId: existingUser.id,
        token,
        expiresAt,
      });

      // Set session cookie
      setCookie("session_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      });

      return {
        success: true,
        skipOtp: true,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role
        },
      };
    }

    // Generate and store OTP for regular users
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.insert(otpCodes).values({
      email: email.toLowerCase(),
      code,
      expiresAt,
    });

    // Send email
    try {
      await sendOtpEmail(email, code);
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      throw new Error("Failed to send verification email. Please check your email configuration.");
    }

    return { success: true, isNewUser };
  });

/**
 * Verify OTP and create session.
 * For new users, name must be provided.
 */
export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { email: string; code: string; name?: string }) => {
      if (!data.email || !data.code) {
        throw new Error("Email and code are required");
      }
      return data;
    },
  )
  .handler(async ({ data }) => {
    const { email, code, name } = data;
    const normalizedEmail = email.toLowerCase();

    // Find valid OTP
    const [validOtp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, normalizedEmail),
          eq(otpCodes.code, code),
          eq(otpCodes.used, false),
          gt(otpCodes.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!validOtp) {
      return { success: false, error: "Invalid or expired code" };
    }

    // Mark OTP as used
    await db
      .update(otpCodes)
      .set({ used: true })
      .where(eq(otpCodes.id, validOtp.id));

    // Find or create user
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      if (!name?.trim()) {
        return { success: false, error: "Name is required for new accounts" };
      }
      [user] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          name: name.trim(),
          role: "guest",
        })
        .returning();
    }

    // Create session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(sessions).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // Set session cookie
    setCookie("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    });

    return {
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  });

/**
 * Get current session user from cookie.
 */
export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const token = getCookie("session_token");
    if (!token) return { user: null };

    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())),
      )
      .limit(1);

    if (!session) return { user: null };

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    return { user: user ?? null };
  },
);

/**
 * Log out — delete session and clear cookie.
 */
export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const token = getCookie("session_token");
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  deleteCookie("session_token");
  return { success: true };
});

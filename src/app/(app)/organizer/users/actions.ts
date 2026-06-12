"use server";
import { requireOrgAuth } from "@lib/auth/server";
import { db } from "@lib/db";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";

const EmailSchema = z.string().email();
const CodeSchema = z.string().min(1).max(32);

export async function setupUserAction(
  email: string,
  tournamentCode?: string
): Promise<{ otp: string; tournamentTransferred: boolean } | { error: string }> {
  const session = await requireOrgAuth();

  const emailParsed = EmailSchema.safeParse(email.trim().toLowerCase());
  if (!emailParsed.success) return { error: "Invalid email address." };
  const normalizedEmail = emailParsed.data;

  if (tournamentCode !== undefined) {
    const codeParsed = CodeSchema.safeParse(tournamentCode.trim());
    if (!codeParsed.success) return { error: "Invalid tournament code." };
  }
  const normalizedCode = tournamentCode?.trim() || undefined;

  // Create or find user
  const user = await db.user.upsert({
    where: { email: normalizedEmail },
    create: { id: uuidv7(), email: normalizedEmail, emailVerified: false },
    update: {},
    select: { id: true },
  });

  let tournamentTransferred = false;

  if (normalizedCode) {
    const tournament = await db.tournament.findUnique({
      where: { code: normalizedCode },
      select: { id: true, organizerUserId: true },
    });
    if (!tournament) return { error: `Tournament "${normalizedCode}" not found.` };
    if (tournament.organizerUserId !== session.user.id) {
      return { error: "You can only transfer tournaments you own." };
    }
    await db.tournament.update({
      where: { code: normalizedCode },
      data: { organizerUserId: user.id },
    });
    tournamentTransferred = true;
  }

  // Generate OTP — stored with identifier = email (Better Auth emailOTP format)
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const otpIdentifier = `sign-in-otp-${normalizedEmail}`;
  await db.verification.deleteMany({ where: { identifier: otpIdentifier } });
  await db.verification.create({
    data: { id: uuidv7(), identifier: otpIdentifier, value: otp, expiresAt },
  });

  return { otp, tournamentTransferred };
}

export async function lookupOTPAction(
  email: string
): Promise<{ otp: string } | { error: string }> {
  await requireOrgAuth();

  const parsed = EmailSchema.safeParse(email.trim().toLowerCase());
  if (!parsed.success) return { error: "Invalid email address." };

  const row = await db.verification.findFirst({
    where: { identifier: `sign-in-otp-${parsed.data}`, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { value: true },
  });

  if (!row) return { error: "No pending OTP for this email." };
  return { otp: row.value };
}

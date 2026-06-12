import {
  SESClient,
  SendEmailCommand,
  type SendEmailCommandInput,
} from "@aws-sdk/client-ses";

const ses = new SESClient({ region: process.env.AWS_REGION ?? "ap-southeast-1" });

const FROM_ADDRESS =
  process.env.SES_FROM_ADDRESS ?? "noreply@skrammm.com";

// ---------------------------------------------------------------------------
// Core send helper
// ---------------------------------------------------------------------------

async function sendEmail(input: SendEmailCommandInput): Promise<void> {
  await ses.send(new SendEmailCommand(input));
}

// ---------------------------------------------------------------------------
// OTP login code — sent by Better Auth plugin
// ---------------------------------------------------------------------------

export async function sendOTP(email: string, otp: string): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[DEV MODE] ✉️  Mock Email to ${email}
==================================================
Subject: ${otp} — your Skrammm sign-in code
Your Skrammm sign-in code is: ${otp}
This code expires in 10 minutes. Do not share it with anyone.
==================================================`);
    return;
  }

  try {
    await sendEmail({
      Source: FROM_ADDRESS,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: `${otp} — your Skrammm sign-in code` },
        Body: {
          Text: {
            Data: `Your Skrammm sign-in code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
          },
          Html: {
            Data: `<p>Your Skrammm sign-in code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes. Do not share it with anyone.</p>`,
          },
        },
      },
    });
  } catch (err) {
    // SES sandbox mode — OTP is stored in DB; admin can relay it manually
    console.error(`[SES] Failed to send OTP to ${email}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Tournament / team invitation
// ---------------------------------------------------------------------------

export interface InvitationPayload {
  tournamentName: string;
  inviteUrl: string;
}

export async function sendInvitation(
  email: string,
  payload: InvitationPayload
): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[DEV MODE] ✉️  Mock Invitation to ${email}
==================================================
Subject: You're invited to ${payload.tournamentName} on Skrammm
You've been invited to join ${payload.tournamentName}.
Accept here: ${payload.inviteUrl}
==================================================`);
    return;
  }

  await sendEmail({
    Source: FROM_ADDRESS,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: `You're invited to ${payload.tournamentName} on Skrammm` },
      Body: {
        Text: {
          Data: `You've been invited to join ${payload.tournamentName}.\n\nAccept here: ${payload.inviteUrl}`,
        },
        Html: {
          Data: `<p>You've been invited to join <strong>${payload.tournamentName}</strong>.</p><p><a href="${payload.inviteUrl}">Accept invitation</a></p>`,
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Player claim code (M-6 / P-6 flow)
// ---------------------------------------------------------------------------

export interface ClaimCodePayload {
  playerName: string;
  playerIdCode: string;
  claimUrl: string;
}

export async function sendClaimCode(
  contact: string,
  payload: ClaimCodePayload
): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[DEV MODE] ✉️  Mock Claim Code to ${contact}
==================================================
Subject: Claim your Skrammm player profile — ${payload.playerName}
A Skrammm player profile has been created for ${payload.playerName} (ID: ${payload.playerIdCode}).
Claim it here: ${payload.claimUrl}
==================================================`);
    return;
  }

  await sendEmail({
    Source: FROM_ADDRESS,
    Destination: { ToAddresses: [contact] },
    Message: {
      Subject: { Data: `Claim your Skrammm player profile — ${payload.playerName}` },
      Body: {
        Text: {
          Data: `A Skrammm player profile has been created for ${payload.playerName} (ID: ${payload.playerIdCode}).\n\nClaim it here: ${payload.claimUrl}`,
        },
        Html: {
          Data: `<p>A Skrammm player profile has been created for <strong>${payload.playerName}</strong> (ID: <code>${payload.playerIdCode}</code>).</p><p><a href="${payload.claimUrl}">Claim your profile</a></p>`,
        },
      },
    },
  });
}

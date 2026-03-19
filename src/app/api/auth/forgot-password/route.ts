import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json(
      { success: false, error: "Email requis" },
      { status: 400 }
    );
  }

  // Always return success for security (don't reveal if account exists)
  const successResponse = NextResponse.json({ success: true });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return successResponse;

  // Delete any existing tokens for this email
  await prisma.passwordResetToken.deleteMany({ where: { email } });

  // Generate token + expiration (1 hour)
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { email, token, expiresAt },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "EXCLSV Agency <onboarding@resend.dev>",
    to: email,
    subject: "Réinitialisation de votre mot de passe EXCLSV",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,Helvetica,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:16px;border:1px solid #222222;padding:40px;">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <img src="${baseUrl}/logo-agence-sans-fond.png" alt="EXCLSV" width="80" height="80" style="display:block;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <h1 style="color:#FFFFFF;font-size:22px;margin:0;">Réinitialisation de mot de passe</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <p style="color:#999999;font-size:14px;line-height:1.6;margin:0;">
                      Vous avez demandé la réinitialisation de votre mot de passe EXCLSV.
                      Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
                      Ce lien expire dans 1 heure.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <a href="${resetUrl}" style="display:inline-block;background-color:#E91E8C;color:#FFFFFF;font-size:14px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="color:#666666;font-size:12px;margin:0;">
                      Si vous n'avez pas fait cette demande, ignorez cet email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });

  return successResponse;
}

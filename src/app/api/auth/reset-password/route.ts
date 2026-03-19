import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password || typeof password !== "string") {
    return NextResponse.json(
      { success: false, error: "Token et mot de passe requis" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { success: false, error: "Le mot de passe doit contenir au moins 6 caractères" },
      { status: 400 }
    );
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) {
    return NextResponse.json(
      { success: false, error: "Lien invalide ou expiré" },
      { status: 400 }
    );
  }

  if (resetToken.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
    return NextResponse.json(
      { success: false, error: "Ce lien a expiré. Veuillez refaire une demande." },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { email: resetToken.email },
    data: { password: hashedPassword },
  });

  // Delete used token + any other tokens for this email
  await prisma.passwordResetToken.deleteMany({
    where: { email: resetToken.email },
  });

  return NextResponse.json({ success: true });
}

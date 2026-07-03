import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { target, code } = await request.json();

    if (!target || !code) {
      return NextResponse.json({ error: "Target and code are required" }, { status: 400 });
    }

    const verification = await prisma.otpVerification.findUnique({
      where: { target },
    });

    if (!verification) {
      return NextResponse.json({ error: "No verification request found" }, { status: 400 });
    }

    if (verification.code !== code) {
      return NextResponse.json({ error: "Invalid OTP code" }, { status: 400 });
    }

    if (new Date() > verification.expiresAt) {
      // Clean up expired OTP
      await prisma.otpVerification.delete({ where: { target } }).catch(() => {});
      return NextResponse.json({ error: "OTP code has expired. Please request a new one." }, { status: 400 });
    }

    // Success - delete OTP verification code so it can't be used again
    await prisma.otpVerification.delete({ where: { target } });

    return NextResponse.json({
      message: "Verification successful",
      success: true,
    });
  } catch (error: any) {
    console.error("Verify OTP Error:", error);
    return NextResponse.json({ error: error.message || "Verification failed" }, { status: 500 });
  }
}

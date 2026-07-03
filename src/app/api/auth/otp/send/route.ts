import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { target } = await request.json();

    if (!target) {
      return NextResponse.json({ error: "Email or phone number is required" }, { status: 400 });
    }

    // Generate random 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    // Save or update the OTP code in database
    await prisma.otpVerification.upsert({
      where: { target },
      update: {
        code,
        expiresAt,
        createdAt: new Date(),
      },
      create: {
        target,
        code,
        expiresAt,
      },
    });

    console.log(`[OTP SIMULATION] Sent OTP code ${code} to ${target}`);

    // Return the code in response to display on screen for easy testing
    return NextResponse.json({
      message: "OTP sent successfully",
      target,
      code, // return code for high-fidelity simulation on client
    });
  } catch (error: any) {
    console.error("Send OTP Error:", error);
    return NextResponse.json({ error: error.message || "Failed to send OTP" }, { status: 500 });
  }
}

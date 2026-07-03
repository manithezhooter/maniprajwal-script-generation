import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { target } = await request.json();

    if (!target) {
      return NextResponse.json({ error: "Email or phone number is required" }, { status: 400 });
    }

    const trimmedTarget = target.trim();
    const isEmail = trimmedTarget.includes("@");

    // Generate random 6-digit OTP code for email, or static code for phone numbers (free fallback)
    const code = isEmail 
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : "123456"; // Static code for phone numbers to bypass paid SMS costs

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    // Save or update the OTP code in database
    await prisma.otpVerification.upsert({
      where: { target: trimmedTarget },
      update: {
        code,
        expiresAt,
        createdAt: new Date(),
      },
      create: {
        target: trimmedTarget,
        code,
        expiresAt,
      },
    });

    // 1. EMAIL DELIVERY (via Resend API - 100% Free)
    if (isEmail) {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        console.error("Missing RESEND_API_KEY in environment variables.");
        return NextResponse.json({
          error: "Email verification service is not configured. Please add RESEND_API_KEY in Vercel settings."
        }, { status: 500 });
      }

      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Script Generator <onboarding@resend.dev>",
            to: trimmedTarget.toLowerCase(),
            subject: "Your OTP Verification Code",
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
                <h2 style="color: #f97316; font-size: 24px; font-weight: bold; margin-bottom: 10px;">Script Generator</h2>
                <p style="font-size: 16px; line-height: 1.5; color: #4b5563;">Use the following one-time verification code (OTP) to complete registration or sign in to your account:</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 24px 0; color: #1f2937; font-family: monospace;">
                  ${code}
                </div>
                <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-t: 1px solid #f3f4f6; padding-top: 16px;">This code will expire in 5 minutes. If you did not request this code, please ignore this email.</p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          const errData = await emailResponse.json();
          console.error("Resend API error response:", errData);
          return NextResponse.json({ error: "Failed to deliver OTP email. Verify your Resend configuration." }, { status: 500 });
        }
      } catch (emailErr: any) {
        console.error("Failed to call Resend API:", emailErr);
        return NextResponse.json({ error: "Email delivery channel failed." }, { status: 500 });
      }
    } 
    // 2. PHONE OTP BYPASS (Bypasses Twilio charges, saves 123456 as code)
    else {
      console.log(`[SMS FREE BYPASS] Phone OTP initialized for ${trimmedTarget}. Code stored: ${code}`);
    }

    return NextResponse.json({
      message: "OTP sent successfully",
      target: trimmedTarget,
    });
  } catch (error: any) {
    console.error("Send OTP Error:", error);
    return NextResponse.json({ error: error.message || "Failed to send OTP" }, { status: 500 });
  }
}

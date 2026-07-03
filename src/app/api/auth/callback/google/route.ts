import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error) {
    console.error("Google Auth error callback:", error);
    return NextResponse.redirect(`${appUrl}?auth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}?auth_error=no_code_provided`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/auth/callback/google`;

  if (!clientId || !clientSecret) {
    console.error("Missing Google credentials in callback.");
    return NextResponse.redirect(`${appUrl}?auth_error=google_credentials_missing`);
  }

  try {
    // 1. Exchange OAuth code for Google Access Token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Token exchange failed:", errText);
      return NextResponse.redirect(`${appUrl}?auth_error=token_exchange_failed`);
    }

    const { access_token } = await tokenResponse.json();

    // 2. Fetch User Profile Info from Google API
    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userinfoResponse.ok) {
      console.error("Failed to fetch Google userinfo");
      return NextResponse.redirect(`${appUrl}?auth_error=userinfo_fetch_failed`);
    }

    const googleUser = await userinfoResponse.json();
    const email = googleUser.email?.toLowerCase();

    if (!email) {
      return NextResponse.redirect(`${appUrl}?auth_error=email_not_provided`);
    }

    // 3. Find or Create User in the PostgreSQL Database
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create a secure fallback password
      const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      // Save Google user account to DB
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          dob: new Date("2000-01-01"), // Default dob makes them 18+ so they bypass sensitive block restrictions
          role: "user",
        },
      });
      console.log(`[GOOGLE AUTH] Registered new user: ${email}`);
    } else {
      console.log(`[GOOGLE AUTH] Logged in existing user: ${email}`);
    }

    // 4. Generate JWT Token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5. Build Redirect response & set HttpOnly cookie
    const response = NextResponse.redirect(appUrl);
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("Google Auth Callback Exception:", err);
    return NextResponse.redirect(`${appUrl}?auth_error=internal_server_error`);
  }
}

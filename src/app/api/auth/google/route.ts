import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/callback/google`;

  if (!clientId) {
    console.error("Missing GOOGLE_CLIENT_ID in environment variables.");
    return NextResponse.json({
      error: "Google Authentication is not configured. Please add GOOGLE_CLIENT_ID in Vercel settings."
    }, { status: 500 });
  }

  // Build the Google OAuth URL
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=email%20profile&prompt=consent&access_type=offline`;

  // Redirect the user to Google Auth page
  return NextResponse.redirect(googleAuthUrl);
}

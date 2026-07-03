import { headers } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

export async function getAuthUser() {
  try {
    const headersList = await headers();
    const cookieHeader = headersList.get("cookie") || "";
    const tokenCookie = cookieHeader
      .split(";")
      .find((c) => c.trim().startsWith("token="));

    if (!tokenCookie) return null;

    const token = tokenCookie.split("=")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };

    return decoded;
  } catch (error) {
    return null;
  }
}

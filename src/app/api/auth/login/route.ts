import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

export async function POST(request: Request) {
  try {
    const { email, phone, password, code, type } = await request.json();

    // Check for hardcoded admin login
    if (email && email.toLowerCase() === "maniprajwalt@gmail.com" && type === "password") {
      if (password !== "mani@12345678") {
        return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
      }
      
      let adminUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!adminUser) {
        const hashedPassword = await bcrypt.hash(password, 10);
        adminUser = await prisma.user.create({
          data: {
            email: email.toLowerCase(),
            password: hashedPassword,
            dob: new Date("1990-01-01"),
            role: "admin",
          },
        });
      }

      const token = jwt.sign(
        { userId: adminUser.id, email: adminUser.email, role: "admin" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const response = NextResponse.json(
        {
          message: "Admin login successful",
          user: { id: adminUser.id, email: adminUser.email, role: "admin", dob: adminUser.dob },
        },
        { status: 200 }
      );

      response.cookies.set({
        name: "token",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return response;
    }

    // OTP LOGIN FLOW
    if (type === "otp") {
      const target = email ? email.toLowerCase() : phone;
      if (!target || !code) {
        return NextResponse.json({ error: "Email/phone and OTP code are required" }, { status: 400 });
      }

      // Check OTP in database
      const verification = await prisma.otpVerification.findUnique({
        where: { target },
      });

      if (!verification || verification.code !== code) {
        return NextResponse.json({ error: "Invalid OTP code" }, { status: 400 });
      }

      if (new Date() > verification.expiresAt) {
        await prisma.otpVerification.delete({ where: { target } }).catch(() => {});
        return NextResponse.json({ error: "OTP code has expired" }, { status: 400 });
      }

      // Successful OTP verification - delete OTP code
      await prisma.otpVerification.delete({ where: { target } });

      // Find the user
      const user = await prisma.user.findFirst({
        where: email ? { email: email.toLowerCase() } : { phone },
      });

      if (!user) {
        return NextResponse.json({ error: "User is not registered. Please sign up first." }, { status: 404 });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, phone: user.phone, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const response = NextResponse.json(
        {
          message: "Login successful",
          user: { id: user.id, email: user.email, phone: user.phone, dob: user.dob, role: user.role },
        },
        { status: 200 }
      );

      response.cookies.set({
        name: "token",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return response;
    }

    // PASSWORD LOGIN FLOW (Email + Password only)
    if (type === "password" || !type) {
      if (!email || !password) {
        return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, phone: user.phone, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const response = NextResponse.json(
        {
          message: "Login successful",
          user: { id: user.id, email: user.email, phone: user.phone, dob: user.dob, role: user.role },
        },
        { status: 200 }
      );

      response.cookies.set({
        name: "token",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return response;
    }

    return NextResponse.json({ error: "Unsupported login type" }, { status: 400 });
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: error.message || "Login failed" }, { status: 500 });
  }
}

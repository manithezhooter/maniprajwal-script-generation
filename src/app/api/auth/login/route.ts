import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const lowerEmail = email.trim().toLowerCase();

    // Enforce hardcoded admin login
    if (lowerEmail === "maniprajwalt@gmail.com") {
      if (password !== "mani@12345678") {
        return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
      }
      
      let adminUser = await prisma.user.findUnique({ where: { email: lowerEmail } });
      if (!adminUser) {
        const hashedPassword = await bcrypt.hash(password, 10);
        adminUser = await prisma.user.create({
          data: {
            email: lowerEmail,
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

    // Standard User Login
    const user = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json(
      {
        message: "Login successful",
        user: { id: user.id, email: user.email, dob: user.dob, role: user.role },
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
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: error.message || "Login failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { email, phone, password, dob } = await request.json();

    if ((!email && !phone) || !password || !dob) {
      return NextResponse.json(
        { error: "Missing required fields. Please provide email or phone number, password, and dob." },
        { status: 400 }
      );
    }

    if (email && email.toLowerCase() === "maniprajwalt@gmail.com") {
      return NextResponse.json(
        { error: "This email is reserved for the site owner. Please login directly." },
        { status: 403 }
      );
    }

    // Check existing email
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 400 }
        );
      }
    }

    // Check existing phone
    if (phone) {
      const existingUser = await prisma.user.findUnique({
        where: { phone },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "User with this phone number already exists" },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const dobDate = new Date(dob);

    const user = await prisma.user.create({
      data: {
        email: email ? email.toLowerCase() : null,
        phone: phone || null,
        password: hashedPassword,
        dob: dobDate,
        role: "user", // Enforce user role only
      },
    });

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: { id: user.id, email: user.email, phone: user.phone, dob: user.dob, role: user.role },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
  }
}

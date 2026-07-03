import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { email, password, dob } = await request.json();

    if (!email || !password || !dob) {
      return NextResponse.json(
        { error: "Missing required fields. Please provide email, password, and date of birth." },
        { status: 400 }
      );
    }

    const lowerEmail = email.trim().toLowerCase();

    if (lowerEmail === "maniprajwalt@gmail.com") {
      return NextResponse.json(
        { error: "This email is reserved for the site owner. Please login directly." },
        { status: 403 }
      );
    }

    // Check existing email
    const existingUser = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const dobDate = new Date(dob);

    const user = await prisma.user.create({
      data: {
        email: lowerEmail,
        password: hashedPassword,
        dob: dobDate,
        role: "user", // Enforce user role only
      },
    });

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: { id: user.id, email: user.email, dob: user.dob, role: user.role },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
  }
}

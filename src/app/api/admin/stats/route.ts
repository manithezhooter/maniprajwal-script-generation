import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getAuthUser();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Access Denied. Admins only." }, { status: 403 });
    }

    const totalUsers = await prisma.user.count();
    const totalScripts = await prisma.script.count();
    const totalDrafts = await prisma.draft.count();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        dob: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const recentScripts = await prisma.script.findMany({
      take: 10,
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalScripts,
        totalDrafts,
      },
      users,
      recentScripts,
    });
  } catch (error: any) {
    console.error("Admin Stats Error:", error);
    return NextResponse.json({ error: error.message || "Failed to retrieve stats" }, { status: 500 });
  }
}

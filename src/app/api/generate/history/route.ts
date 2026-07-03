import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getAuthUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scripts = await prisma.script.findMany({
      where: { userId: session.userId },
      include: { drafts: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ scripts });
  } catch (error: any) {
    console.error("Get History Error:", error);
    return NextResponse.json({ error: error.message || "Failed to retrieve history" }, { status: 500 });
  }
}

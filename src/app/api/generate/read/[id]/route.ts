import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const script = await prisma.script.findUnique({
      where: { id },
      include: { drafts: true },
    });

    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }

    // Security check: ensure the script belongs to the authenticated user
    if (script.userId !== session.userId) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    return NextResponse.json({ script });
  } catch (error: any) {
    console.error("Fetch Read Script Error:", error);
    return NextResponse.json({ error: error.message || "Failed to retrieve script" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { selectedDraftId } = await request.json();

    if (!selectedDraftId) {
      return NextResponse.json({ error: "Missing selectedDraftId" }, { status: 400 });
    }

    const script = await prisma.script.findUnique({
      where: { id },
    });

    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }

    if (script.userId !== session.userId) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    const updatedScript = await prisma.script.update({
      where: { id },
      data: { selectedDraftId },
      include: { drafts: true },
    });

    return NextResponse.json({ script: updatedScript });
  } catch (error: any) {
    console.error("Update Selected Draft Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update selected draft" }, { status: 500 });
  }
}


import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tournaments } from "@/db/schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const rows = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
  if (!rows.length) return NextResponse.json({ error: "não encontrada" }, { status: 404 });
  return NextResponse.json({ item: rows[0] });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const b = (await req.json()) as Record<string, unknown>;
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of ["stage", "status", "champion", "groups", "bracket", "name", "stadiumCode", "settings"]) {
    if (b[k] !== undefined) set[k] = b[k];
  }
  const rows = await db.update(tournaments).set(set).where(eq(tournaments.id, id)).returning();
  if (!rows.length) return NextResponse.json({ error: "não encontrada" }, { status: 404 });
  return NextResponse.json({ item: rows[0] });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await db.delete(tournaments).where(eq(tournaments.id, id));
  return NextResponse.json({ ok: true });
}

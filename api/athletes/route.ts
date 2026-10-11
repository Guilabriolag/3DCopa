import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { athletes } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const profileId = url.searchParams.get("profileId");
  const nation = url.searchParams.get("nation");
  if (!profileId) return NextResponse.json({ items: [] });
  const conds = nation ? [eq(athletes.profileId, profileId), eq(athletes.nationCode, nation)] : [eq(athletes.profileId, profileId)];
  const rows = await db
    .select()
    .from(athletes)
    .where(conds.length > 1 ? and(...conds) : conds[0])
    .orderBy(desc(athletes.createdAt));
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const b = (await req.json()) as Record<string, unknown>;
  const profileId = String(b.profileId ?? "");
  if (!profileId) return NextResponse.json({ error: "profileId obrigatório" }, { status: 400 });
  const num = (k: string, d: number) => Number(b[k] ?? d);
  const values = {
    profileId,
    name: String(b.name ?? "Atleta"),
    shirt: Math.round(num("shirt", 10)),
    role: String(b.role ?? "ATA"),
    nationCode: String(b.nationCode ?? "BRA"),
    force: Math.round(num("force", 70)),
    slide: Math.round(num("slide", 70)),
    precision: Math.round(num("precision", 70)),
    edge: Math.round(num("edge", 35)),
    height: Math.round(num("height", 50)),
    mass: Math.round(num("mass", 50)),
    radius: Math.round(num("radius", 50)),
    material: String(b.material ?? "acrilico"),
    primary: String(b.primary ?? "#f5d400"),
    secondary: String(b.secondary ?? "#0b3d91"),
  };
  const id = b.id ? String(b.id) : undefined;
  const rows = id
    ? await db
        .insert(athletes)
        .values({ id, ...values })
        .onConflictDoUpdate({ target: athletes.id, set: values })
        .returning()
    : await db.insert(athletes).values(values).returning();
  return NextResponse.json({ item: rows[0] });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  await db.delete(athletes).where(eq(athletes.id, id));
  return NextResponse.json({ ok: true });
}

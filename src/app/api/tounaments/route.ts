import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tournaments } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const profileId = new URL(req.url).searchParams.get("profileId");
  if (!profileId) return NextResponse.json({ items: [] });
  const rows = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.profileId, profileId))
    .orderBy(desc(tournaments.updatedAt));
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const b = (await req.json()) as Record<string, unknown>;
  const profileId = String(b.profileId ?? "");
  if (!profileId) return NextResponse.json({ error: "profileId obrigatório" }, { status: 400 });
  const values = {
    profileId,
    name: String(b.name ?? "Copa Button"),
    userNation: String(b.userNation ?? "BRA"),
    stage: String(b.stage ?? "groups"),
    status: String(b.status ?? "active"),
    champion: b.champion ? String(b.champion) : null,
    groups: (b.groups as unknown) ?? [],
    bracket: (b.bracket as unknown) ?? [],
    stadiumCode: String(b.stadiumCode ?? "copa"),
    settings: (b.settings as Record<string, unknown>) ?? {},
  };
  if (b.id) {
    const rows = await db
      .insert(tournaments)
      .values({ id: String(b.id), ...values })
      .onConflictDoUpdate({ target: tournaments.id, set: { ...values, updatedAt: new Date() } })
      .returning();
    return NextResponse.json({ item: rows[0] });
  }
  const rows = await db.insert(tournaments).values(values).returning();
  return NextResponse.json({ item: rows[0] });
}

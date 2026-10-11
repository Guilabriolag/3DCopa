import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const profileId = new URL(req.url).searchParams.get("profileId");
  if (!profileId) return NextResponse.json({ items: [] });
  const rows = await db
    .select()
    .from(matches)
    .where(eq(matches.profileId, profileId))
    .orderBy(desc(matches.createdAt))
    .limit(60);
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const b = (await req.json()) as Record<string, unknown>;
  const profileId = String(b.profileId ?? "");
  if (!profileId) return NextResponse.json({ error: "profileId obrigatório" }, { status: 400 });
  const rows = await db
    .insert(matches)
    .values({
      profileId,
      tournamentId: b.tournamentId ? String(b.tournamentId) : null,
      kind: String(b.kind ?? "quick"),
      stage: String(b.stage ?? "group"),
      groupLabel: b.groupLabel ? String(b.groupLabel) : null,
      homeCode: String(b.homeCode ?? "BRA"),
      awayCode: String(b.awayCode ?? "ARG"),
      homeScore: Number(b.homeScore ?? 0),
      awayScore: Number(b.awayScore ?? 0),
      playedByUser: Boolean(b.playedBy ?? true),
      settings: (b.settings as Record<string, unknown>) ?? {},
      stats: (b.stats as Record<string, unknown>) ?? {},
    })
    .returning();
  return NextResponse.json({ item: rows[0] });
}

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  const rows = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  if (!rows.length) return NextResponse.json({ profile: null });
  return NextResponse.json({ profile: rows[0] });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    id?: string;
    handle?: string;
    nationCode?: string;
    coins?: number;
    xp?: number;
    unlockedStadiums?: string[];
  };
  const values = {
    handle: body.handle ?? "Treinador",
    nationCode: body.nationCode ?? "BRA",
    coins: body.coins ?? 250,
    xp: body.xp ?? 0,
    unlockedStadiums: body.unlockedStadiums ?? ["vila", "olimpico"],
  };
  let row;
  if (body.id) {
    const res = await db
      .insert(profiles)
      .values({ id: body.id, ...values })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          handle: values.handle,
          nationCode: values.nationCode,
          coins: values.coins,
          xp: values.xp,
          unlockedStadiums: values.unlockedStadiums,
        },
      })
      .returning();
    row = res[0];
  } else {
    const res = await db.insert(profiles).values(values).returning();
    row = res[0];
  }
  return NextResponse.json({ profile: row });
}

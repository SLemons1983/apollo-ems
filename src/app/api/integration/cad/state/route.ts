import { NextResponse } from "next/server";
import { mdtAdmin, requireMdtUser } from "../../../../../lib/mdt-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireMdtUser();
    const radioIdentifier = new URL(request.url).searchParams.get("radioIdentifier") ?? "";
    if (!radioIdentifier) return NextResponse.json({ ok: true, call: null, session: null, units: [] });
    const db = mdtAdmin();
    const [{ data: call }, { data: session }, { data: units }] = await Promise.all([
      db.from("mdt_cad_calls").select("payload").eq("radio_identifier", radioIdentifier).eq("active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("mdt_unit_sessions").select("*").eq("radio_identifier", radioIdentifier).eq("active", true).maybeSingle(),
      db.from("mdt_unit_sessions").select("*").eq("active", true).order("radio_identifier"),
    ]);
    return NextResponse.json({ ok: true, call: call?.payload ?? null, session, units: units ?? [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to read MDT state" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { mdtAdmin, requireMdtUser } from "../../../../../lib/mdt-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireMdtUser();
    const radioIdentifier = new URL(request.url).searchParams.get("radioIdentifier") ?? "";
    if (!radioIdentifier) return NextResponse.json({ ok: true, call: null, session: null, units: [] });
    const db = mdtAdmin();
    const [{ data: call }, { data: session }, { data: units }, { data: messages }] = await Promise.all([
      db.from("mdt_cad_calls").select("payload").eq("radio_identifier", radioIdentifier).eq("active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("mdt_unit_sessions").select("*").eq("radio_identifier", radioIdentifier).eq("active", true).maybeSingle(),
      db.from("mdt_unit_sessions").select("*").eq("active", true).order("radio_identifier"),
      db.from("mdt_messages").select("id,sender,recipient,body,created_at").in("recipient", [radioIdentifier, "All Units"]).order("created_at", { ascending: false }).limit(25),
    ]);
    return NextResponse.json({ ok: true, call: call?.payload ?? null, session, units: units ?? [], messages: messages ?? [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to read MDT state" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { verifySignedRequest } from "../../../../../lib/integration-security";
import { mdtAdmin } from "../../../../../lib/mdt-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    const verified = verifySignedRequest(request, raw, "ssc-cad-simulator", process.env.APOLLO_INTEGRATION_SECRET ?? "");
    if (!verified.ok) return NextResponse.json({ ok: false, error: verified.error }, { status: verified.status });
    const db = mdtAdmin();
    const [{ data:sessions, error:sessionError }, { data:calls, error:callError }] = await Promise.all([
      db.from("mdt_unit_sessions").select("*").eq("active", true).order("radio_identifier"),
      db.from("mdt_cad_calls").select("payload").eq("active", true).order("updated_at", { ascending:false })
    ]);
    if (sessionError) throw sessionError;
    if (callError) throw callError;
    return NextResponse.json({ ok: true, sessions: sessions ?? [], calls:(calls??[]).map(row=>row.payload), retrievedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to read unit sessions" }, { status: 500 });
  }
}

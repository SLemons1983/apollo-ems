import { NextResponse } from "next/server";
import { verifySignedRequest } from "../../../../../lib/integration-security";
import { mdtAdmin } from "../../../../../lib/mdt-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    const verified = verifySignedRequest(request, raw, "ssc-cad-simulator", process.env.APOLLO_INTEGRATION_SECRET ?? "");
    if (!verified.ok) return NextResponse.json({ ok: false, error: verified.error }, { status: verified.status });
    const call = JSON.parse(raw);
    if (!call.radioIdentifier || !call.callNumber) return NextResponse.json({ ok: false, error: "Invalid CAD call payload" }, { status: 400 });
    const db = mdtAdmin();
    const now = new Date().toISOString();
    const { error } = await db.from("mdt_cad_calls").upsert({
      call_number: call.callNumber, radio_identifier: call.radioIdentifier,
      payload: call, active: true, updated_at: now,
    });
    if (error) throw error;
    await db.from("mdt_unit_sessions").update({ status: call.status || "Dispatched", active_call_number: call.callNumber, updated_at: now }).eq("radio_identifier", call.radioIdentifier).eq("active", true);
    return NextResponse.json({ ok: true, radioIdentifier: call.radioIdentifier, callNumber: call.callNumber, receivedAt: now });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "CAD call receiver failed" }, { status: 500 });
  }
}

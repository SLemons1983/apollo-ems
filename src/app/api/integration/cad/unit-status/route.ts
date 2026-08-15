import { NextResponse } from "next/server";
import { verifySignedRequest } from "../../../../../lib/integration-security";
import { mdtAdmin } from "../../../../../lib/mdt-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    const verified = verifySignedRequest(request, raw, "ssc-cad-simulator", process.env.APOLLO_INTEGRATION_SECRET ?? "");
    if (!verified.ok) return NextResponse.json({ ok: false, error: verified.error }, { status: verified.status });
    const event = JSON.parse(raw);
    if (!event.radioIdentifier || !event.status) return NextResponse.json({ ok: false, error: "Invalid unit-status payload" }, { status: 400 });
    if (event.status === "Out of Service" && !event.outOfServiceReason?.trim()) return NextResponse.json({ ok: false, error: "Out-of-service reason is required" }, { status: 400 });
    const db = mdtAdmin();
    const { error } = await db.from("mdt_unit_sessions").update({
      status: event.status,
      out_of_service_reason: event.status === "Out of Service" ? event.outOfServiceReason.trim() : "",
      updated_at: new Date().toISOString(),
    }).eq("radio_identifier", event.radioIdentifier).eq("active", true);
    if (error) throw error;
    return NextResponse.json({ ok: true, receivedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unit-status receiver failed" }, { status: 500 });
  }
}

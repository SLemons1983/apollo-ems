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
    const now = new Date().toISOString();
    const { data: existing } = await db.from("mdt_unit_sessions").select("id,logged_on_at").eq("radio_identifier", event.radioIdentifier).eq("active", true).maybeSingle();
    if (event.active === false) {
      const { error } = await db.from("mdt_unit_sessions").update({ active: false, active_call_number: null, updated_at: now }).eq("radio_identifier", event.radioIdentifier).eq("active", true);
      if (error) throw error;
      const { error: callError } = await db.from("mdt_cad_calls").update({ active: false, updated_at: now }).eq("radio_identifier", event.radioIdentifier).eq("active", true);
      if (callError) throw callError;
      return NextResponse.json({ ok: true, receivedAt: now });
    }
    const values = {
      active: true,
      physical_vehicle: event.physicalVehicle,
      radio_identifier: event.radioIdentifier,
      station: event.station ?? "",
      level: event.level ?? "ALS",
      crew_members: event.crewMembers ?? [],
      ride_along_type: event.rideAlongType ?? "None",
      ride_along_name: event.rideAlongName ?? "",
      status: event.status,
      active_call_number: event.activeCallNumber ?? null,
      out_of_service_reason: event.status === "Out of Service" ? event.outOfServiceReason.trim() : "",
      emergency_active: Boolean(event.emergencyActive),
      logged_on_at: existing?.logged_on_at ?? now,
      updated_at: now,
    };
    const operation = existing
      ? db.from("mdt_unit_sessions").update(values).eq("id", existing.id)
      : db.from("mdt_unit_sessions").insert(values);
    const { error } = await operation;
    if (error) throw error;
    return NextResponse.json({ ok: true, receivedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unit-status receiver failed" }, { status: 500 });
  }
}

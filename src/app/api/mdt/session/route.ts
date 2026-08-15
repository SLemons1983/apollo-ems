import { NextResponse } from "next/server";
import { isSupervisor, mdtAdmin, requireMdtUser } from "../../../../lib/mdt-server";

export const runtime = "nodejs";

async function supervisor() {
  const user = await requireMdtUser();
  const db = mdtAdmin();
  const { data } = await db.from("employees").select("role,job_title,status").ilike("email", user.email ?? "").maybeSingle();
  if ((data?.status ?? "").toLowerCase() !== "active" || !isSupervisor(data?.role, data?.job_title)) throw new Error("FORBIDDEN");
  return db;
}

export async function POST(request: Request) {
  try {
    const db = await supervisor();
    const body = await request.json();
    if (!body.physicalVehicle || !body.radioIdentifier || !Array.isArray(body.crewMembers) || body.crewMembers.length < 1 || body.crewMembers.length > 4) {
      return NextResponse.json({ ok: false, error: "Vehicle, radio identifier, and one to four crew members are required" }, { status: 400 });
    }
    const employeeIds = body.crewMembers.map((member: { employeeId: string }) => member.employeeId);
    if (new Set(employeeIds).size !== employeeIds.length) return NextResponse.json({ ok: false, error: "Crew members cannot be duplicated" }, { status: 400 });
    const now = new Date().toISOString();
    const row = {
      id: body.id ?? crypto.randomUUID(), active: true,
      physical_vehicle: body.physicalVehicle, radio_identifier: body.radioIdentifier,
      station: body.station ?? "", level: body.level,
      crew_members: body.crewMembers, ride_along_type: body.rideAlongType ?? "None",
      ride_along_name: body.rideAlongType === "None" ? "" : (body.rideAlongName ?? "").trim(),
      status: body.status ?? "Unit Available", emergency_active: false,
      logged_on_at: body.loggedOnAt ?? now, updated_at: now,
    };
    const { data, error } = await db.from("mdt_unit_sessions").upsert(row).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, session: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save session";
    return NextResponse.json({ ok: false, error: message === "FORBIDDEN" ? "Supervisor access required" : message }, { status: message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const db = await supervisor();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "Session id is required" }, { status: 400 });
    const { error } = await db.from("mdt_unit_sessions").update({ active: false, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to log off unit" }, { status: 500 });
  }
}

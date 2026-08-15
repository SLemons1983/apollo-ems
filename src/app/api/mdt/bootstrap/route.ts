import { NextResponse } from "next/server";
import { isSupervisor, mdtAdmin, requireMdtUser } from "../../../../lib/mdt-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireMdtUser();
    const db = mdtAdmin();
    const [{ data: employee }, { data: employees, error }, { data: sessions }] = await Promise.all([
      db.from("employees").select("role,job_title,status").ilike("email", user.email ?? "").maybeSingle(),
      db.from("employees").select("id,first_name,last_name,status").order("last_name").order("first_name"),
      db.from("mdt_unit_sessions").select("*").eq("active", true).order("radio_identifier"),
    ]);
    if (error) throw error;
    const activeEmployees = (employees ?? [])
      .filter(item => (item.status ?? "").trim().toLowerCase() === "active")
      .map(item => ({ employeeId: item.id, displayName: `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim() }))
      .filter(item => item.displayName);
    return NextResponse.json({
      ok: true,
      canManageDevice: isSupervisor(employee?.role, employee?.job_title),
      employees: activeEmployees,
      sessions: sessions ?? [],
    });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json({ ok: false, error: unauthorized ? "Authentication required" : error instanceof Error ? error.message : "Unable to load MDT" }, { status: unauthorized ? 401 : 500 });
  }
}

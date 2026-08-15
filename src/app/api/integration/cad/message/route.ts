import { NextResponse } from "next/server";
import { verifySignedRequest } from "../../../../../lib/integration-security";
import { mdtAdmin } from "../../../../../lib/mdt-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    const verified = verifySignedRequest(request, raw, "ssc-cad-simulator", process.env.APOLLO_INTEGRATION_SECRET ?? "");
    if (!verified.ok) return NextResponse.json({ ok: false, error: verified.error }, { status: verified.status });
    const message = JSON.parse(raw);
    const sender = String(message.sender ?? "Dispatch").trim().slice(0, 80);
    const recipient = String(message.radioIdentifier ?? message.recipient ?? "").trim().slice(0, 40);
    const body = String(message.body ?? message.message ?? "").trim().slice(0, 4000);
    if (!recipient || !body) return NextResponse.json({ ok: false, error: "Message recipient and body are required" }, { status: 400 });
    const { data, error } = await mdtAdmin().from("mdt_messages").insert({ sender, recipient, body }).select("id,created_at").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data.id, receivedAt: data.created_at });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "CAD message receiver failed" }, { status: 500 });
  }
}

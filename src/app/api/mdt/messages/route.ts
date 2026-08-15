import { NextResponse } from "next/server";
import { mdtAdmin, requireMdtUser } from "../../../../lib/mdt-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireMdtUser();
    const input = await request.json();
    const sender = String(input.sender ?? "MDT").trim().slice(0, 80);
    const recipient = String(input.recipient ?? "").trim().slice(0, 40);
    const body = String(input.body ?? "").trim().slice(0, 4000);
    if (!recipient || !body) return NextResponse.json({ ok: false, error: "Message recipient and body are required" }, { status: 400 });
    const { data, error } = await mdtAdmin().from("mdt_messages").insert({ sender, recipient, body }).select("id,sender,recipient,body,created_at").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, message: data });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json({ ok: false, error: unauthorized ? "Authentication required" : error instanceof Error ? error.message : "Unable to send MDT message" }, { status: unauthorized ? 401 : 500 });
  }
}

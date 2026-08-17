import { NextResponse } from "next/server";
import { verifySignedRequest } from "../../../../../lib/integration-security";
import { mdtAdmin } from "../../../../../lib/mdt-server";

export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const raw=await request.text();
    const verified=verifySignedRequest(request,raw,"ssc-cad-simulator",process.env.APOLLO_INTEGRATION_SECRET??"");
    if(!verified.ok)return NextResponse.json({ok:false,error:verified.error},{status:verified.status});
    const payload=JSON.parse(raw);
    if(!payload.radioIdentifier||!payload.callNumber)return NextResponse.json({ok:false,error:"Invalid completion payload"},{status:400});
    const db=mdtAdmin();const now=new Date().toISOString();
    const {error:callError}=await db.from("mdt_cad_calls").update({active:false,updated_at:now}).eq("call_number",payload.callNumber).eq("radio_identifier",payload.radioIdentifier);
    if(callError)throw callError;
    const {error:sessionError}=await db.from("mdt_unit_sessions").update({status:"Unit Available",active_call_number:null,updated_at:now}).eq("radio_identifier",payload.radioIdentifier).eq("active",true);
    if(sessionError)throw sessionError;
    return NextResponse.json({ok:true,receivedAt:now});
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Call completion failed"},{status:500})}
}

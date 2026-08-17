import { NextResponse } from "next/server";
import { signedPost } from "../../../../../lib/integration-security";
import { mdtAdmin, requireMdtUser } from "../../../../../lib/mdt-server";
export const runtime="nodejs";
export async function POST(request:Request){
  try{
    await requireMdtUser();
    const payload=await request.json(); const base=process.env.APOLLO_CAD_BASE_URL; const secret=process.env.APOLLO_INTEGRATION_SECRET??"";
    if(!payload.radioIdentifier||!payload.status)return NextResponse.json({ok:false,error:"Invalid status payload"},{status:400});
    const db=mdtAdmin(); const now=new Date().toISOString();
    await db.from("mdt_unit_sessions").update({status:payload.status,active_call_number:payload.status==="Unit Available"?null:payload.callNumber||null,updated_at:now}).eq("radio_identifier",payload.radioIdentifier).eq("active",true);
    if(payload.callNumber&&payload.disposition){
      const {data:call}=await db.from("mdt_cad_calls").select("payload").eq("call_number",payload.callNumber).maybeSingle();
      if(call?.payload)await db.from("mdt_cad_calls").update({payload:{...call.payload,dispositionCategory:payload.dispositionCategory,disposition:payload.disposition,dispositionCode:payload.dispositionCode,dispositionDetail:payload.dispositionDetail,dispositionTimestamp:payload.dispositionTimestamp},updated_at:now}).eq("call_number",payload.callNumber);
    }
    if(payload.status==="Unit Available"&&payload.callNumber)await db.from("mdt_cad_calls").update({active:false,updated_at:now}).eq("call_number",payload.callNumber);
    if(!base)return NextResponse.json({ok:true,delivered:false,warning:"APOLLO_CAD_BASE_URL is not configured"});
    try{const result=await signedPost(`${base.replace(/\/$/,"")}/api/integration/mdt/status`,"apollo-mdt",secret,payload);return NextResponse.json({ok:true,delivered:true,result})}
    catch(error){return NextResponse.json({ok:true,delivered:false,warning:error instanceof Error?error.message:"CAD unavailable"})}
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Status update failed"},{status:500})}
}

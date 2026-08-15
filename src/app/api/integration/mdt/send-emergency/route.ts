import { NextResponse } from "next/server";
import { signedPost } from "../../../../../lib/integration-security";
import { mdtAdmin, requireMdtUser } from "../../../../../lib/mdt-server";
export const runtime="nodejs";
export async function POST(request:Request){
  try{
    await requireMdtUser(); const payload=await request.json(); const base=process.env.APOLLO_CAD_BASE_URL; const secret=process.env.APOLLO_INTEGRATION_SECRET??"";
    const db=mdtAdmin(); await db.from("mdt_unit_sessions").update({emergency_active:Boolean(payload.active),updated_at:new Date().toISOString()}).eq("radio_identifier",payload.radioIdentifier).eq("active",true);
    if(!base)return NextResponse.json({ok:true,delivered:false});
    try{const result=await signedPost(`${base.replace(/\/$/,"")}/api/integration/mdt/emergency`,"apollo-mdt",secret,payload);return NextResponse.json({ok:true,delivered:true,result})}
    catch(error){return NextResponse.json({ok:true,delivered:false,warning:error instanceof Error?error.message:"CAD unavailable"})}
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Emergency update failed"},{status:500})}
}

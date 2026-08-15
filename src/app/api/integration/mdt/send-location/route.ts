import { NextResponse } from "next/server";
import { signedPost } from "../../../../../lib/integration-security";
import { mdtAdmin, requireMdtUser } from "../../../../../lib/mdt-server";
export const runtime="nodejs";
export async function POST(request:Request){
  try{
    await requireMdtUser(); const payload=await request.json(); const base=process.env.APOLLO_CAD_BASE_URL; const secret=process.env.APOLLO_INTEGRATION_SECRET??"";
    const db=mdtAdmin(); await db.from("mdt_unit_sessions").update({latitude:payload.latitude,longitude:payload.longitude,updated_at:new Date().toISOString()}).eq("radio_identifier",payload.radioIdentifier).eq("active",true);
    if(!base)return NextResponse.json({ok:true,delivered:false});
    try{const result=await signedPost(`${base.replace(/\/$/,"")}/api/integration/mdt/location`,"apollo-mdt",secret,payload);return NextResponse.json({ok:true,delivered:true,result})}
    catch{return NextResponse.json({ok:true,delivered:false})}
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Location update failed"},{status:500})}
}

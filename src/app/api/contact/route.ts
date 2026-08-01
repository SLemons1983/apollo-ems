import { NextRequest, NextResponse } from 'next/server';
import { sendApolloEmail } from '@/lib/email';

function clean(value:unknown,max:number){return typeof value==='string'?value.trim().slice(0,max):''}
export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    if(clean(body.website,200)) return NextResponse.json({ok:true});
    const name=clean(body.name,160),email=clean(body.email,200),organization=clean(body.organization,200),phone=clean(body.phone,80),message=clean(body.message,3000);
    if(!name||!organization||message.length<20||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({error:'Invalid inquiry.'},{status:400});
    await sendApolloEmail({to:'support@apolloems.org',subject:`ApolloEMS inquiry — ${organization}`,text:`New ApolloEMS website inquiry\n\nName: ${name}\nOrganization: ${organization}\nEmail: ${email}\nPhone: ${phone||'Not provided'}\n\nMessage:\n${message}`,allowSuppressedRecipients:true});
    return NextResponse.json({ok:true});
  }catch(error){console.error('ApolloEMS contact inquiry error:',error);return NextResponse.json({error:'Unable to send inquiry.'},{status:500})}
}

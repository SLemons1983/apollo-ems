'use client';
import { FormEvent, useState } from 'react';

export default function ContactForm(){
  const [state,setState]=useState<'idle'|'sending'|'sent'|'error'>('idle');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); setState('sending');
    const form=new FormData(event.currentTarget);
    const payload=Object.fromEntries(form.entries());
    try{const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!response.ok) throw new Error(); setState('sent'); event.currentTarget.reset();}catch{setState('error');}
  }
  return <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
    <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
    <div className="grid gap-5 sm:grid-cols-2"><Field name="name" label="Your name" required/><Field name="email" label="Work email" type="email" required/></div>
    <div className="grid gap-5 sm:grid-cols-2"><Field name="organization" label="Agency or organization" required/><Field name="phone" label="Phone (optional)" type="tel"/></div>
    <label className="block text-sm font-bold text-slate-700">How can ApolloEMS help?<textarea name="message" required minLength={20} maxLength={3000} rows={7} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-600"/></label>
    <button disabled={state==='sending'} className="w-full rounded-2xl bg-gradient-to-r from-[#0b1f4d] to-[#0878d1] px-5 py-4 font-bold text-white disabled:opacity-60">{state==='sending'?'Sending…':'Send Inquiry'}</button>
    {state==='sent'&&<p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Thank you. Your inquiry was sent to ApolloEMS.</p>}
    {state==='error'&&<p className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800">We could not send your inquiry. Please email support@apolloems.org.</p>}
  </form>
}
function Field({name,label,type='text',required=false}:{name:string;label:string;type?:string;required?:boolean}){return <label className="block text-sm font-bold text-slate-700">{label}<input name={name} type={type} required={required} maxLength={160} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-600"/></label>}

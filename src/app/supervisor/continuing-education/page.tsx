'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { supabase } from '@/lib/supabase';

type Certifications = Record<string, string>;
type Employee = { id:string; first_name:string|null; last_name:string|null; role:string|null; status:string|null; certifications:Certifications|null };
type CeClass = { id:string; class_date:string; topic:string; ce_hours:number; course_type:'INSTRUCTOR_BASED'|'NON_INSTRUCTOR_BASED'; created_at:string };
type Attendance = { id:string; class_id:string; employee_id:string; employee_name:string; credential_type:string; license_number:string };

const PROVIDER_NUMBER = '61-0026';
const INSTRUCTOR_NAME = 'Jose A. Hernandez Rosas, EMT-P';
const INSTRUCTOR_TITLE = 'Operations Supervisor/Program Director';

function employeeName(e: Employee) { return `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || 'Unnamed Employee'; }
function credential(e: Employee) {
  const c=e.certifications ?? {};
  const role=(e.role ?? '').toLowerCase();
  const isMedic=role.includes('paramedic') || role.includes('supervisor');
  return isMedic
    ? { type:'Paramedic', number:(c.californiaParamedicLicenseNumber ?? '').trim() }
    : { type:'EMT', number:(c.californiaEmtLicenseNumber ?? '').trim() };
}
function displayDate(v:string) { const [y,m,d]=v.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('en-US'); }
function safeName(v:string) { return v.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,''); }

async function imageBytes(path:string) { const r=await fetch(path); if(!r.ok) throw new Error(`Unable to load ${path}`); return new Uint8Array(await r.arrayBuffer()); }

async function buildCertificates(ce:CeClass, people:Attendance[]) {
  const pdf=await PDFDocument.create();
  const regular=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const serifBold=await pdf.embedFont(StandardFonts.TimesRomanBold);
  const logo=await pdf.embedPng(await imageBytes('/ce-assets/ssc-logo.png'));
  const signature=await pdf.embedPng(await imageBytes('/ce-assets/jose-signature.png'));
  const W=792,H=612;
  const center=(page:any,text:string,size:number,font:any,y:number)=>page.drawText(text,{x:(W-font.widthOfTextAtSize(text,size))/2,y,size,font,color:rgb(0,0,0)});
  for(const a of people){
    const page=pdf.addPage([W,H]);
    page.drawRectangle({x:5,y:5,width:W-10,height:H-10,borderWidth:.6,borderColor:rgb(.65,.68,.72)});
    page.drawImage(logo,{x:42,y:386,width:112,height:112}); page.drawImage(logo,{x:638,y:386,width:112,height:112});
    center(page,'Continued Education Certificate',29,serifBold,505);
    center(page,'Sequoia Safety Council',18,bold,470);
    center(page,'500 E 11th St Reedley, CA 93654',9,regular,444);
    center(page,`Certifies that ${a.credential_type}`,10,bold,420);
    center(page,`${a.employee_name}${a.license_number ? ` ${a.license_number}` : ''}`,18,bold,388);
    center(page,'Has successfully completed CE on:',10,bold,360);
    page.drawRectangle({x:146,y:264,width:500,height:82,borderWidth:1,borderColor:rgb(.2,.2,.2)});
    page.drawText(ce.topic,{x:162,y:316,size:13,font:regular,maxWidth:468,lineHeight:16});
    const hours=Number(ce.ce_hours); const hoursText=Number.isInteger(hours)?String(hours):String(hours);
    center(page,`This course has been approved for ${hoursText} Hours of continued education by an approved California EMS CE Provider and was:`,10,bold,242);
    const ib=ce.course_type==='INSTRUCTOR_BASED';
    center(page,`${ib?'X':'___'}  Instructor Based                 ${ib?'___':'X'}  Non-Instructor Based`,10,bold,217);
    center(page,`California EMS CE Provider # ${PROVIDER_NUMBER}`,14,bold,164);
    center(page,`Date of Completion ${displayDate(ce.class_date)}`,13,bold,135);
    page.drawText(INSTRUCTOR_NAME,{x:76,y:86,size:9,font:regular});
    page.drawText(INSTRUCTOR_TITLE,{x:76,y:62,size:9,font:regular});
    page.drawImage(signature,{x:530,y:50,width:205,height:61});
    center(page,'This document must be maintained for no less than four (4) years.',7,regular,38);
  }
  return pdf.save();
}

export default function ContinuingEducationPage(){
  const [employees,setEmployees]=useState<Employee[]>([]); const [classes,setClasses]=useState<CeClass[]>([]);
  const [attendance,setAttendance]=useState<Record<string,Attendance[]>>({}); const [selected,setSelected]=useState<string[]>([]);
  const [date,setDate]=useState(new Date().toISOString().slice(0,10)); const [topic,setTopic]=useState(''); const [hours,setHours]=useState('');
  const [courseType,setCourseType]=useState<'INSTRUCTOR_BASED'|'NON_INSTRUCTOR_BASED'>('INSTRUCTOR_BASED'); const [showEmployees,setShowEmployees]=useState(false);
  const [status,setStatus]=useState(''); const [saving,setSaving]=useState(false);
  const activeEmployees=useMemo(()=>employees.filter(e=>(e.status??'Active').toLowerCase()!=='removed').sort((a,b)=>employeeName(a).localeCompare(employeeName(b))),[employees]);

  async function load(){
    const [er,cr,ar]=await Promise.all([
      supabase.from('employees').select('id,first_name,last_name,role,status,certifications'),
      supabase.from('ce_classes').select('*').order('class_date',{ascending:false}).order('created_at',{ascending:false}),
      supabase.from('ce_attendance').select('*').order('employee_name',{ascending:true}),
    ]);
    if(er.error) throw er.error; if(cr.error) throw cr.error; if(ar.error) throw ar.error;
    setEmployees((er.data??[]) as Employee[]); setClasses((cr.data??[]) as CeClass[]);
    const grouped:Record<string,Attendance[]>={}; for(const a of (ar.data??[]) as Attendance[]) (grouped[a.class_id]??=[]).push(a); setAttendance(grouped);
  }
  useEffect(()=>{ load().catch(e=>setStatus(`Unable to load CE records: ${e.message}`)); },[]);
  function toggle(id:string){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);}
  async function saveClass(){
    if(!date||!topic.trim()||!hours||Number(hours)<=0){setStatus('Enter the date, CE topic, and CE hours.');return;}
    if(selected.length===0){setStatus('Add at least one employee to the attendance list.');return;}
    setSaving(true); setStatus('Saving CE class...');
    try{
      const {data,error}=await supabase.from('ce_classes').insert({class_date:date,topic:topic.trim(),ce_hours:Number(hours),course_type:courseType}).select('*').single(); if(error) throw error;
      const rows=selected.map(id=>{const e=employees.find(x=>x.id===id)!; const c=credential(e); return {class_id:data.id,employee_id:e.id,employee_name:employeeName(e),credential_type:c.type,license_number:c.number};});
      const r=await supabase.from('ce_attendance').insert(rows); if(r.error) throw r.error;
      setTopic('');setHours('');setSelected([]);setShowEmployees(false);setStatus('CE class saved.');await load();
    }catch(e:any){setStatus(`Unable to save CE class: ${e.message}`);}finally{setSaving(false);}
  }
  async function download(ce:CeClass,people:Attendance[]){
    if(!people.length)return; setStatus('Generating certificate PDF...');
    try{const bytes=await buildCertificates(ce,people); const blob=new Blob([bytes as BlobPart],{type:'application/pdf'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=`CE-${ce.class_date}-${safeName(ce.topic)}${people.length===1?`-${safeName(people[0].employee_name)}`:'-All-Certificates'}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('Certificate PDF generated.');}catch(e:any){setStatus(`Unable to generate certificate: ${e.message}`);}
  }
  return <div className="min-h-screen bg-gradient-to-br from-[#071632] via-[#0b3f78] to-[#0795e6] px-4 py-6 md:px-6"><div className="mx-auto max-w-6xl space-y-5">
    <div className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900">Continuing Education (CE)</h1><p className="mt-1 text-sm text-slate-600">Create CE classes, record attendance, and generate certificates.</p></div><a href="/supervisor" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Back to Supervisor</a></div></div>
    <div className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Add CE Class</h2><div className="mt-4 grid gap-4 md:grid-cols-4">
      <label className="text-sm font-semibold text-slate-700">Date<input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"/></label>
      <label className="text-sm font-semibold text-slate-700 md:col-span-2">CE Topic<input value={topic} onChange={e=>setTopic(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Enter CE topic"/></label>
      <label className="text-sm font-semibold text-slate-700">CE Hours<input type="number" min="0.25" step="0.25" value={hours} onChange={e=>setHours(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"/></label>
    </div><div className="mt-4 flex flex-wrap gap-3"><label className="flex items-center gap-2 text-sm font-semibold"><input type="radio" checked={courseType==='INSTRUCTOR_BASED'} onChange={()=>setCourseType('INSTRUCTOR_BASED')}/> Instructor Based</label><label className="flex items-center gap-2 text-sm font-semibold"><input type="radio" checked={courseType==='NON_INSTRUCTOR_BASED'} onChange={()=>setCourseType('NON_INSTRUCTOR_BASED')}/> Non-Instructor Based</label></div>
    <div className="mt-5"><button onClick={()=>setShowEmployees(v=>!v)} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white">{showEmployees?'Hide Employees':'Add Employee'} ({selected.length} selected)</button></div>
    {showEmployees&&<div className="mt-4 max-h-80 overflow-auto rounded-xl border border-slate-200"><div className="grid gap-1 p-3 md:grid-cols-2">{activeEmployees.map(e=><label key={e.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50"><input type="checkbox" checked={selected.includes(e.id)} onChange={()=>toggle(e.id)}/><span><span className="font-semibold text-slate-900">{employeeName(e)}</span><span className="ml-2 text-xs text-slate-500">{credential(e).type}{credential(e).number?` · ${credential(e).number}`:' · license # not entered'}</span></span></label>)}</div></div>}
    <button disabled={saving} onClick={saveClass} className="mt-5 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving?'Saving...':'Save CE Class'}</button>{status&&<div className="mt-3 text-sm font-semibold text-slate-700">{status}</div>}</div>
    <div className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-900">CE Class History</h2><div className="mt-4 space-y-4">{classes.length===0?<p className="text-sm text-slate-500">No CE classes have been entered yet.</p>:classes.map(ce=>{const people=attendance[ce.id]??[];return <details key={ce.id} className="rounded-xl border border-slate-200"><summary className="cursor-pointer list-none p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-bold text-slate-900">{displayDate(ce.class_date)} — {ce.topic}</div><div className="mt-1 text-sm text-slate-600">{Number(ce.ce_hours)} Hours · {people.length} Attendee{people.length===1?'':'s'} · {ce.course_type==='INSTRUCTOR_BASED'?'Instructor Based':'Non-Instructor Based'}</div></div><button type="button" onClick={e=>{e.preventDefault();download(ce,people)}} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Generate All Certificates</button></div></summary><div className="border-t border-slate-200 p-4"><div className="space-y-2">{people.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3"><div><div className="font-semibold">{a.employee_name}</div><div className="text-xs text-slate-500">{a.credential_type}{a.license_number?` · ${a.license_number}`:' · License number not on profile'}</div></div><button onClick={()=>download(ce,[a])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Generate Certificate</button></div>)}</div></div></details>})}</div></div>
  </div></div>;
}

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
  const paramedicNumber=(c.californiaParamedicLicenseNumber ?? '').trim();
  const emtNumber=(c.californiaEmtLicenseNumber ?? '').trim();

  if(paramedicNumber && !emtNumber) return { type:'Paramedic', number:paramedicNumber };
  if(emtNumber && !paramedicNumber) return { type:'EMT', number:emtNumber };

  if(paramedicNumber && emtNumber) {
    const role=(e.role ?? '').toLowerCase();
    if(role.includes('paramedic')) return { type:'Paramedic', number:paramedicNumber };
    if(role.includes('emt')) return { type:'EMT', number:emtNumber };
    return { type:'Certification Not Set', number:'' };
  }

  return { type:'Certification Not Set', number:'' };
}

function currentAttendanceCredential(a:Attendance, employees:Employee[]) {
  const employee=employees.find(e=>e.id===a.employee_id);
  if(!employee) return { ...a, credential_type:a.credential_type || 'Certification Not Set', license_number:a.license_number || '' };
  const current=credential(employee);
  return { ...a, employee_name:employeeName(employee), credential_type:current.type, license_number:current.number };
}
function displayDate(v:string) { const [y,m,d]=v.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('en-US'); }
function safeName(v:string) { return v.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,''); }

async function imageBytes(path:string) { const r=await fetch(path); if(!r.ok) throw new Error(`Unable to load ${path}`); return new Uint8Array(await r.arrayBuffer()); }

async function buildCertificates(ce:CeClass, people:Attendance[]) {
  const pdf=await PDFDocument.create();
  const regular=await pdf.embedFont(StandardFonts.TimesRoman);
  const italic=await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const bold=await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans=await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo=await pdf.embedJpg(await imageBytes('/ce-assets/ssc-logo-current.jpg'));
  const signature=await pdf.embedPng(await imageBytes('/ce-assets/jose-signature.png'));
  const W=792,H=612,navy=rgb(.035,.105,.255),gold=rgb(.86,.64,.12);
  const center=(page:any,text:string,size:number,font:any,y:number,color=navy)=>page.drawText(text,{x:(W-font.widthOfTextAtSize(text,size))/2,y,size,font,color});
  const fit=(text:string,font:any,max:number,start:number,min=8)=>{let z=start;while(z>min&&font.widthOfTextAtSize(text,z)>max)z-=.5;return z;};
  for(const a of people){
    const page=pdf.addPage([W,H]);
    page.drawRectangle({x:10,y:10,width:W-20,height:H-20,borderWidth:5,borderColor:navy});
    page.drawRectangle({x:17,y:17,width:W-34,height:H-34,borderWidth:2.2,borderColor:gold});
    page.drawRectangle({x:23,y:23,width:W-46,height:H-46,borderWidth:.8,borderColor:navy});
    page.drawImage(logo,{x:276,y:165,width:240,height:240,opacity:.055});
    page.drawImage(logo,{x:42,y:414,width:102,height:102});
    page.drawImage(logo,{x:648,y:414,width:102,height:102});
    page.drawLine({start:{x:175,y:542},end:{x:340,y:542},thickness:1.2,color:gold});
    page.drawLine({start:{x:452,y:542},end:{x:617,y:542},thickness:1.2,color:gold});
    center(page,'CONTINUED EDUCATION',27,bold,522);
    center(page,'CERTIFICATE',27,bold,491);
    center(page,'SEQUOIA SAFETY COUNCIL',19,bold,456);
    center(page,'500 E 11th St - Reedley, CA 93654',9,sans,438);
    center(page,`Certifies that ${a.credential_type.toUpperCase()}`,13,regular,408);
    const recipient=`${a.employee_name.toUpperCase()}${a.license_number?`   ${a.license_number}`:''}`;
    center(page,recipient,fit(recipient,bold,510,24,16),bold,374);
    center(page,'has successfully completed the following continuing education course:',11,italic,351);
    page.drawRectangle({x:164,y:296,width:464,height:43,color:navy,borderWidth:1.5,borderColor:gold});
    center(page,ce.topic.toUpperCase(),fit(ce.topic.toUpperCase(),bold,430,19,10),bold,309,rgb(1,1,1));
    const h=Number(ce.ce_hours);
    center(page,`For ${String(h)} Hour${h===1?'':'s'} of Continuing Education`,14,bold,270);
    center(page,'This course has been approved for continuing education by an approved California EMS CE Provider.',9.5,sans,244);
    center(page,'INSTRUCTOR BASED',11,sansBold,224);
    page.drawRectangle({x:246,y:181,width:300,height:31,borderWidth:1.2,borderColor:gold});
    center(page,`CALIFORNIA EMS CE PROVIDER # ${PROVIDER_NUMBER}`,12,sansBold,191);
    center(page,`DATE OF COMPLETION: ${displayDate(ce.class_date)}`,12,sansBold,157);
    page.drawImage(signature,{x:68,y:73,width:190,height:57});
    page.drawLine({start:{x:65,y:72},end:{x:280,y:72},thickness:.8,color:gold});
    page.drawText(INSTRUCTOR_NAME,{x:72,y:55,size:8.5,font:sans,color:navy});
    page.drawText(INSTRUCTOR_TITLE,{x:72,y:40,size:8.5,font:italic,color:navy});
    center(page,'This document must be maintained for no less than four (4) years.',7,sans,31,navy);
  }
  return pdf.save();
}

export default function ContinuingEducationPage(){
  const [employees,setEmployees]=useState<Employee[]>([]); const [classes,setClasses]=useState<CeClass[]>([]);
  const [attendance,setAttendance]=useState<Record<string,Attendance[]>>({}); const [selected,setSelected]=useState<string[]>([]);
  const [date,setDate]=useState(new Date().toISOString().slice(0,10)); const [topic,setTopic]=useState(''); const [hours,setHours]=useState('');
  const [showEmployees,setShowEmployees]=useState(false);
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
      const {data,error}=await supabase.from('ce_classes').insert({class_date:date,topic:topic.trim(),ce_hours:Number(hours),course_type:'INSTRUCTOR_BASED'}).select('*').single(); if(error) throw error;
      const rows=selected.map(id=>{const e=employees.find(x=>x.id===id)!; const c=credential(e); return {class_id:data.id,employee_id:e.id,employee_name:employeeName(e),credential_type:c.type,license_number:c.number};});
      const r=await supabase.from('ce_attendance').insert(rows); if(r.error) throw r.error;
      setTopic('');setHours('');setSelected([]);setShowEmployees(false);setStatus('CE class saved.');await load();
    }catch(e:any){setStatus(`Unable to save CE class: ${e.message}`);}finally{setSaving(false);}
  }
  async function download(ce:CeClass,people:Attendance[]){
    if(!people.length)return; setStatus('Generating certificate PDF...');
    try{
      const currentPeople=people.map(a=>currentAttendanceCredential(a,employees));
      const unresolved=currentPeople.filter(a=>a.credential_type==='Certification Not Set');
      if(unresolved.length){
        setStatus(`Unable to generate certificate: EMS certification is not set for ${unresolved.map(a=>a.employee_name).join(', ')}.`);
        return;
      }
      const bytes=await buildCertificates(ce,currentPeople); const blob=new Blob([bytes as BlobPart],{type:'application/pdf'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=`CE-${ce.class_date}-${safeName(ce.topic)}${currentPeople.length===1?`-${safeName(currentPeople[0].employee_name)}`:'-All-Certificates'}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('Certificate PDF generated.');
    }catch(e:any){setStatus(`Unable to generate certificate: ${e.message}`);}
  }
  return <div className="min-h-screen bg-gradient-to-br from-[#071632] via-[#0b3f78] to-[#0795e6] px-4 py-6 md:px-6"><div className="mx-auto max-w-6xl space-y-5">
    <div className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900">Continuing Education (CE)</h1><p className="mt-1 text-sm text-slate-600">Create CE classes, record attendance, and generate certificates.</p></div><a href="/supervisor" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Back to Supervisor</a></div></div>
    <div className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Add CE Class</h2><div className="mt-4 grid gap-4 md:grid-cols-4">
      <label className="text-sm font-semibold text-slate-700">Date<input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"/></label>
      <label className="text-sm font-semibold text-slate-700 md:col-span-2">CE Topic<input value={topic} onChange={e=>setTopic(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Enter CE topic"/></label>
      <label className="text-sm font-semibold text-slate-700">CE Hours<input type="number" min="0.25" step="0.25" value={hours} onChange={e=>setHours(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"/></label>
    </div><div className="mt-4 text-sm font-semibold text-slate-600">Instructor Based</div>
    <div className="mt-5"><button onClick={()=>setShowEmployees(v=>!v)} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white">{showEmployees?'Hide Employees':'Add Employee'} ({selected.length} selected)</button></div>
    {showEmployees&&<div className="mt-4 max-h-80 overflow-auto rounded-xl border border-slate-200"><div className="grid gap-1 p-3 md:grid-cols-2">{activeEmployees.map(e=><label key={e.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50"><input type="checkbox" checked={selected.includes(e.id)} onChange={()=>toggle(e.id)}/><span><span className="font-semibold text-slate-900">{employeeName(e)}</span><span className="ml-2 text-xs text-slate-500">{credential(e).type}{credential(e).number?` · ${credential(e).number}`:' · license # not entered'}</span></span></label>)}</div></div>}
    <button disabled={saving} onClick={saveClass} className="mt-5 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving?'Saving...':'Save CE Class'}</button>{status&&<div className="mt-3 text-sm font-semibold text-slate-700">{status}</div>}</div>
    <div className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-900">CE Class History</h2><div className="mt-4 space-y-4">{classes.length===0?<p className="text-sm text-slate-500">No CE classes have been entered yet.</p>:classes.map(ce=>{const people=attendance[ce.id]??[];return <details key={ce.id} className="rounded-xl border border-slate-200"><summary className="cursor-pointer list-none p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-bold text-slate-900">{displayDate(ce.class_date)} — {ce.topic}</div><div className="mt-1 text-sm text-slate-600">{Number(ce.ce_hours)} Hours · {people.length} Attendee{people.length===1?'':'s'} · Instructor Based</div></div><button type="button" onClick={e=>{e.preventDefault();download(ce,people)}} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Generate All Certificates</button></div></summary><div className="border-t border-slate-200 p-4"><div className="space-y-2">{people.map(a=>{const current=currentAttendanceCredential(a,employees);return <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3"><div><div className="font-semibold">{current.employee_name}</div><div className="text-xs text-slate-500">{current.credential_type}{current.license_number?` · ${current.license_number}`:' · EMS certification/license not set on profile'}</div></div><button onClick={()=>download(ce,[a])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Generate Certificate</button></div>})}</div></div></details>})}</div></div>
  </div></div>;
}

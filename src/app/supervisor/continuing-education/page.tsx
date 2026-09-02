'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { supabase } from '@/lib/supabase';

type Certifications = Record<string, string>;
type Employee = { id:string; first_name:string|null; last_name:string|null; role:string|null; status:string|null; certifications:Certifications|null };
type InstructorKey = 'jose'|'heather';
type CeClass = { id:string; class_date:string; topic:string; ce_hours:number; course_type:'INSTRUCTOR_BASED'|'NON_INSTRUCTOR_BASED'; instructor_key:InstructorKey; created_at:string };
type Attendance = { id:string; class_id:string; employee_id:string; employee_name:string; credential_type:string; license_number:string };

const PROVIDER_NUMBER = '61-0026';
const CE_INSTRUCTORS = {
  jose: { name:'Jose A. Hernandez Rosas, EMT-P', title:'Operations Supervisor/Program Director', signature:'/ce-assets/jose-signature.png' },
  heather: { name:'Heather Washburn', title:'Operations Supervisor', signature:'/ce-assets/heather-signature.png' },
} as const;
function ceInstructor(key:InstructorKey|undefined) { return CE_INSTRUCTORS[key === 'heather' ? 'heather' : 'jose']; }

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
  const instructor=ceInstructor(ce.instructor_key);
  const signature=await pdf.embedPng(await imageBytes(instructor.signature));
  const W=792,H=612,navy=rgb(.035,.105,.255),gold=rgb(.86,.64,.12),gray=rgb(.32,.36,.42);
  const center=(page:any,text:string,size:number,font:any,y:number,color=navy)=>page.drawText(text,{x:(W-font.widthOfTextAtSize(text,size))/2,y,size,font,color});
  const fit=(text:string,font:any,max:number,start:number,min=8)=>{let z=start;while(z>min&&font.widthOfTextAtSize(text,z)>max)z-=.5;return z;};
  for(const a of people){
    const page=pdf.addPage([W,H]);
    page.drawRectangle({x:10,y:10,width:W-20,height:H-20,borderWidth:5,borderColor:navy});
    page.drawRectangle({x:17,y:17,width:W-34,height:H-34,borderWidth:2,borderColor:gold});
    page.drawRectangle({x:24,y:24,width:W-48,height:H-48,borderWidth:.7,borderColor:navy});
    page.drawImage(logo,{x:246,y:146,width:300,height:300,opacity:.025});
    page.drawImage(logo,{x:48,y:438,width:112,height:112});
    page.drawImage(logo,{x:632,y:438,width:112,height:112});
    page.drawLine({start:{x:190,y:548},end:{x:602,y:548},thickness:1.2,color:gold});
    center(page,'CONTINUING EDUCATION',24,bold,518);
    center(page,'CERTIFICATE',24,bold,487);
    center(page,'SEQUOIA SAFETY COUNCIL',17,bold,452);
    center(page,'500 E 11th Street - Reedley, California 93654',8.5,sans,435,gray);
    center(page,'This certifies that',11,italic,403,gray);
    const recipient=a.employee_name.toUpperCase();
    center(page,recipient,fit(recipient,bold,500,25,17),bold,368);
    center(page,`California ${a.credential_type} # ${a.license_number}`,10.5,sansBold,347,gray);
    center(page,'has successfully completed',10.5,italic,320,gray);
    page.drawRectangle({x:148,y:264,width:496,height:45,color:navy,borderWidth:1.6,borderColor:gold});
    const topic=ce.topic.toUpperCase();
    center(page,topic,fit(topic,bold,455,19,10),bold,278,rgb(1,1,1));
    const h=Number(ce.ce_hours);
    center(page,`${String(h)} Hour${h===1?'':'s'} of Continuing Education`,13.5,bold,236);
    center(page,`Completed ${displayDate(ce.class_date)}`,11,sansBold,213,gray);
    center(page,'Instructor-Based Continuing Education',9.5,sans,190,gray);
    page.drawLine({start:{x:254,y:170},end:{x:538,y:170},thickness:1,color:gold});
    center(page,`California EMS CE Provider # ${PROVIDER_NUMBER}`,11.5,sansBold,149);
    center(page,'Approved California EMS Continuing Education Provider',8.5,sans,132,gray);
    page.drawImage(signature,{x:488,y:61,width:205,height:61});
    page.drawLine({start:{x:478,y:61},end:{x:706,y:61},thickness:.9,color:gold});
    page.drawText(instructor.name,{x:488,y:45,size:8.5,font:sansBold,color:navy});
    page.drawText(instructor.title,{x:488,y:32,size:8,font:italic,color:gray});
    page.drawText('Instructor / Program Director',{x:87,y:56,size:8,font:sansBold,color:navy});
    page.drawText('Sequoia Safety Council',{x:87,y:43,size:8,font:sans,color:gray});
    center(page,'This document must be maintained for no less than four (4) years.',6.8,sans,27,gray);
  }
  return pdf.save();
}

export default function ContinuingEducationPage(){
  const [employees,setEmployees]=useState<Employee[]>([]); const [classes,setClasses]=useState<CeClass[]>([]);
  const [attendance,setAttendance]=useState<Record<string,Attendance[]>>({}); const [selected,setSelected]=useState<string[]>([]);
  const [date,setDate]=useState(new Date().toISOString().slice(0,10)); const [topic,setTopic]=useState(''); const [hours,setHours]=useState('');
  const [instructorKey,setInstructorKey]=useState<InstructorKey>('jose');
  const [emailOnSave,setEmailOnSave]=useState(false);
  const [showEmployees,setShowEmployees]=useState(false);
  const [status,setStatus]=useState(''); const [saving,setSaving]=useState(false);
  const activeEmployees=useMemo(()=>employees.filter(e=>(e.status??'Active').toLowerCase()!=='removed').sort((a,b)=>employeeName(a).localeCompare(employeeName(b))),[employees]);

  async function accessToken(){
    const {data}=await supabase.auth.getSession();
    const token=data.session?.access_token;
    if(!token) throw new Error('Your session expired. Sign in again.');
    return token;
  }
  async function load(){
    const token=await accessToken();
    const response=await fetch('/api/continuing-education/records',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
    const result=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(result.error||'Unable to load CE records.');
    setEmployees((result.employees??[]) as Employee[]); setClasses((result.classes??[]) as CeClass[]);
    const grouped:Record<string,Attendance[]>={}; for(const a of (result.attendance??[]) as Attendance[]) (grouped[a.class_id]??=[]).push(a); setAttendance(grouped);
  }
  useEffect(()=>{ load().catch(e=>setStatus(`Unable to load CE records: ${e.message}`)); },[]);
  function toggle(id:string){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);}
  async function saveClass(){
    if(!date||!topic.trim()||!hours||Number(hours)<=0){setStatus('Enter the date, CE topic, and CE hours.');return;}
    if(selected.length===0){setStatus('Add at least one employee to the attendance list.');return;}
    setSaving(true); setStatus('Saving CE class...');
    try{
      const token=await accessToken();
      const response=await fetch('/api/continuing-education/records',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({classDate:date,topic:topic.trim(),ceHours:Number(hours),instructorKey,employeeIds:selected})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(result.error||'Unable to save CE class.');
      const data=result.ceClass as CeClass;
      const rows=(result.attendance??[]) as Attendance[];
      let emailSummary='CE class saved.';
      if(emailOnSave){
        setStatus('CE class saved. Emailing certificates...');
        let sent=0,failed=0;
        for(const row of rows){
          const result=await emailCertificate(data,row,true);
          if(result.ok)sent++;else failed++;
        }
        emailSummary=`CE class saved - ${sent} certificate${sent===1?'':'s'} emailed${failed?`, ${failed} could not be sent`:''}.`;
      }
      setTopic('');setHours('');setSelected([]);setShowEmployees(false);setEmailOnSave(false);setStatus(emailSummary);await load();
    }catch(e:any){setStatus(`Unable to save CE class: ${e.message}`);}finally{setSaving(false);}
  }
  async function emailCertificate(ce:CeClass,person:Attendance,quiet=false){
    const current=currentAttendanceCredential(person,employees);
    if(current.credential_type==='Certification Not Set'){
      if(!quiet)setStatus(`Unable to email certificate: EMS certification is not set for ${current.employee_name}.`);
      return {ok:false};
    }
    try{
      if(!quiet)setStatus(`Emailing certificate to ${current.employee_name}...`);
      const bytes=await buildCertificates(ce,[current]);
      const form=new FormData();
      form.append('employeeId',current.employee_id);
      form.append('employeeName',current.employee_name);
      form.append('topic',ce.topic);
      form.append('classDate',ce.class_date);
      form.append('ceHours',String(ce.ce_hours));
      form.append('certificate',new Blob([bytes as BlobPart],{type:'application/pdf'}),`CE-${ce.class_date}-${safeName(ce.topic)}-${safeName(current.employee_name)}.pdf`);
      const token=await accessToken();
      const response=await fetch('/api/continuing-education/email-certificate',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Certificate email failed.');
      if(!quiet)setStatus(`Certificate emailed to ${current.employee_name}.`);
      return {ok:true};
    }catch(e:any){
      if(!quiet)setStatus(`Unable to email certificate to ${current.employee_name}: ${e.message}`);
      return {ok:false};
    }
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
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <label className="text-sm font-semibold text-slate-700">Issuing Instructor
        <select value={instructorKey} onChange={e=>setInstructorKey(e.target.value as InstructorKey)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
          <option value="jose">Jose A. Hernandez Rosas, EMT-P — Operations Supervisor/Program Director</option>
          <option value="heather">Heather Washburn — Operations Supervisor</option>
        </select>
      </label>
      <div className="space-y-2 self-end pb-1">
        <div className="text-sm font-semibold text-slate-600">Instructor Based</div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={emailOnSave} onChange={e=>setEmailOnSave(e.target.checked)} className="h-4 w-4"/>
          Email CE certificates to employees
        </label>
        <div className="text-xs font-normal text-slate-500">Optional. Each employee receives only their own PDF certificate.</div>
      </div>
    </div>
    <div className="mt-5"><button onClick={()=>setShowEmployees(v=>!v)} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white">{showEmployees?'Hide Employees':'Add Employee'} ({selected.length} selected)</button></div>
    {showEmployees&&<div className="mt-4 max-h-80 overflow-auto rounded-xl border border-slate-200"><div className="grid gap-1 p-3 md:grid-cols-2">{activeEmployees.map(e=><label key={e.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50"><input type="checkbox" checked={selected.includes(e.id)} onChange={()=>toggle(e.id)}/><span><span className="font-semibold text-slate-900">{employeeName(e)}</span><span className="ml-2 text-xs text-slate-500">{credential(e).type}{credential(e).number?` · ${credential(e).number}`:' · license # not entered'}</span></span></label>)}</div></div>}
    <button disabled={saving} onClick={saveClass} className="mt-5 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving?'Saving...':'Save CE Class'}</button>{status&&<div className="mt-3 text-sm font-semibold text-slate-700">{status}</div>}</div>
    <div className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-900">CE Class History</h2><div className="mt-4 space-y-4">{classes.length===0?<p className="text-sm text-slate-500">No CE classes have been entered yet.</p>:classes.map(ce=>{const people=attendance[ce.id]??[];return <details key={ce.id} className="rounded-xl border border-slate-200"><summary className="cursor-pointer list-none p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-bold text-slate-900">{displayDate(ce.class_date)} — {ce.topic}</div><div className="mt-1 text-sm text-slate-600">{Number(ce.ce_hours)} Hours · {people.length} Attendee{people.length===1?'':'s'} · Instructor Based · Issued by {ceInstructor(ce.instructor_key).name}</div></div><button type="button" onClick={e=>{e.preventDefault();download(ce,people)}} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Generate All Certificates</button></div></summary><div className="border-t border-slate-200 p-4"><div className="space-y-2">{people.map(a=>{const current=currentAttendanceCredential(a,employees);return <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3"><div><div className="font-semibold">{current.employee_name}</div><div className="text-xs text-slate-500">{current.credential_type}{current.license_number?` · ${current.license_number}`:' · EMS certification/license not set on profile'}</div></div><div className="flex flex-wrap gap-2"><button onClick={()=>download(ce,[a])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Generate Certificate</button><button onClick={()=>emailCertificate(ce,a)} className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">Email Certificate</button></div></div>})}</div></div></details>})}</div></div>
  </div></div>;
}

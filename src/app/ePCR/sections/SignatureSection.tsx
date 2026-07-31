'use client';
import { useEffect, useRef } from 'react';
export type SignatureForm = { imageData: string; signedAt: string; sourceFingerprint: string };
export const createDefaultSignatureForm = (): SignatureForm => ({ imageData: '', signedAt: '', sourceFingerprint: '' });

export default function SignatureSection({ value, onChange, sourceFingerprint }: { value: SignatureForm; onChange: (value: SignatureForm) => void; sourceFingerprint: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null); const drawing = useRef(false);
  useEffect(() => { const c=canvasRef.current; if (!c) return; const ctx=c.getContext('2d'); if (!ctx) return; ctx.clearRect(0,0,c.width,c.height); if(value.imageData){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,c.width,c.height);img.src=value.imageData;} }, [value.imageData]);
  const point=(e: React.PointerEvent<HTMLCanvasElement>)=>{const c=e.currentTarget,r=c.getBoundingClientRect();return {x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};};
  const start=(e:React.PointerEvent<HTMLCanvasElement>)=>{drawing.current=true;e.currentTarget.setPointerCapture(e.pointerId);const p=point(e),ctx=e.currentTarget.getContext('2d');ctx?.beginPath();ctx?.moveTo(p.x,p.y);};
  const move=(e:React.PointerEvent<HTMLCanvasElement>)=>{if(!drawing.current)return;const p=point(e),ctx=e.currentTarget.getContext('2d');if(ctx){ctx.lineWidth=2.5;ctx.lineCap='round';ctx.strokeStyle='#0f172a';ctx.lineTo(p.x,p.y);ctx.stroke();}};
  const end=()=>{drawing.current=false;const c=canvasRef.current;if(c)onChange({imageData:c.toDataURL('image/png'),signedAt:new Date().toISOString(),sourceFingerprint});};
  const invalid=value.imageData && value.sourceFingerprint!==sourceFingerprint;
  return <div className="space-y-4"><p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">I certify that I reviewed this patient care report and that the information documented is accurate and complete to the best of my knowledge.</p>{invalid&&<p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">The PCR was edited after signing. Clear and re-enter the clinician signature.</p>}<div><div className="mb-2 font-bold">Clinician Signature</div><canvas ref={canvasRef} width={900} height={220} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} className="h-44 w-full touch-none rounded-xl border-2 border-slate-300 bg-white" /></div><div className="flex items-center justify-between gap-3"><span className="text-sm text-slate-500">{value.signedAt ? `Signed ${new Date(value.signedAt).toLocaleString()}` : 'Not signed'}</span><button type="button" onClick={()=>onChange(createDefaultSignatureForm())} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold">Clear Signature</button></div></div>;
}

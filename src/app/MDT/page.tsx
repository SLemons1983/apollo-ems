"use client";

import {
  AlertTriangle, Ambulance, ArrowLeft, Check, ChevronRight, CircleDot, Construction,
  Hospital, Map, MapPin, Maximize2, MessageSquareText, Moon, Navigation,
  Phone, Radio, Route, Satellite, Settings, ShieldAlert, Siren, SlidersHorizontal, LocateFixed, Layers,
  RefreshCw, SunMedium, Sunrise, Sunset, UserRoundCheck, Wifi, X, Search
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Status = "Logged In - Not Available"|"Dispatched"|"En Route"|"Hold Back Required"|"Holding Back"|"Scene Secure"|"At Scene"|"Depart Scene"|"At Destination"|"Pending Paperwork"|"Unit Available"|"En Route Post"|"In Area"|"At Post"|"Out of Service";
type Source = "MDT MANUAL"|"GPS AUTO"|"CAD"|"APOLLO";
type MdtOverlay = "call"|"status"|null;
type CrewMember = { employeeId:string; displayName:string };
type RideAlongType = "None"|"Paramedic Intern"|"EMT Student"|"Other Ride Along";
type DeviceAssignment = { id:string; vehicle:string; cadId:string; station:string; level:"SUP"|"ALS"|"BLS"; crewMembers:CrewMember[]; rideAlongType:RideAlongType; rideAlongName?:string; outOfServiceReason?:string };
type Unit = { cadId:string; vehicle:string; station:string; status:Status; lat:number; lng:number; emergency?:boolean };
type Note = { id:number; text:string; author:string; time:string };
type Msg = { id:number|string; from:string; to:string; text:string; time:string };
type ReceivedMsg = { id:string; sender:string; recipient:string; body:string; created_at:string };
type LiveCadCall = { eventType:string; radioIdentifier:string; callNumber:string; emsNumber:string; priority:string; zone?:string; nature:string; facility?:string; address:string; city:string; state:string; zip?:string; suite?:string; holdBackRequired:boolean; dispatchComments?:string; premiseNotes?:string; cautionNotes?:string; status:string; cadTimestamp:string; dispositionCategory?:"Transport"|"Non-Transport"; disposition?:string; dispositionDetail?:string; dispositionTimestamp?:string };
type MdtAlert = { id:string; tone:"call"|"post"|"message"|"comments"|"holdback"|"secure"; eyebrow:string; title:string; body:string };

type NavigationKind = "crew"|"dispatch"|"hospital"|"unit";
type NavigationSession = {
  kind:NavigationKind;
  label:string;
  destination:string|{lat:number;lng:number};
  etaMinutes:number|null;
  distanceMiles:number|null;
  locked:boolean;
  instruction:string;
  maneuver:string;
  stepDistanceMeters:number|null;
};
type CrewPlace = { name:string; address:string; lat:number; lng:number };
type NonTransportDispositionCode = "RMCT"|"DECEASED"|"NO_PATIENT"|"NO_EMS_NEED"|"OTHER_UNIT"|"CARE_TRANSFERRED"|"STANDBY_COMPLETE"|"OTHER";
type NonTransportDispositionOption = { code:NonTransportDispositionCode; label:string; shortLabel:string; guidance:string };
type CallDisposition = { callNumber:string; category:"Transport"|"Non-Transport"; label:string; detail:string; recordedAt:string };


type DestinationNeed = "All Nearby Hospitals"|"General Hospital"|"Stroke Center"|"STEMI / Cardiac"|"Trauma Center"|"Burn Center"|"Pediatric"|"Behavioral / 5150"|"VA";
type HospitalRecord = { name:string; city:string; eta:number|null; needs:DestinationNeed[]; radio?:string; tone?:string; phone?:string; type:string; navQuery?:string; lat?:number; lng?:number; distanceMiles?:number; configured?:boolean };


const VEHICLES = ["300","301","302","303","305","310","315","320","325","330","335"] as const;
const SHARED_RADIOS = ["311","313","316","318"] as const;
const RADIO_STATIONS:Record<string,string>={"311":"Reedley-1","313":"Reedley-2","316":"Parlier","318":"Orange Cove"};

function radioIdentifiersForVehicle(vehicle:string){
  if(["300","301","302","303"].includes(vehicle))return [{cadId:`S${vehicle}`,station:"Supervisor",level:"SUP" as const}];
  const identifiers=[vehicle,...SHARED_RADIOS];
  return identifiers.flatMap(id=>[
    {cadId:id,station:RADIO_STATIONS[id]??"Additional Unit",level:"ALS" as const},
    {cadId:`9${id}`,station:RADIO_STATIONS[id]??"Additional Unit",level:"BLS" as const}
  ]).filter((item,index,array)=>array.findIndex(other=>other.cadId===item.cadId)===index);
}

const DESTINATION_NEEDS: DestinationNeed[] = [
  "All Nearby Hospitals","General Hospital","Stroke Center","STEMI / Cardiac","Trauma Center",
  "Burn Center","Pediatric","Behavioral / 5150","VA"
];

const HOSPITALS: HospitalRecord[] = [
  {name:"Adventist Health Reedley",city:"Reedley",eta:8,needs:["All Nearby Hospitals","General Hospital"],radio:"Med 4",tone:"961",phone:"Agency directory",type:"Receiving Hospital",configured:true},
  {name:"Adventist Health Selma",city:"Selma",eta:18,needs:["All Nearby Hospitals","General Hospital"],radio:"Med 4",tone:"956",phone:"Agency directory",type:"Receiving Hospital",configured:true},
  {name:"Saint Agnes Medical Center",city:"Fresno",eta:31,needs:["All Nearby Hospitals","General Hospital","Stroke Center","STEMI / Cardiac"],radio:"Med 2 / 5",tone:"985",phone:"Agency directory",type:"Primary Stroke / Cardiac",configured:true},
  {name:"Regional Medical Center",city:"Fresno",eta:34,needs:["All Nearby Hospitals","General Hospital","Stroke Center","STEMI / Cardiac","Trauma Center","Burn Center"],radio:"Med 3 / 4 / 7",tone:"983",phone:"Agency directory",type:"Comprehensive Stroke / Trauma / Burn / Cardiac",configured:true},
  {name:"Clovis Community Medical Center",city:"Clovis",eta:36,needs:["All Nearby Hospitals","General Hospital","Stroke Center"],radio:"Med 1 / 5",tone:"945",phone:"Agency directory",type:"Primary Stroke Center",configured:true},
  {name:"Valley Children's Hospital",city:"Madera",eta:42,needs:["All Nearby Hospitals","Pediatric"],radio:"Med 5 / 7",tone:"981",phone:"Agency directory",type:"Pediatric Specialty",configured:true},
  {name:"Veterans Administration",city:"Fresno",eta:33,needs:["All Nearby Hospitals","VA"],radio:"Med 6",tone:"969",phone:"241-3600",type:"VA Emergency Department",configured:true}
];

const statusOptions: Status[] = ["Logged In - Not Available","Unit Available","En Route","Holding Back","At Scene","Depart Scene","At Destination","Pending Paperwork","En Route Post","In Area","At Post"];
const delayOptions = ["Traffic","Road Construction","Weather","Road Closure","Railroad Crossing","Access Problem","Law Enforcement","Fire Activity","Mechanical","Hospital Delay","Other"];
const NON_TRANSPORT_DISPOSITIONS: NonTransportDispositionOption[] = [
  {code:"RMCT",label:"RMCT — Refusal of Medical Care and/or Transportation",shortLabel:"RMCT",guidance:"Follow CCEMSA Policies 544 and 546: assess decisional capacity, explain risks, complete required Base Hospital contact when applicable, and document the refusal in the ePCR."},
  {code:"DECEASED",label:"11-44 — Deceased at Scene",shortLabel:"11-44 / Deceased",guidance:"Follow CCEMSA Policy 551 and applicable resuscitation policies. Notify law enforcement or the Coroner as required and protect the scene."},
  {code:"NO_PATIENT",label:"Canceled — No Patient Found",shortLabel:"No Patient Found",guidance:"Document the search, information available to the crew, and why no patient contact occurred."},
  {code:"NO_EMS_NEED",label:"Canceled — No Illness, Injury, or EMS Need",shortLabel:"No EMS Need",guidance:"Document the assessment or circumstances supporting that no EMS care or transportation was needed."},
  {code:"OTHER_UNIT",label:"Canceled — Other EMS Unit Handling",shortLabel:"Other Unit Handling",guidance:"Identify the unit or agency assuming the incident and document the transfer of responsibility."},
  {code:"CARE_TRANSFERRED",label:"Patient Care Transferred at Scene",shortLabel:"Care Transferred",guidance:"Identify the receiving unit, agency, or qualified provider and document the patient-care handoff."},
  {code:"STANDBY_COMPLETE",label:"Standby Complete — No Patient Transport",shortLabel:"Standby Complete",guidance:"Document the standby assignment and the circumstances under which the unit was released."},
  {code:"OTHER",label:"Other Non-Transport Disposition",shortLabel:"Other",guidance:"Enter a clear operational reason below and complete all required ePCR documentation."}
];

function ambulanceMarkerContent(radioIdentifier:string,mine:boolean,emergency:boolean,heading:number|null=0){
  const wrapper=document.createElement("div");
  wrapper.className=`ambulanceMapMarker${mine?" mine":""}${emergency?" emergency":""}`;
  wrapper.style.setProperty("--ambulance-heading",`${Math.round(heading??0)}deg`);
  const body=document.createElement("div");
  body.className="ambulanceMarkerBody";
  const cab=document.createElement("div");cab.className="ambulanceMarkerCab";
  const roof=document.createElement("div");roof.className="ambulanceMarkerRoof";
  const number=document.createElement("strong");number.textContent=radioIdentifier.replace("Medic ","");
  roof.appendChild(number);body.append(cab,roof);wrapper.appendChild(body);
  return wrapper;
}

const OFF_ROUTE_CONFIRM_MS=8000;
const REROUTE_COOLDOWN_MS=20000;
const MIN_OFF_ROUTE_METERS=65;
const MAX_REROUTE_GPS_ACCURACY_METERS=50;

function pt(){return new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date())}
function displayStatus(status:Status,assignment:DeviceAssignment|null){
  if(!assignment)return "Not Logged In";
  if(status==="Unit Available")return "Available";
  if(status==="Dispatched")return "Unit Dispatched";
  if(status==="En Route Post")return "Available - En Route Post";
  if(status==="In Area")return "Available - In Area";
  if(status==="At Post")return "Available - At Post";
  if(status==="Out of Service")return `Out of Service${assignment.outOfServiceReason?` - ${assignment.outOfServiceReason}`:""}`;
  return status;
}
function mapsUrl(lat:number,lng:number){return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
function point(value:any){
  const source=value?.latLng??value?.location??value;
  const lat=typeof source?.lat==="function"?source.lat():source?.lat;
  const lng=typeof source?.lng==="function"?source.lng():source?.lng;
  return typeof lat==="number"&&typeof lng==="number"?{lat,lng}:null;
}
function metersBetween(a:{lat:number;lng:number},b:{lat:number;lng:number}){
  const radius=6371000,toRad=(degrees:number)=>degrees*Math.PI/180;
  const dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng);
  const h=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2*radius*Math.asin(Math.sqrt(h));
}
function metersFromSegment(position:{lat:number;lng:number},start:{lat:number;lng:number},end:{lat:number;lng:number}){
  const metersPerDegreeLat=111320;
  const metersPerDegreeLng=metersPerDegreeLat*Math.cos(position.lat*Math.PI/180);
  const ax=(start.lng-position.lng)*metersPerDegreeLng,ay=(start.lat-position.lat)*metersPerDegreeLat;
  const bx=(end.lng-position.lng)*metersPerDegreeLng,by=(end.lat-position.lat)*metersPerDegreeLat;
  const dx=bx-ax,dy=by-ay;
  const lengthSquared=dx*dx+dy*dy;
  const t=lengthSquared===0?0:Math.max(0,Math.min(1,-((ax*dx)+(ay*dy))/lengthSquared));
  return Math.hypot(ax+(t*dx),ay+(t*dy));
}
function metersFromRoute(position:{lat:number;lng:number},path:{lat:number;lng:number}[]){
  if(path.length===0)return null;
  if(path.length===1)return metersBetween(position,path[0]);
  let closest=Number.POSITIVE_INFINITY;
  for(let index=1;index<path.length;index++)closest=Math.min(closest,metersFromSegment(position,path[index-1],path[index]));
  return Number.isFinite(closest)?closest:null;
}
function bearingBetween(a:{lat:number;lng:number},b:{lat:number;lng:number}){
  const toRad=(degrees:number)=>degrees*Math.PI/180,toDeg=(radians:number)=>radians*180/Math.PI;
  const lat1=toRad(a.lat),lat2=toRad(b.lat),deltaLng=toRad(b.lng-a.lng);
  const y=Math.sin(deltaLng)*Math.cos(lat2);
  const x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(deltaLng);
  return (toDeg(Math.atan2(y,x))+360)%360;
}
function stepDistanceLabel(meters:number|null){
  if(meters===null)return "";
  if(meters<305){const feet=meters*3.28084;return `${Math.max(25,Math.round(feet/25)*25)} ft`}
  return `${(meters/1609.344).toFixed(1)} mi`;
}

export default function MDT(){
  const[clock,setClock]=useState("--:--:--");
  const[assignment,setAssignment]=useState<DeviceAssignment|null>(null);
  const[loginOpen,setLoginOpen]=useState(false);
  const[selectedVehicle,setSelectedVehicle]=useState("310"); const[selectedRadioId,setSelectedRadioId]=useState("310"); const[loginError,setLoginError]=useState("");
  const[employees,setEmployees]=useState<CrewMember[]>([]); const[crewIds,setCrewIds]=useState(["","","",""]); const[rideAlongType,setRideAlongType]=useState<RideAlongType>("None"); const[rideAlongName,setRideAlongName]=useState(""); const[canManageDevice,setCanManageDevice]=useState(false); const[refreshing,setRefreshing]=useState(false);
  const[units,setUnits]=useState<Unit[]>([]);
 const availableRadioIdentifiers=useMemo(()=>radioIdentifiersForVehicle(selectedVehicle),[selectedVehicle]);
  const[status,setStatus]=useState<Status>("Logged In - Not Available"); const[autoStatus,setAutoStatus]=useState(true); const[holdBack,setHoldBack]=useState(false);
  const[displayMode,setDisplayMode]=useState<"Auto"|"Day"|"Night">("Auto"); const[autoNight,setAutoNight]=useState(false); const[brightness,setBrightness]=useState(100); const[blackout,setBlackout]=useState(false);
  const[fullMap,setFullMap]=useState(false); const[mdtOverlay,setMdtOverlay]=useState<MdtOverlay>(null); const[readCard,setReadCard]=useState<{title:string;body:string}|null>(null); const[statusModal,setStatusModal]=useState(false);
  const[dispositionModal,setDispositionModal]=useState(false); const[selectedNonTransport,setSelectedNonTransport]=useState<NonTransportDispositionCode|null>(null); const[nonTransportNote,setNonTransportNote]=useState("");
  const[callDisposition,setCallDisposition]=useState<CallDisposition|null>(null);
  const[destModal,setDestModal]=useState(false); const[destinationNeed,setDestinationNeed]=useState<DestinationNeed>("All Nearby Hospitals");
  const[nearbyHospitals,setNearbyHospitals]=useState<HospitalRecord[]>([]); const[hospitalsLoading,setHospitalsLoading]=useState(false); const[hospitalsError,setHospitalsError]=useState("");
  const[selectedHospital,setSelectedHospital]=useState<HospitalRecord|null>(null); const[transportMode,setTransportMode]=useState<"Code 2"|"Code 3">("Code 2");
  const[statTransport,setStatTransport]=useState(false); const[patientCount,setPatientCount]=useState(1); const[callInDone,setCallInDone]=useState(false);
  const[responseNotes,setResponseNotes]=useState<Note[]>([]);
  const[noteModal,setNoteModal]=useState(false); const[newNote,setNewNote]=useState("");
  const[msgModal,setMsgModal]=useState(false); const[msgTo,setMsgTo]=useState("All Units"); const[msgText,setMsgText]=useState(""); const[messages,setMessages]=useState<Msg[]>([]);
  const[delayModal,setDelayModal]=useState(false); const[delay,setDelay]=useState(""); const[delayNote,setDelayNote]=useState(""); const[activeDelay,setActiveDelay]=useState<string|null>(null);
  const[selectedUnit,setSelectedUnit]=useState<Unit|null>(null); const[emergency,setEmergency]=useState(false); const[emergencyHold,setEmergencyHold]=useState(false); const[emergencyProgress,setEmergencyProgress]=useState(0);
  const emergencyTimer=useRef<number|null>(null); const emergencyTick=useRef<number|null>(null);
  const googleMapRef=useRef<HTMLDivElement|null>(null); const googleMapObjectRef=useRef<any>(null); const googleMarkersRef=useRef<globalThis.Map<string,{marker:any;content:HTMLElement}>>(new globalThis.Map()); const sceneMarkerRef=useRef<any|null>(null); const trafficLayerRef=useRef<any>(null);
  const routePolylinesRef=useRef<any[]>([]); const routeMarkersRef=useRef<any[]>([]); const activeRouteRef=useRef<any|null>(null); const activeRoutePathRef=useRef<{lat:number;lng:number}[]>([]);
  const[googleReady,setGoogleReady]=useState(false); const[mapGeneration,setMapGeneration]=useState(0); const[googleMapError,setGoogleMapError]=useState(""); const[trafficEnabled,setTrafficEnabled]=useState(true);
  const[devicePosition,setDevicePosition]=useState<{lat:number;lng:number}|null>(null); const[gpsAccuracy,setGpsAccuracy]=useState<number|null>(null); const[deviceHeading,setDeviceHeading]=useState<number|null>(null);
  const[navigation,setNavigation]=useState<NavigationSession|null>(null); const[previousCrewNavigation,setPreviousCrewNavigation]=useState<NavigationSession|null>(null); const[rerouting,setRerouting]=useState(false);
  const[crewPlace,setCrewPlace]=useState<CrewPlace|null>(null); const[routeError,setRouteError]=useState(""); const[searchError,setSearchError]=useState(""); const[searchQuery,setSearchQuery]=useState(""); const[searchPredictions,setSearchPredictions]=useState<any[]>([]); const[searchLoading,setSearchLoading]=useState(false);
  const[events,setEvents]=useState<{id:number;time:string;label:string;source:Source}[]>([]);
  const[liveCall,setLiveCall]=useState<LiveCadCall>({eventType:"NONE",radioIdentifier:"",callNumber:"",emsNumber:"—",priority:"—",nature:"No Active Call",address:"No incident assigned",city:"",state:"",holdBackRequired:false,status:"Unit Available",cadTimestamp:""});
  const[integrationState,setIntegrationState]=useState<"LOCAL"|"CONNECTED"|"ERROR">("LOCAL");
  const[alertQueue,setAlertQueue]=useState<MdtAlert[]>([]); const seenAlertKeysRef=useRef<Set<string>>(new Set()); const acknowledgedAlertKeysRef=useRef<Set<string>>(new Set());
  const pendingStatusRef=useRef<{status:Status;expiresAt:number}|null>(null); const navigationStepsRef=useRef<any[]>([]); const navigationStepIndexRef=useRef(0);
  const rerouteControlRef=useRef({offRouteSince:0,lastRecalculatedAt:0,recalculating:false});
  const[sceneCoordinate,setSceneCoordinate]=useState<{lat:number;lng:number}|null>(null); const autoSceneCallRef=useRef("");

  useEffect(()=>{const tick=()=>{setClock(pt());const h=Number(new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",hour:"2-digit",hour12:false}).format(new Date()));setAutoNight(h>=19||h<7)};tick();const t=window.setInterval(tick,1000);return()=>window.clearInterval(t)},[]);
  useEffect(()=>{
    try{acknowledgedAlertKeysRef.current=new Set(JSON.parse(window.localStorage.getItem("apollo-mdt-acknowledged-alerts")??"[]"))}catch{}
    try{
      const saved=JSON.parse(window.localStorage.getItem("apollo-mdt-call-disposition")??"null") as CallDisposition|null;
      if(saved?.callNumber)setCallDisposition(saved);
    }catch{}
  },[]);

  useEffect(()=>{
    try{
      if(callDisposition)window.localStorage.setItem("apollo-mdt-call-disposition",JSON.stringify(callDisposition));
      else window.localStorage.removeItem("apollo-mdt-call-disposition");
    }catch{}
  },[callDisposition]);

  function rowToAssignment(row:any):DeviceAssignment{return {id:row.id,vehicle:row.physical_vehicle,cadId:row.radio_identifier,station:row.station,level:row.level,crewMembers:row.crew_members??[],rideAlongType:row.ride_along_type??"None",rideAlongName:row.ride_along_name??"",outOfServiceReason:row.out_of_service_reason??""}}
  function rowsToUnits(rows:any[]):Unit[]{return rows.map((row,index)=>({cadId:row.radio_identifier,vehicle:row.physical_vehicle,station:row.station,status:row.status,lat:row.latitude??36.5965+(index*.003),lng:row.longitude??-119.4512-(index*.003),emergency:Boolean(row.emergency_active)}))}
  function enqueueAlert(key:string,alert:Omit<MdtAlert,"id">){
    if(seenAlertKeysRef.current.has(key)||acknowledgedAlertKeysRef.current.has(key))return;
    seenAlertKeysRef.current.add(key);
    setBlackout(false);
    setAlertQueue(current=>[...current,{...alert,id:key}]);
  }
  function acknowledgeAlert(){
    const current=alertQueue[0];
    if(!current)return;
    acknowledgedAlertKeysRef.current.add(current.id);
    try{
      const acknowledged=Array.from(acknowledgedAlertKeysRef.current).slice(-150);
      window.localStorage.setItem("apollo-mdt-acknowledged-alerts",JSON.stringify(acknowledged));
    }catch{}
    setAlertQueue(queue=>queue.slice(1));
  }

  async function refreshMdt(){
    setRefreshing(true);
    try{
      const response=await fetch("/api/mdt/bootstrap",{cache:"no-store"});
      const data=await response.json();
      if(!response.ok||!data.ok)throw new Error(data.error||"Unable to refresh MDT");
      setEmployees(data.employees??[]);setCanManageDevice(Boolean(data.canManageDevice));setUnits(rowsToUnits(data.sessions??[]));
      const savedId=window.localStorage.getItem("apollo-mdt-session-id");
      const row=(data.sessions??[]).find((item:any)=>item.id===savedId);
      if(row){const next=rowToAssignment(row);setAssignment(next);setStatus(row.status);setSelectedVehicle(next.vehicle);setSelectedRadioId(next.cadId);setCrewIds([...next.crewMembers.map(member=>member.employeeId),"","",""].slice(0,4));setRideAlongType(next.rideAlongType);setRideAlongName(next.rideAlongName??"");}
      else{
        window.localStorage.removeItem("apollo-mdt-session-id");
        setAssignment(null);setStatus("Logged In - Not Available");setLoginOpen(false);
        setLiveCall({eventType:"NONE",radioIdentifier:"",callNumber:"",emsNumber:"—",priority:"—",nature:"No Active Call",address:"No incident assigned",city:"",state:"",holdBackRequired:false,status:"Logged In - Not Available",cadTimestamp:""});
        setHoldBack(false);setSelectedHospital(null);setCallInDone(false);setCallDisposition(null);
      }
      setIntegrationState("CONNECTED");
    }catch{setIntegrationState("ERROR");}
    finally{setRefreshing(false)}
  }

  useEffect(()=>{void refreshMdt()},[]);

  useEffect(()=>{
    if(!assignment?.cadId)return;
    const poll=async()=>{
      try{
        const r=await fetch(`/api/integration/cad/state?radioIdentifier=${encodeURIComponent(assignment.cadId)}`,{cache:"no-store"});
        const data=await r.json();
        if(!data.ok){setIntegrationState("ERROR");return}
        setIntegrationState("CONNECTED");
        if(data.units){
          const nextUnits=rowsToUnits(data.units);
          setUnits(current=>JSON.stringify(current)===JSON.stringify(nextUnits)?current:nextUnits);
        }
        if(data.session){
          const nextAssignment=rowToAssignment(data.session);
          setAssignment(current=>JSON.stringify(current)===JSON.stringify(nextAssignment)?current:nextAssignment);
          const serverStatus=data.session.status as Status;
          const pending=pendingStatusRef.current;
          if(pending?.status===serverStatus){pendingStatusRef.current=null;setStatus(serverStatus)}
          else if(!pending||pending.expiresAt<=Date.now()){pendingStatusRef.current=null;setStatus(serverStatus)}
        }
        if(data.call){
          setCallDisposition(current=>{
            if(data.call.disposition)return {callNumber:data.call.callNumber,category:data.call.dispositionCategory??"Non-Transport",label:data.call.disposition,detail:data.call.dispositionDetail??"",recordedAt:data.call.dispositionTimestamp??data.call.cadTimestamp};
            return current?.callNumber===data.call.callNumber?current:null;
          });
          setLiveCall((previous)=>{
            const isNewCall=previous.callNumber!==data.call.callNumber;
            if(isNewCall){
              const isPost=data.call.eventType==="POST_ASSIGNED";
              log(isPost?`NEW POST ASSIGNMENT — ${data.call.nature}`:`NEW CAD CALL — EMS ${data.call.emsNumber}`,"CAD");
              enqueueAlert(`call:${data.call.callNumber}`,{
                tone:isPost?"post":"call",eyebrow:isPost?"NEW POST ASSIGNMENT":"NEW CAD CALL",
                title:isPost?data.call.nature:`EMS ${data.call.emsNumber} · Priority ${data.call.priority}`,
                body:`${data.call.address}, ${data.call.city}`
              });
            }else if((previous.dispatchComments??"")!==(data.call.dispatchComments??"")&&data.call.dispatchComments?.trim()){
              enqueueAlert(`comments:${data.call.callNumber}:${data.call.dispatchComments}`,{
                tone:"comments",eyebrow:"DISPATCH COMMENTS UPDATED",title:`EMS ${data.call.emsNumber}`,
                body:data.call.dispatchComments
              });
            }
            if(!previous.holdBackRequired&&data.call.holdBackRequired){
              enqueueAlert(`holdback:${data.call.callNumber}:${data.call.cadTimestamp||"active"}`,{
                tone:"holdback",eyebrow:"SAFETY ALERT",title:"HOLD BACK REQUIRED",
                body:"Do not enter the scene until Dispatch advises that the unit is cleared to proceed."
              });
            }
            if(previous.callNumber===data.call.callNumber&&previous.holdBackRequired&&!data.call.holdBackRequired){
              enqueueAlert(`secure:${data.call.callNumber}:${data.call.cadTimestamp||"active"}`,{
                tone:"secure",eyebrow:"DISPATCH SAFETY UPDATE",title:"SCENE SECURE",
                body:"Dispatch has cleared the Hold Back requirement. Proceed according to current conditions and agency policy."
              });
            }
            return data.call;
          });
          setHoldBack(Boolean(data.call.holdBackRequired));
        }else if(["Logged In - Not Available","Unit Available","En Route Post","In Area","At Post","Out of Service"].includes(data.session?.status)){
          setLiveCall({eventType:"NONE",radioIdentifier:assignment.cadId,callNumber:"",emsNumber:"—",priority:"—",nature:"No Active Call",address:"No incident assigned",city:"",state:"",holdBackRequired:false,status:data.session?.status??"Unit Available",cadTimestamp:""});
          setHoldBack(false);setSelectedHospital(null);setCallInDone(false);setCallDisposition(null);
        }
        for(const message of (data.messages??[]) as ReceivedMsg[]){
          enqueueAlert(`message:${message.id}`,{
            tone:"message",eyebrow:"MESSAGE RECEIVED",title:`From ${message.sender}`,
            body:message.body
          });
          setMessages(current=>current.some(item=>String(item.id)===message.id)?current:[{
            id:message.id,from:message.sender,to:message.recipient,
            text:message.body,time:new Date(message.created_at).toLocaleTimeString("en-US",{hour12:false})
          },...current]);
        }
      }catch{setIntegrationState("ERROR")}
    };
    void poll();
    const timer=window.setInterval(poll,1200);
    return()=>window.clearInterval(timer);
  },[assignment?.cadId]);


  const night=displayMode==="Night"||(displayMode==="Auto"&&autoNight);
  const hasCadAssignment=Boolean(liveCall.callNumber);
  const hasActiveCall=hasCadAssignment&&liveCall.eventType!=="POST_ASSIGNED";
  const nextStatus=useMemo(()=>{if(status==="Dispatched")return {label:"En Route" as Status,note:"Begin response"};if(status==="Hold Back Required")return {label:"Holding Back" as Status,note:"Acknowledge and hold back"};if(status==="En Route")return holdBack?{label:"Holding Back" as Status,note:"Hold Back Required by Dispatch"}:{label:"At Scene" as Status,note:autoStatus?"GPS automation armed":"Manual status available"};if(status==="Holding Back"||status==="Scene Secure")return {label:"At Scene" as Status,note:"Use when entering the scene"};if(status==="At Scene")return {label:"Depart Scene" as Status,note:"Choose transport or non-transport"};if(status==="Depart Scene")return {label:"At Destination" as Status,note:"GPS arrival automation available"};if(status==="At Destination")return {label:"Pending Paperwork" as Status,note:"Complete documentation"};if(status==="Pending Paperwork")return {label:"Unit Available" as Status,note:"Return unit to service"};if(status==="Unit Available"&&liveCall.eventType==="POST_ASSIGNED")return {label:"En Route Post" as Status,note:"Begin post move"};if(status==="En Route Post")return {label:"In Area" as Status,note:"Arrived in response area"};if(status==="In Area")return {label:"At Post" as Status,note:"Arrived at assigned post"};return null},[status,holdBack,autoStatus,liveCall.eventType]);
  const mapUnits=useMemo(()=>units.map(u=>u.cadId===assignment?.cadId?{...u,status,emergency,lat:devicePosition?.lat??u.lat,lng:devicePosition?.lng??u.lng}:u),[units,assignment?.cadId,status,emergency,devicePosition?.lat,devicePosition?.lng]);
  const myUnit=mapUnits.find(u=>u.cadId===assignment?.cadId)??{cadId:"",vehicle:"",station:"",status:"Unit Available" as Status,lat:36.5965,lng:-119.4512};

  useEffect(()=>{
    if(!navigator.geolocation)return;
    const id=navigator.geolocation.watchPosition(
      pos=>{setDevicePosition({lat:pos.coords.latitude,lng:pos.coords.longitude});setGpsAccuracy(Math.round(pos.coords.accuracy));if(typeof pos.coords.heading==="number"&&!Number.isNaN(pos.coords.heading))setDeviceHeading(pos.coords.heading)},
      ()=>{},
      {enableHighAccuracy:true,maximumAge:3000,timeout:10000}
    );
    return()=>navigator.geolocation.clearWatch(id);
  },[]);

  useEffect(()=>{
    if(!assignment?.cadId||!devicePosition)return;
    const send=()=>{void fetch("/api/integration/mdt/send-location",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({radioIdentifier:assignment.cadId,latitude:devicePosition.lat,longitude:devicePosition.lng,timestamp:new Date().toISOString()})})};
    send(); const timer=window.setInterval(send,10000); return()=>window.clearInterval(timer);
  },[assignment?.cadId,devicePosition?.lat,devicePosition?.lng]);

  useEffect(()=>{
    const key=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if(!key){setGoogleMapError("Google Maps API key not configured");return}
    setGoogleReady(false);
    let cancelled=false;
    const callbackName="__apolloGoogleMapsReady";

    const init=async()=>{
      try{
        const g=(window as any).google;
        if(cancelled||!googleMapRef.current)return;
        if(!g?.maps){
          throw new Error("google.maps is unavailable after Maps JavaScript API callback");
        }

        const {Map,RenderingType}=await g.maps.importLibrary("maps");
        if(cancelled||!googleMapRef.current)return;

        const map=new Map(googleMapRef.current,{
          center:{lat:myUnit.lat,lng:myUnit.lng},
          zoom:navigation?18.5:15,
          mapId:"DEMO_MAP_ID",
          renderingType:RenderingType.VECTOR,
          tilt:navigation?60:35,
          heading:deviceHeading??0,
          tiltInteractionEnabled:true,
          headingInteractionEnabled:true,
          disableDefaultUI:true,
          zoomControl:true,
          streetViewControl:false,
          fullscreenControl:false,
          mapTypeControl:false,
          gestureHandling:"greedy"
        });

        googleMapObjectRef.current=map;
        if(navigation)map.moveCamera({center:{lat:myUnit.lat,lng:myUnit.lng},zoom:18.5,tilt:60,heading:deviceHeading??0});
        setMapGeneration(current=>current+1);
        const traffic=new g.maps.TrafficLayer();
        trafficLayerRef.current=traffic;
        if(trafficEnabled)traffic.setMap(map);

        setGoogleReady(true);
        setGoogleMapError("");
        console.info("[Apollo MDT] Google Maps initialized.");
      }catch(err){
        console.error("[Apollo MDT] Google Maps initialization error:",err);
        setGoogleReady(false);
        setGoogleMapError("Google Maps failed to initialize");
      }
    };

    const w=window as any;

    if(w.google?.maps?.importLibrary){
      void init();
      return()=>{cancelled=true};
    }

    w[callbackName]=()=>{
      void init();
      try{delete w[callbackName]}catch{}
    };

    const existing=document.getElementById("apollo-google-maps-script") as HTMLScriptElement|null;
    if(existing){
      // If a script exists from Fast Refresh, give the API a short chance to finish.
      const waitForGoogle=window.setInterval(()=>{
        if(w.google?.maps?.importLibrary){
          window.clearInterval(waitForGoogle);
          void init();
        }
      },100);
      const timeout=window.setTimeout(()=>{
        window.clearInterval(waitForGoogle);
        if(!w.google?.maps?.importLibrary&&!cancelled){
          console.error("[Apollo MDT] Existing Google Maps script did not become ready.");
          setGoogleMapError("Google Maps script did not become ready");
        }
      },10000);
      return()=>{
        cancelled=true;
        window.clearInterval(waitForGoogle);
        window.clearTimeout(timeout);
      };
    }

    const script=document.createElement("script");
    script.id="apollo-google-maps-script";
    script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=${callbackName}`;
    script.async=true;
    script.defer=true;
    script.onerror=(event)=>{
      console.error("[Apollo MDT] Google Maps script load error:",event);
      setGoogleMapError("Google Maps script failed to load");
    };
    document.head.appendChild(script);

    return()=>{
      cancelled=true;
    };
  },[assignment?.cadId,fullMap]);



  useEffect(()=>{
    if(!googleReady){setSearchPredictions([]);return}
    const q=searchQuery.trim();
    if(q.length<2){setSearchPredictions([]);setSearchLoading(false);return}
    let cancelled=false;
    const timer=window.setTimeout(async()=>{
      try{
        setSearchLoading(true);
        setSearchError("");
        const g=(window as any).google;
        const {AutocompleteSuggestion,AutocompleteSessionToken}=await g.maps.importLibrary("places");
        const token=new AutocompleteSessionToken();
        const request={
          input:q,
          includedRegionCodes:["us"],
          locationBias:{radius:50000,center:{lat:myUnit.lat,lng:myUnit.lng}},
          sessionToken:token
        };
        const response=await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        if(cancelled)return;
        setSearchPredictions(response.suggestions||[]);
      }catch(err){
        console.error("[Apollo MDT] Autocomplete data error:",err);
        if(!cancelled){
          setSearchPredictions([]);
          setSearchError("Google Places search failed. Confirm Places API (New) is enabled.");
        }
      }finally{
        if(!cancelled)setSearchLoading(false);
      }
    },250);
    return()=>{cancelled=true;window.clearTimeout(timer)}
  },[googleReady,searchQuery,myUnit.lat,myUnit.lng]);

  async function chooseSearchPrediction(suggestion:any){
    try{
      const prediction=suggestion.placePrediction;
      if(!prediction)return;
      const place=prediction.toPlace();
      await place.fetchFields({fields:["displayName","formattedAddress","location"]});
      if(!place.location)return;
      const lat=typeof place.location.lat==="function"?place.location.lat():place.location.lat;
      const lng=typeof place.location.lng==="function"?place.location.lng():place.location.lng;
      const selected={
        name:place.displayName||prediction.text?.toString?.()||"Selected place",
        address:place.formattedAddress||"",
        lat,lng
      };
      setCrewPlace(selected);
      setSearchQuery(selected.name);
      setSearchPredictions([]);
      setSearchError("");
      const map=googleMapObjectRef.current;
      if(map){map.panTo({lat,lng});map.setZoom(15)}
    }catch(err){
      console.error("[Apollo MDT] Place selection error:",err);
      setSearchError("Unable to load selected place details.");
    }
  }

  useEffect(()=>{
    const map=googleMapObjectRef.current;
    const g=(window as any).google;
    if(!googleReady||!map||!g?.maps)return;
    let active=true;
    const renderMarkers=async()=>{
      try{
        const {AdvancedMarkerElement}=await g.maps.importLibrary("marker");
        if(!active)return;
        const currentIds=new Set(mapUnits.map(unit=>unit.cadId));
        for(const [cadId,entry] of googleMarkersRef.current){
          if(!currentIds.has(cadId)){entry.marker.map=null;googleMarkersRef.current.delete(cadId)}
        }
        for(const u of mapUnits){
          const mine=u.cadId===assignment?.cadId;
          const existing=googleMarkersRef.current.get(u.cadId);
          if(existing){
            existing.marker.map=map;
            existing.marker.position={lat:u.lat,lng:u.lng};
            existing.marker.title=`${u.cadId} — ${u.status}${u.emergency?" — EMERGENCY":""}`;
            existing.content.className=`ambulanceMapMarker${mine?" mine":""}${u.emergency?" emergency":""}`;
            existing.content.style.setProperty("--ambulance-heading",`${Math.round(mine?(deviceHeading??0):0)}deg`);
            continue;
          }
          const content=ambulanceMarkerContent(u.cadId,mine,Boolean(u.emergency),mine?deviceHeading:0);
          const marker=new AdvancedMarkerElement({
            map,
            position:{lat:u.lat,lng:u.lng},
            title:`${u.cadId} — ${u.status}${u.emergency?" — EMERGENCY":""}`,
            content,
            gmpClickable:true
          });
          marker.addListener("click",()=>setSelectedUnit(current=>mapUnits.find(item=>item.cadId===u.cadId)??current));
          googleMarkersRef.current.set(u.cadId,{marker,content});
        }
        if(liveCall.callNumber&&sceneCoordinate){
          if(sceneMarkerRef.current){sceneMarkerRef.current.map=map;sceneMarkerRef.current.position=sceneCoordinate;sceneMarkerRef.current.title=`EMS ${liveCall.emsNumber} Scene — ${liveCall.address}`}
          else{
            const scene=document.createElement("div");scene.className="sceneMapMarker";scene.textContent="!";
            sceneMarkerRef.current=new AdvancedMarkerElement({map,position:sceneCoordinate,title:`EMS ${liveCall.emsNumber} Scene — ${liveCall.address}`,content:scene});
          }
        }else if(sceneMarkerRef.current){
          sceneMarkerRef.current.map=null;sceneMarkerRef.current=null;
        }
      }catch{
        setGoogleMapError("Google Maps markers failed to load");
      }
    };
    void renderMarkers();
    return()=>{active=false}
  },[googleReady,mapGeneration,mapUnits,assignment?.cadId,deviceHeading,liveCall.callNumber,liveCall.emsNumber,liveCall.address,sceneCoordinate]);

  useEffect(()=>{
    const traffic=trafficLayerRef.current;
    const map=googleMapObjectRef.current;
    if(!traffic||!map)return;
    traffic.setMap(trafficEnabled?map:null);
  },[trafficEnabled]);

  function centerGoogleMap(){
    const map=googleMapObjectRef.current;
    if(map)map.panTo({lat:myUnit.lat,lng:myUnit.lng});
  }

  function clearRouteRendering(){
    for(const p of routePolylinesRef.current){p.setMap?.(null)}
    for(const m of routeMarkersRef.current){m.map=null}
    routePolylinesRef.current=[];
    routeMarkersRef.current=[];
  }

  function renderActiveRoute(map:any,fit=true){
    const route=activeRouteRef.current;
    if(!route||!map)return;
    clearRouteRendering();
    const polylines=route.createPolylines();
    for(const polyline of polylines){polyline.setMap(map)}
    routePolylinesRef.current=polylines;
    if(fit&&route.viewport)map.fitBounds(route.viewport,48);
  }

  useEffect(()=>{
    if(!googleReady||!navigation||!activeRouteRef.current||!googleMapObjectRef.current)return;
    renderActiveRoute(googleMapObjectRef.current,true);
  },[googleReady,mapGeneration,fullMap]);

  useEffect(()=>{
    if(!navigation||!devicePosition||!googleMapObjectRef.current)return;
    const map=googleMapObjectRef.current;
    const routeDistance=metersFromRoute(devicePosition,activeRoutePathRef.current);
    const control=rerouteControlRef.current;
    const now=Date.now();
    if(routeDistance!==null&&gpsAccuracy!==null&&gpsAccuracy<=MAX_REROUTE_GPS_ACCURACY_METERS){
      const offRouteThreshold=Math.max(MIN_OFF_ROUTE_METERS,gpsAccuracy*2);
      if(routeDistance>offRouteThreshold){
        if(!control.offRouteSince)control.offRouteSince=now;
        const confirmedOffRoute=now-control.offRouteSince>=OFF_ROUTE_CONFIRM_MS;
        const cooldownComplete=now-control.lastRecalculatedAt>=REROUTE_COOLDOWN_MS;
        if(confirmedOffRoute&&cooldownComplete&&!control.recalculating){
          control.recalculating=true;
          control.offRouteSince=0;
          control.lastRecalculatedAt=now;
          setRerouting(true);
          log(`Off route by ${Math.round(routeDistance)} m — recalculating`,"GPS AUTO");
          void startEmbeddedNavigation(navigation.kind,navigation.label,navigation.destination,true,true);
        }
      }else if(routeDistance<offRouteThreshold*.7){
        control.offRouteSince=0;
      }
    }else{
      control.offRouteSince=0;
    }
    const steps=navigationStepsRef.current;
    if(!steps.length){map.moveCamera({center:devicePosition,zoom:18.5,tilt:60,heading:deviceHeading??map.getHeading?.()??0});return}
    let index=Math.min(navigationStepIndexRef.current,steps.length-1);
    let destination=point(steps[index]?.endLocation);
    let remaining=destination?metersBetween(devicePosition,destination):null;
    if(remaining!==null&&remaining<35&&index<steps.length-1){
      index+=1;navigationStepIndexRef.current=index;destination=point(steps[index]?.endLocation);
      remaining=destination?metersBetween(devicePosition,destination):null;
    }
    const step=steps[index];
    const instruction=step?.instructions||"Continue on the highlighted route";
    const maneuver=step?.maneuver||"STRAIGHT";
    const rounded=remaining===null?null:Math.round(remaining);
    const routeHeading=destination?bearingBetween(devicePosition,destination):null;
    map.moveCamera({center:devicePosition,zoom:18.5,tilt:60,heading:deviceHeading??routeHeading??map.getHeading?.()??0});
    const futureMeters=steps.slice(index+1).reduce((total:number,item:any)=>total+(typeof item?.distanceMeters==="number"?item.distanceMeters:0),0);
    const remainingMeters=(remaining??(typeof step?.distanceMeters==="number"?step.distanceMeters:0))+futureMeters;
    const distanceMiles=Math.round((remainingMeters/1609.344)*10)/10;
    setNavigation(current=>!current||(
      current.instruction===instruction&&current.maneuver===maneuver&&current.stepDistanceMeters===rounded&&current.distanceMiles===distanceMiles
    )?current:{...current,instruction,maneuver,stepDistanceMeters:rounded,distanceMiles,
      etaMinutes:current.distanceMiles&&current.etaMinutes
        ?Math.max(1,Math.round(current.etaMinutes*(distanceMiles/current.distanceMiles)))
        :current.etaMinutes});
  },[devicePosition?.lat,devicePosition?.lng,deviceHeading,gpsAccuracy,navigation?.label,mapGeneration]);

  function endNavigation(){
    clearRouteRendering();
    activeRouteRef.current=null;
    activeRoutePathRef.current=[];
    navigationStepsRef.current=[];
    navigationStepIndexRef.current=0;
    rerouteControlRef.current={offRouteSince:0,lastRecalculatedAt:0,recalculating:false};
    setRerouting(false);
    setNavigation(null);
    setRouteError("");
  }

  useEffect(()=>{
    if(!googleReady||!liveCall.callNumber||liveCall.eventType==="POST_ASSIGNED"){
      setSceneCoordinate(null);autoSceneCallRef.current="";return;
    }
    let cancelled=false;
    const resolveScene=async()=>{
      try{
        const g=(window as any).google;
        const {Geocoder}=await g.maps.importLibrary("geocoding");
        const geocoder=new Geocoder();
        const address=`${liveCall.address}, ${liveCall.city}, ${liveCall.state} ${liveCall.zip??""}`;
        const response=await geocoder.geocode({address});
        const location=point(response.results?.[0]?.geometry?.location);
        if(!cancelled&&location)setSceneCoordinate(location);
      }catch(err){console.error("[Apollo MDT] Scene geocoding error:",err)}
    };
    void resolveScene();
    return()=>{cancelled=true};
  },[googleReady,liveCall.callNumber,liveCall.eventType,liveCall.address,liveCall.city,liveCall.state,liveCall.zip]);

  useEffect(()=>{
    if(!autoStatus||holdBack||status!=="En Route"||!hasActiveCall||!devicePosition||!sceneCoordinate)return;
    if(gpsAccuracy===null||gpsAccuracy>50)return;
    if(metersBetween(devicePosition,sceneCoordinate)>30.48)return;
    if(autoSceneCallRef.current===liveCall.callNumber)return;
    autoSceneCallRef.current=liveCall.callNumber;
    setStatus("At Scene");log("At Scene — within 100 ft of incident","GPS AUTO");void sendStatus("At Scene","GPS AUTO");
  },[autoStatus,holdBack,status,hasActiveCall,devicePosition?.lat,devicePosition?.lng,gpsAccuracy,sceneCoordinate?.lat,sceneCoordinate?.lng,liveCall.callNumber]);

  useEffect(()=>{
    if(!destModal||!googleReady)return;
    let cancelled=false;
    const loadNearbyHospitals=async()=>{
      try{
        setHospitalsLoading(true);setHospitalsError("");
        const g=(window as any).google;
        const {Place,SearchNearbyRankPreference}=await g.maps.importLibrary("places");
        const center=devicePosition??{lat:myUnit.lat,lng:myUnit.lng};
        const {places}=await Place.searchNearby({
          fields:["displayName","location","formattedAddress"],
          locationRestriction:{center,radius:50000},
          includedPrimaryTypes:["hospital"],
          maxResultCount:20,
          rankPreference:SearchNearbyRankPreference.DISTANCE
        });
        if(cancelled)return;
        const results=(places??[]).flatMap((place:any)=>{
          const location=point(place.location);if(!location)return [];
          const address=place.formattedAddress??"";
          const city=(address.split(",")[1]??"Nearby").trim();
          return [{name:place.displayName??"Hospital",city,eta:null,needs:["All Nearby Hospitals","General Hospital"] as DestinationNeed[],type:"Google Places hospital",navQuery:address,lat:location.lat,lng:location.lng,distanceMiles:Math.round((metersBetween(center,location)/1609.344)*10)/10}];
        });
        setNearbyHospitals(results);
      }catch(err){
        console.error("[Apollo MDT] Nearby hospital search error:",err);
        if(!cancelled)setHospitalsError("Nearby hospital search is unavailable. Configured CCEMSA destinations are still shown.");
      }finally{if(!cancelled)setHospitalsLoading(false)}
    };
    void loadNearbyHospitals();
    return()=>{cancelled=true};
  },[destModal,googleReady,devicePosition?.lat,devicePosition?.lng,myUnit.lat,myUnit.lng]);

  async function startEmbeddedNavigation(kind:NavigationKind,label:string,destination:string|{lat:number;lng:number},force=false,isReroute=false){
    if(!googleReady||!googleMapObjectRef.current){
      setRouteError("Google Maps is not ready for embedded navigation.");
      if(isReroute){rerouteControlRef.current.recalculating=false;setRerouting(false)}
      return false;
    }
    const priority:Record<NavigationKind,number>={crew:1,unit:2,hospital:3,dispatch:4};
    if(navigation&&!force&&priority[kind]<priority[navigation.kind]){
      setRouteError(`${navigation.label} has navigation priority.`);
      return false;
    }
    if(!isReroute&&kind==="dispatch"&&navigation?.kind==="crew"){
      setPreviousCrewNavigation(navigation);
    }
    try{
      setRouteError("");
      const g=(window as any).google;
      const {Route}=await g.maps.importLibrary("routes");
      const origin=devicePosition??{lat:myUnit.lat,lng:myUnit.lng};
      const {routes}=await Route.computeRoutes({
        origin,
        destination,
        travelMode:"DRIVING",
        routingPreference:"TRAFFIC_AWARE",
        fields:["path","distanceMeters","durationMillis","viewport","legs"]
      });
      if(!routes?.length)throw new Error("No route returned");
      const route=routes[0];
      activeRouteRef.current=route;
      const rawPath=Array.isArray(route.path)?route.path:Array.from(route.path??[]);
      activeRoutePathRef.current=rawPath.map((item:any)=>point(item)).filter((item:any):item is {lat:number;lng:number}=>Boolean(item));
      navigationStepsRef.current=route.legs?.flatMap((leg:any)=>leg.steps??[])??[];
      navigationStepIndexRef.current=0;
      renderActiveRoute(googleMapObjectRef.current,!isReroute);
      const etaMinutes=typeof route.durationMillis==="number"?Math.max(1,Math.round(route.durationMillis/60000)):null;
      const distanceMiles=typeof route.distanceMeters==="number"?Math.round((route.distanceMeters/1609.344)*10)/10:null;
      const firstStep=navigationStepsRef.current[0];
      setNavigation({kind,label,destination,etaMinutes,distanceMiles,locked:kind==="dispatch"||kind==="hospital",instruction:firstStep?.instructions||"Proceed to the highlighted route",maneuver:firstStep?.maneuver||"STRAIGHT",stepDistanceMeters:typeof firstStep?.distanceMeters==="number"?firstStep.distanceMeters:null});
      googleMapObjectRef.current.moveCamera({center:origin,zoom:18.5,tilt:60,heading:deviceHeading??0});
      log(isReroute?`Route recalculated → ${label}`:`${kind.toUpperCase()} navigation → ${label}`,isReroute?"GPS AUTO":"APOLLO");
      return true;
    }catch(err){
      console.error("[Apollo MDT] Route computation error:",err);
      setRouteError(isReroute?"Unable to recalculate the route. Apollo will try again if the unit remains off route.":"Unable to calculate embedded route. Make sure Routes API is enabled.");
      return false;
    }finally{
      if(isReroute){
        rerouteControlRef.current.recalculating=false;
        setRerouting(false);
      }
    }
  }

  function startDispatchNavigation(label:string,destination:string|{lat:number;lng:number}){
    void startEmbeddedNavigation("dispatch",label,destination,true);
  }

  function startCrewNavigation(){
    if(!crewPlace)return;
    void startEmbeddedNavigation("crew",crewPlace.name,{lat:crewPlace.lat,lng:crewPlace.lng});
  }

  function resumePreviousCrewRoute(){
    if(!previousCrewNavigation)return;
    void startEmbeddedNavigation(previousCrewNavigation.kind,previousCrewNavigation.label,previousCrewNavigation.destination,true);
    setPreviousCrewNavigation(null);
  }
  const filteredHospitals=useMemo(()=>{
    const configured=HOSPITALS.filter(h=>h.needs.includes(destinationNeed));
    if(destinationNeed!=="All Nearby Hospitals")return configured.sort((a,b)=>(a.eta??999)-(b.eta??999));
    const names=new Set(configured.map(item=>item.name.toLowerCase()));
    return [...configured,...nearbyHospitals.filter(item=>!names.has(item.name.toLowerCase()))]
      .sort((a,b)=>(a.distanceMiles??a.eta??999)-(b.distanceMiles??b.eta??999));
  },[destinationNeed,nearbyHospitals]);
  const callInActive=status==="Depart Scene"&&selectedHospital&&navigation?.kind==="hospital"&&navigation.etaMinutes!==null&&navigation.etaMinutes<=12&&!callInDone;

  function log(label:string,source:Source){setEvents(e=>[{id:Date.now(),time:pt(),label,source},...e])}
  async function sendStatus(next:Status,source:Source="MDT MANUAL",disposition?:{dispositionCategory:"Transport"|"Non-Transport";disposition:string;dispositionCode?:string;dispositionDetail?:string;dispositionTimestamp:string}){
    if(!assignment?.cadId)return;
    pendingStatusRef.current={status:next,expiresAt:Date.now()+12000};
    try{await fetch("/api/integration/mdt/send-status",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({radioIdentifier:assignment.cadId,callNumber:liveCall.callNumber,emsNumber:liveCall.emsNumber,status:next,timestamp:new Date().toISOString(),source,latitude:devicePosition?.lat,longitude:devicePosition?.lng,...disposition})})}catch{}
  }
  function setManual(next:Status){setStatus(next);log(next,"MDT MANUAL");void sendStatus(next,"MDT MANUAL");setStatusModal(false);if(blackout)setBlackout(false);if(next==="Unit Available"){setLiveCall({eventType:"NONE",radioIdentifier:assignment?.cadId??"",callNumber:"",emsNumber:"—",priority:"—",nature:"No Active Call",address:"No incident assigned",city:"",state:"",holdBackRequired:false,status:"Unit Available",cadTimestamp:""});setHoldBack(false);setSelectedHospital(null);setCallInDone(false);setCallDisposition(null);if(navigation?.locked)endNavigation()}else if(next==="Dispatched"||next==="En Route"||next==="En Route Post"){startDispatchNavigation(liveCall.eventType==="POST_ASSIGNED"?liveCall.nature:`EMS ${liveCall.emsNumber} Scene`,`${liveCall.address}, ${liveCall.city}, ${liveCall.state} ${liveCall.zip??""}`)}}
  function confirmDepart(){
    if(!selectedHospital)return;
    const recordedAt=new Date().toISOString();
    const detail=`${selectedHospital.name} · ${transportMode}${statTransport?" · STAT":""} · ${patientCount} patient${patientCount===1?"":"s"}`;
    setCallDisposition({callNumber:liveCall.callNumber,category:"Transport",label:"Transport",detail,recordedAt});
    setStatus("Depart Scene");setCallInDone(false);log(`Depart Scene → ${detail}`,"MDT MANUAL");
    void sendStatus("Depart Scene","MDT MANUAL",{dispositionCategory:"Transport",disposition:"Transport",dispositionCode:"TRANSPORT",dispositionDetail:detail,dispositionTimestamp:recordedAt});
    setDestModal(false);void startEmbeddedNavigation("hospital",selectedHospital.name,selectedHospital.lat!==undefined&&selectedHospital.lng!==undefined?{lat:selectedHospital.lat,lng:selectedHospital.lng}:selectedHospital.navQuery||`${selectedHospital.name}, ${selectedHospital.city}, CA`,true);
  }
  function confirmNonTransport(){
    const option=NON_TRANSPORT_DISPOSITIONS.find(item=>item.code===selectedNonTransport);
    const note=nonTransportNote.trim();
    if(!option||(option.code==="OTHER"&&!note))return;
    const recordedAt=new Date().toISOString();
    setCallDisposition({callNumber:liveCall.callNumber,category:"Non-Transport",label:option.label,detail:note,recordedAt});
    setStatus("Pending Paperwork");
    log(`Non-transport → ${option.label}${note?` · ${note}`:""}`,"MDT MANUAL");
    void sendStatus("Pending Paperwork","MDT MANUAL",{dispositionCategory:"Non-Transport",disposition:option.label,dispositionCode:option.code,dispositionDetail:note,dispositionTimestamp:recordedAt});
    setDispositionModal(false);setSelectedNonTransport(null);setNonTransportNote("");
    if(navigation)endNavigation();
  }
  function advance(){if(!nextStatus)return;if(status==="At Scene"){setDispositionModal(true);return}setManual(nextStatus.label)}
  async function login(){
    setLoginError("");
    if(!canManageDevice){setLoginError("An active ApolloEMS supervisor account is required to assign this MDT.");return}
    const radio=availableRadioIdentifiers.find(x=>x.cadId===selectedRadioId);if(!radio){setLoginError("Select a valid radio identifier.");return}
    const selectedCrew=crewIds.filter(Boolean).map(id=>employees.find(employee=>employee.employeeId===id)).filter(Boolean) as CrewMember[];
    if(selectedCrew.length<1){setLoginError("Crew Member 1 is required.");return}
    if(new Set(selectedCrew.map(member=>member.employeeId)).size!==selectedCrew.length){setLoginError("The same employee cannot be assigned more than once.");return}
    const response=await fetch("/api/mdt/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:assignment?.id,physicalVehicle:selectedVehicle,radioIdentifier:selectedRadioId,station:radio.station,level:radio.level,crewMembers:selectedCrew,rideAlongType,rideAlongName,status:assignment?.id?status:"Logged In - Not Available",loggedOnAt:undefined})});
    const data=await response.json();if(!response.ok||!data.ok){setLoginError(data.error||"Unable to assign MDT");return}
    const a=rowToAssignment(data.session);window.localStorage.setItem("apollo-mdt-session-id",a.id);setAssignment(a);setStatus(data.session.status);setLoginOpen(false);log(`Device assigned: Vehicle ${a.vehicle} / ${a.cadId}`,"APOLLO");void refreshMdt();
  }
  async function clearPairing(){
    if(assignment?.id)await fetch(`/api/mdt/session?id=${encodeURIComponent(assignment.id)}`,{method:"DELETE"});
    window.localStorage.removeItem("apollo-mdt-session-id");setAssignment(null);setStatus("Logged In - Not Available");setLoginOpen(false);setLiveCall({eventType:"NONE",radioIdentifier:"",callNumber:"",emsNumber:"—",priority:"—",nature:"No Active Call",address:"No incident assigned",city:"",state:"",holdBackRequired:false,status:"Logged In - Not Available",cadTimestamp:""});setHoldBack(false);setSelectedHospital(null);setCallInDone(false);setCallDisposition(null);void refreshMdt();
  }
  function emergencyDown(){if(emergencyTimer.current)window.clearTimeout(emergencyTimer.current);if(emergencyTick.current)window.clearInterval(emergencyTick.current);setEmergencyHold(true);setEmergencyProgress(0);const start=Date.now();emergencyTick.current=window.setInterval(()=>setEmergencyProgress(Math.min(100,(Date.now()-start)/30)),50);emergencyTimer.current=window.setTimeout(()=>{if(emergencyTick.current)window.clearInterval(emergencyTick.current);setEmergencyHold(false);setEmergencyProgress(100);setEmergency(true);setBlackout(false);log("EMERGENCY ACTIVATED","MDT MANUAL");if(assignment?.cadId){void fetch("/api/integration/mdt/send-emergency",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({radioIdentifier:assignment.cadId,callNumber:liveCall.callNumber,active:true,timestamp:new Date().toISOString(),latitude:devicePosition?.lat,longitude:devicePosition?.lng})})}},3000)}
  function emergencyUp(){if(emergencyTimer.current)window.clearTimeout(emergencyTimer.current);if(emergencyTick.current)window.clearInterval(emergencyTick.current);emergencyTimer.current=null;emergencyTick.current=null;if(!emergency)setEmergencyProgress(0);setEmergencyHold(false)}
  function addNote(){if(!newNote.trim())return;setResponseNotes(n=>[{id:Date.now(),text:newNote.trim(),author:assignment?.cadId||"MDT",time:`Today ${pt()}`},...n]);setNewNote("");setNoteModal(false)}
  async function sendMsg(){
    const text=msgText.trim();if(!text||!assignment?.cadId)return;
    const response=await fetch("/api/mdt/messages",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sender:assignment.cadId,recipient:msgTo,body:text})});
    const data=await response.json();
    if(!response.ok||!data.ok)return;
    setMessages(current=>[{id:data.message.id,from:data.message.sender,to:data.message.recipient,text:data.message.body,time:new Date(data.message.created_at).toLocaleTimeString("en-US",{hour12:false})},...current]);
    setMsgText("");setMsgModal(false);
  }
  function saveDelay(){if(!delay)return;const text=`${delay}${delayNote?` — ${delayNote}`:""}`;setActiveDelay(text);log(`Delay: ${text}`,"MDT MANUAL");setDelay("");setDelayNote("");setDelayModal(false)}
  function read(title:string,body:string){setReadCard({title,body})}

  const map=<div className="mapSurface">
    <div ref={googleMapRef} className={`googleMap ${googleReady?"ready":""}`}/>
    {!googleReady&&<><div className="mapGrid"/><div className="road r1">Manning Ave</div><div className="road r2">G Street</div><div className="routeLine a"/><div className="routeLine b"/><div className="scene"><MapPin size={17}/>SCENE</div>
      {mapUnits.map((u,i)=><button key={u.cadId} className={`unitMarker u${i} ${u.emergency?"unitEmergency":""} ${u.cadId===assignment?.cadId?"mine":""}`} onClick={()=>setSelectedUnit(u)}><Ambulance size={17}/><b>{u.cadId.replace("Medic ","")}</b><small>{u.emergency?"EMERGENCY":u.status}</small></button>)}
    </>}
    {navigation&&<div className={`driverGuidance ${rerouting?"rerouting":""}`}><div className="maneuverIcon">{rerouting?<RefreshCw size={30}/>:<Navigation size={30}/>}</div><div className="guidanceCopy"><span>{rerouting?"RECALCULATING ROUTE":stepDistanceLabel(navigation.stepDistanceMeters)}</span><strong>{rerouting?"Finding the best new route…":navigation.instruction}</strong><small>{navigation.label}</small></div><div className="guidanceEta"><strong>{navigation.etaMinutes??"—"}</strong><span>MIN</span><small>{navigation.distanceMiles!==null?`${navigation.distanceMiles} mi`:""}</small></div></div>}
    <div className="mapTop">
      <div className="mapTopRoute">{rerouting?<RefreshCw size={15}/>:<Navigation size={15}/>}<span>{rerouting?"Recalculating route":navigation?navigation.label:`${liveCall.address}, ${liveCall.city}`}</span></div>
      {navigation&&<div className="navMetrics"><strong>{navigation.etaMinutes!==null?`${navigation.etaMinutes} min`:"ETA —"}</strong><span>{navigation.distanceMiles!==null?`${navigation.distanceMiles} mi`:""}</span></div>}
      <strong>{googleReady?"GOOGLE MAPS":"MAP FALLBACK"}</strong>
    </div>
    {googleMapError&&<div className="mapApiNotice"><AlertTriangle size={14}/>{googleMapError}</div>}
    <div className={`mapSearch ${navigation?.locked?"locked":""}`}>
      <Search size={15}/>
      <input
        value={searchQuery}
        onChange={e=>{setSearchQuery(e.target.value);setCrewPlace(null)}}
        placeholder={navigation?.locked?`Active ${navigation.kind} route`:"Search Google Maps"}
        disabled={!!navigation?.locked}
        aria-label="Search Google Maps"
      />
      {searchLoading&&<span className="searchBusy">Searching…</span>}
      {navigation?.locked&&<span className="searchLock">Route locked</span>}
    </div>
    {searchPredictions.length>0&&!navigation?.locked&&<div className="searchPredictions">
      {searchPredictions.slice(0,6).map((item:any,index:number)=>{
        const p=item.placePrediction;
        const main=p?.mainText?.toString?.()||p?.text?.toString?.()||"Place";
        const secondary=p?.secondaryText?.toString?.()||"";
        return <button key={`${main}-${index}`} onClick={()=>void chooseSearchPrediction(item)}>
          <MapPin size={14}/><div><strong>{main}</strong>{secondary&&<span>{secondary}</span>}</div>
        </button>
      })}
    </div>}
    {searchError&&<div className="searchError"><AlertTriangle size={13}/>{searchError}</div>}
    {crewPlace&&!navigation?.locked&&<div className="crewPlaceCard"><div><strong>{crewPlace.name}</strong><span>{crewPlace.address}</span></div><button onClick={startCrewNavigation}><Navigation size={14}/>Start Navigation</button><button className="clearPlace" onClick={()=>setCrewPlace(null)}><X size={14}/></button></div>}
    {routeError&&<div className="routeError"><AlertTriangle size={13}/>{routeError}</div>}
    {previousCrewNavigation&&!hasActiveCall&&!navigation&&<button className="resumeRoute" onClick={resumePreviousCrewRoute}><Route size={14}/>Resume {previousCrewNavigation.label}</button>}
    <div className="mapTools">
      <button onClick={centerGoogleMap} disabled={!googleReady}><LocateFixed size={15}/>Center on My Unit</button>
      <button className={trafficEnabled?"active":""} onClick={()=>setTrafficEnabled(!trafficEnabled)} disabled={!googleReady}><Layers size={15}/>Traffic</button>
    </div>
    <div className="mapBottom">
      <button onClick={()=>setFullMap(true)}><Map size={16}/>Full Screen Map</button>
      {navigation
        ? <button className="endNavBtn" onClick={endNavigation}><X size={16}/>End Navigation</button>
        : hasCadAssignment&&<button onClick={()=>startDispatchNavigation(liveCall.eventType==="POST_ASSIGNED"?liveCall.nature:`EMS ${liveCall.emsNumber} Scene`,`${liveCall.address}, ${liveCall.city}, ${liveCall.state} ${liveCall.zip??""}`)}><Route size={16}/>{liveCall.eventType==="POST_ASSIGNED"?"Start Post Navigation":"Start Scene Navigation"}</button>}
    </div>
  </div>;

  if(blackout)return <main className="mdt-root blackout" onClick={()=>setBlackout(false)}><Moon size={28}/><strong>BLACKOUT</strong><span>Tap anywhere to restore display</span><small>{assignment?.cadId||"UNASSIGNED"} · {displayStatus(status,assignment)} · {clock}</small></main>;
  const activeAlert=alertQueue[0]??null;
  const alertBanner=activeAlert&&<div className="mdtAlertBackdrop"><section className={`mdtAlert ${activeAlert.tone}`} role="alertdialog" aria-live="assertive" aria-modal="true"><div className="mdtAlertIcon">{activeAlert.tone==="holdback"||activeAlert.tone==="secure"?<ShieldAlert size={44}/>:activeAlert.tone==="message"?<MessageSquareText size={44}/>:<Siren size={44}/>}</div><span>{activeAlert.eyebrow}</span><h2>{activeAlert.title}</h2><p>{activeAlert.body}</p><button autoFocus onClick={acknowledgeAlert}><Check size={19}/>ACKNOWLEDGE{alertQueue.length>1?` · ${alertQueue.length-1} MORE`:""}</button></section></div>;

  if(fullMap)return <main className={`mdt-root fullMap ${night?"night":""}`}><div className="statusHeader"><span>CURRENT STATUS</span><strong>{displayStatus(status,assignment)}</strong></div><button className="mapReturn" onClick={()=>setFullMap(false)}><ArrowLeft size={19}/>RETURN TO MDT</button>{map}<div className="floatBar"><div><strong>{assignment?.cadId||"UNASSIGNED"}</strong><span>{navigation?`${navigation.label} · ${navigation.etaMinutes??"—"} min`:hasCadAssignment?`${liveCall.eventType==="POST_ASSIGNED"?"POST":"EMS "+liveCall.emsNumber} · ${displayStatus(status,assignment)}`:displayStatus(status,assignment)}</span></div>{navigation&&<button onClick={endNavigation}>END NAVIGATION</button>}<button onClick={()=>setStatusModal(true)}>{displayStatus(status,assignment)}</button></div>{alertBanner}</main>;

  return <main className={`mdt-root shell ${night?"night":"day"}`} style={{filter:`brightness(${brightness/100})`}}>
    <div className="statusHeader"><span>CURRENT STATUS</span><strong>{displayStatus(status,assignment)}</strong></div><header><div className="identity"><div className="logo"><Radio size={20}/></div><div><span>APOLLO MDT</span><strong>{assignment?.cadId||"DEVICE UNASSIGNED"}</strong><small>{assignment?`Vehicle ${assignment.vehicle} · ${assignment.level} · ${assignment.station}`:"Supervisor pairing required"}</small></div></div>
      <div className="center"><span><Wifi size={13}/>CAD {integrationState}</span><span><Satellite size={13}/>GPS {gpsAccuracy!==null?`${Math.round(gpsAccuracy*3.28084)} ft`:"WAIT"}</span><strong>{clock}</strong></div>
      <div className="controls"><div className="modes"><button className={displayMode==="Auto"?"active":""} onClick={()=>setDisplayMode("Auto")}>AUTO</button><button className={displayMode==="Day"?"active":""} onClick={()=>setDisplayMode("Day")}><Sunrise size={13}/>DAY</button><button className={displayMode==="Night"?"active":""} onClick={()=>setDisplayMode("Night")}><Sunset size={13}/>NIGHT</button></div><button onClick={()=>setBlackout(true)}><Moon size={15}/>Blackout</button><label><SunMedium size={15}/><input type="range" min="35" max="100" value={brightness} onChange={e=>setBrightness(+e.target.value)}/></label><button onClick={()=>void refreshMdt()} disabled={refreshing}><RefreshCw size={15}/>{refreshing?"Refreshing":"Refresh"}</button><button onClick={()=>setLoginOpen(true)} disabled={!canManageDevice}><Settings size={15}/>Device</button></div>
      <div className="emergencyZone"><button className={`emergencyBtn ${emergencyHold?"holding":""}`} onPointerDown={emergencyDown} onPointerUp={emergencyUp} onPointerLeave={emergencyUp} onPointerCancel={emergencyUp} style={{"--hold":`${emergencyProgress}%`} as React.CSSProperties}><Siren size={16}/>HOLD 3 SEC</button></div>
    </header>
    {callInActive&&<section className="callInBanner"><div><Radio size={20}/><span>CALL IN REMINDER · ETA {navigation!.etaMinutes} MIN</span></div><strong>{selectedHospital!.name}</strong><small>{selectedHospital!.configured?`Radio: ${selectedHospital!.radio} · Tone ${selectedHospital!.tone} · Phone: ${selectedHospital!.phone}`:"Use the receiving facility's current contact procedure."}</small><button onClick={()=>setCallInDone(true)}><Check size={15}/>Call-In Complete</button></section>}

    <section className="grid carplayGrid">
      <aside className={`call carplayCallPanel ${mdtOverlay==="call"?"open":""} ${hasCadAssignment?"hasCall":""}`}>{!hasCadAssignment?<div className="noCadData"><Radio size={28}/><strong>NO CAD ASSIGNMENT</strong><span>Google Maps and location search remain available.</span></div>:<><div className="callHead"><span className="p">{liveCall.eventType==="POST_ASSIGNED"?"POST":`P${liveCall.priority}`}</span><div><small>{liveCall.eventType==="POST_ASSIGNED"?"DEPLOYMENT POST":`EMS ${liveCall.emsNumber}`}</small><strong>{liveCall.nature}</strong></div><span className="chip">{displayStatus(status,assignment)}</span></div><div className="callNo">{liveCall.callNumber}</div>
        <div className="addr"><MapPin size={17}/><div><strong>{liveCall.address}</strong><span>{liveCall.city}, {liveCall.state} {liveCall.zip??""}</span></div></div>
        <button className="readBox" onClick={()=>read(`DISPATCH COMMENTS — EMS ${liveCall.emsNumber}`,liveCall.dispatchComments||"No dispatch comments.")}><div><label>DISPATCH COMMENTS</label><span><Maximize2 size={12}/>Tap to enlarge</span></div><p>{liveCall.dispatchComments||"No dispatch comments."}</p></button>
        <button className="readBox" onClick={()=>read(`PREMISE / CAUTION — EMS ${liveCall.emsNumber}`,[liveCall.premiseNotes,liveCall.cautionNotes].filter(Boolean).join("\n\n")||"No premise or caution notes.")}><div><label>PREMISE / CAUTION</label><span><Maximize2 size={12}/>Tap to enlarge</span></div><p>{[liveCall.premiseNotes,liveCall.cautionNotes].filter(Boolean).join(" · ")||"No premise or caution notes."}</p></button>
        <button className="readBox response" onClick={()=>read("RESPONSE NOTES",responseNotes.map(n=>`${n.text}\n— ${n.author} · ${n.time}`).join("\n\n"))}><div><label>RESPONSE NOTES · APOLLO INTERNAL</label><span><Maximize2 size={12}/>Tap to enlarge</span></div><p>{responseNotes[0]?.text||"No response notes for this location."}</p></button><button className="tiny" onClick={()=>setNoteModal(true)}>+ Add Response Note</button>
        {callDisposition?.callNumber===liveCall.callNumber&&<div className="dispositionNotice"><Check size={16}/><div><strong>{callDisposition.category.toUpperCase()} DISPOSITION</strong><span>{callDisposition.label}{callDisposition.detail?` · ${callDisposition.detail}`:""}</span></div></div>}
        {activeDelay&&<div className="delay"><Construction size={16}/><div><strong>ACTIVE DELAY</strong><span>{activeDelay}</span></div><button onClick={()=>setActiveDelay(null)}><X size={14}/></button></div>}
        <div className="aci"><ShieldAlert size={16}/><div><strong>ACI READY</strong><span>No active clinical or communications advisory.</span></div></div>
        {status==="Out of Service"&&<div className="oosNotice"><AlertTriangle size={16}/><div><strong>OUT OF SERVICE — CAD CONTROLLED</strong><span>{assignment?.outOfServiceReason||"Reason not provided"}</span></div></div>}
        <div className="auto"><div><Satellite size={16}/><div><strong>GPS Status Automation</strong><span>Manual override always available</span></div><button className={autoStatus?"tog on":"tog"} onClick={()=>setAutoStatus(!autoStatus)}><i/></button></div><small>{autoStatus?"At Scene geofence armed · target radius 100 ft":"Automatic status changes disabled"}</small>{holdBack&&<div className="hold active"><ShieldAlert size={13}/>HOLD BACK REQUIRED — CAD</div>}</div></>}
      </aside>

      <section className="map carplayMap">{map}</section>
      <aside className={`actions carplayActions ${mdtOverlay==="status"?"open":""}`}><section className="current"><label>CURRENT STATUS</label><strong>{displayStatus(status,assignment)}</strong>{nextStatus&&<button className={holdBack&&status==="En Route"?"next holdback":"next"} onClick={advance}><span>NEXT STATUS</span><b>{status==="At Scene"?"SELECT DISPOSITION":displayStatus(nextStatus.label,assignment).toUpperCase()}</b><small>{nextStatus.note}</small></button>}<button onClick={()=>setStatusModal(true)} disabled={!assignment||status==="Out of Service"}><SlidersHorizontal size={15}/>{status==="Out of Service"?"CAD controls this status":"Manual Status Override"}</button></section>
        <button className="big blue" onClick={()=>status==="At Scene"?setDispositionModal(true):setDestModal(true)} disabled={!hasActiveCall||status==="Out of Service"}><Navigation size={20}/><div><strong>{status==="At Scene"?"Patient Disposition":"Destination / Depart Scene"}</strong><span>{status==="At Scene"?"Choose transport or non-transport outcome":"Select destination need and transport details"}</span></div></button>
        <button className="big" onClick={()=>setDelayModal(true)}><Construction size={20}/><div><strong>Report Delay</strong><span>Traffic · weather · road construction · access</span></div></button>
        <button className="big" onClick={()=>setMsgModal(true)}><MessageSquareText size={20}/><div><strong>Messages</strong><span>Apollo internal · Dispatch ↔ MDT ↔ MDT</span></div></button>
        <button className="big"><Hospital size={20}/><div><strong>Hospitals</strong><span>Radio · tone · phone · destination info</span></div></button>
        <section className="history"><label>RECENT STATUS HISTORY</label>{events.slice(0,5).map(e=><div key={e.id}><strong>{e.time}</strong><span>{e.label}<small>{e.source}</small></span></div>)}</section>
      </aside>
    </section>

    <footer className="carplayDock"><button className={mdtOverlay==="call"?"active":""} onClick={()=>setMdtOverlay(current=>current==="call"?null:"call")}><Map size={16}/>Call / Map</button><button onClick={()=>{setMdtOverlay(null);setMsgModal(true)}}><MessageSquareText size={16}/>Messages</button><button><Hospital size={16}/>Hospitals</button><button onClick={()=>{setMdtOverlay(null);setDelayModal(true)}}><Construction size={16}/>Delay</button><button className={mdtOverlay==="status"?"active":""} onClick={()=>setMdtOverlay(current=>current==="status"?null:"status")} disabled={status==="Out of Service"}><SlidersHorizontal size={16}/>Status</button></footer>

    {selectedUnit&&<div className="unitCard"><button className="close" onClick={()=>setSelectedUnit(null)}><X size={16}/></button><div className={selectedUnit.emergency?"unitTitle emergency":"unitTitle"}><Ambulance size={22}/><div><strong>{selectedUnit.cadId}</strong><span>Vehicle {selectedUnit.vehicle} · {selectedUnit.status}</span></div></div>{selectedUnit.emergency&&<div className="emergencyLabel"><AlertTriangle size={16}/>UNIT EMERGENCY ACTIVE</div>}<button onClick={()=>{setMsgTo(selectedUnit.cadId);setMsgModal(true);setSelectedUnit(null)}}><MessageSquareText size={15}/>Message Unit</button><a className={hasActiveCall&&!selectedUnit.emergency?"disabled":""} href={hasActiveCall&&!selectedUnit.emergency?undefined:mapsUrl(selectedUnit.lat,selectedUnit.lng)} target="_blank"><Navigation size={15}/>Navigate to Unit</a>{hasActiveCall&&!selectedUnit.emergency&&<small>Navigation disabled while committed to an active call.</small>}</div>}

    {loginOpen&&<div className="backdrop"><section className="modal pairing"><div className="modalHead"><div><span>SUPERVISOR DEVICE ASSIGNMENT</span><h2>Assign this MDT and Crew</h2><p>Pair this device to a physical vehicle, radio identifier, and active ApolloEMS employees.</p></div>{assignment&&<button onClick={()=>setLoginOpen(false)}><X/></button>}</div><div className="pairingGrid">
<label>Vehicle<span>Physical vehicle containing this MDT.</span><select value={selectedVehicle} onChange={e=>{const vehicle=e.target.value;setSelectedVehicle(vehicle);setSelectedRadioId(radioIdentifiersForVehicle(vehicle)[0]?.cadId??"")}} disabled={Boolean(assignment)}>{VEHICLES.map(vehicle=><option key={vehicle} value={vehicle}>Vehicle {vehicle}</option>)}</select></label>
<label>Radio Identifier<span>CAD routing identity used to send calls to this MDT.</span><select value={selectedRadioId} onChange={e=>setSelectedRadioId(e.target.value)}>{availableRadioIdentifiers.map(r=><option key={r.cadId} value={r.cadId}>{r.cadId} — {r.level} — {r.station}</option>)}</select></label>
</div><div className="crewGrid">{crewIds.map((id,index)=><label key={index}>Crew Member {index+1}{index===0?" — Required":" — Optional"}<select value={id} onChange={e=>setCrewIds(current=>current.map((value,crewIndex)=>crewIndex===index?e.target.value:value))}><option value="">{index===0?"Select required employee":"No employee"}</option>{employees.map(employee=><option key={employee.employeeId} value={employee.employeeId}>{employee.displayName}</option>)}</select></label>)}</div><div className="pairingGrid"><label>Ride Along Type<select value={rideAlongType} onChange={e=>setRideAlongType(e.target.value as RideAlongType)}><option>None</option><option>Paramedic Intern</option><option>EMT Student</option><option>Other Ride Along</option></select></label><label>Ride Along Name — Optional<input value={rideAlongName} onChange={e=>setRideAlongName(e.target.value)} disabled={rideAlongType==="None"}/></label></div>{loginError&&<div className="loginError">{loginError}</div>}<div className="modalActions">{assignment&&<button className="secondary" onClick={()=>void clearPairing()}>Log Off Unit</button>}<button className="primary" onClick={()=>void login()}><UserRoundCheck size={16}/>{assignment?"Save Crew Changes":"Log On Unit"}</button></div>{!canManageDevice&&<div className="prototypeNote"><AlertTriangle size={14}/>Your account can operate an assigned MDT, but only an active supervisor can assign the device or change crew.</div>}</section></div>}
    {readCard&&<div className="backdrop" onMouseDown={()=>setReadCard(null)}><section className="readModal" onMouseDown={e=>e.stopPropagation()}><div><span>READING VIEW</span><button onClick={()=>setReadCard(null)}><X/></button></div><h2>{readCard.title}</h2><p>{readCard.body}</p><button onClick={()=>setReadCard(null)}><ArrowLeft size={18}/>RETURN TO MDT</button></section></div>}
    {statusModal&&<div className="backdrop" onMouseDown={()=>setStatusModal(false)}><section className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modalHead"><div><span>MANUAL OVERRIDE</span><h2>Change Unit Status</h2><p>Manual control remains available regardless of automation.</p></div><button onClick={()=>setStatusModal(false)}><X/></button></div><div className="statusGrid">{statusOptions.map(s=><button key={s} className={status===s?"selected":""} onClick={()=>setManual(s)}><CircleDot size={15}/><strong>{s}</strong></button>)}</div></section></div>}
    {dispositionModal&&<div className="backdrop" onMouseDown={()=>setDispositionModal(false)}><section className="modal dispositionModal" onMouseDown={e=>e.stopPropagation()}><div className="modalHead"><div><span>ON-SCENE WORKFLOW</span><h2>Select Patient Disposition</h2><p>Choose transport or record why this incident will not result in ambulance transport.</p></div><button onClick={()=>setDispositionModal(false)}><X/></button></div>
      <button className="transportChoice" onClick={()=>{setDispositionModal(false);setDestModal(true)}}><Navigation size={23}/><div><strong>Transport Patient</strong><span>Select the receiving facility, transport mode, STAT status, and patient count.</span></div><ChevronRight size={20}/></button>
      <div className="nonTransportHeading"><span>NON-TRANSPORT / OTHER ON-SCENE OUTCOME</span><small>The MDT records the operational outcome. Complete the required ePCR and CCEMSA documentation separately.</small></div>
      <div className="dispositionGrid">{NON_TRANSPORT_DISPOSITIONS.map(option=><button key={option.code} className={selectedNonTransport===option.code?"selected":""} onClick={()=>setSelectedNonTransport(option.code)}><strong>{option.shortLabel}</strong><span>{option.label}</span></button>)}</div>
      {selectedNonTransport&&<div className="policyGuidance"><ShieldAlert size={18}/><div><strong>CCEMSA WORKFLOW REMINDER</strong><span>{NON_TRANSPORT_DISPOSITIONS.find(option=>option.code===selectedNonTransport)?.guidance}</span></div></div>}
      <label className="dispositionNote">Operational Details {selectedNonTransport==="OTHER"?"— Required":"— Optional"}<textarea value={nonTransportNote} onChange={e=>setNonTransportNote(e.target.value)} placeholder="Unit/agency accepting care, cancellation details, Base Hospital contact, or other operational note…"/></label>
      <div className="modalActions"><button className="secondary" onClick={()=>setDispositionModal(false)}>Cancel</button><button className="primary" disabled={!selectedNonTransport||(selectedNonTransport==="OTHER"&&!nonTransportNote.trim())} onClick={confirmNonTransport}><Check size={16}/>Confirm Non-Transport · Pending Paperwork</button></div>
    </section></div>}
    {destModal&&<div className="backdrop" onMouseDown={()=>setDestModal(false)}><section className="modal destinationModal" onMouseDown={e=>e.stopPropagation()}><div className="modalHead"><div><span>DEPART SCENE WORKFLOW</span><h2>Select Destination</h2><p>All Nearby uses live Google Places results. Specialty choices use configured CCEMSA destination capabilities.</p></div><button onClick={()=>setDestModal(false)}><X/></button></div>
      <div className="destinationNeeds">{DESTINATION_NEEDS.map(need=><button key={need} className={destinationNeed===need?"selected":""} onClick={()=>{setDestinationNeed(need);setSelectedHospital(null)}}>{need}</button>)}</div>
      {hospitalsLoading&&destinationNeed==="All Nearby Hospitals"&&<div className="hospitalSearchStatus"><RefreshCw size={15}/>Finding nearby hospitals…</div>}
      {hospitalsError&&destinationNeed==="All Nearby Hospitals"&&<div className="hospitalSearchStatus error"><AlertTriangle size={15}/>{hospitalsError}</div>}
      <div className="hospitalResults">{filteredHospitals.length===0?<div className="noHospitals">No hospitals match this destination need.</div>:filteredHospitals.map(h=><button key={`${h.name}-${h.navQuery??h.city}`} className={selectedHospital?.name===h.name?"hospitalRow selected":"hospitalRow"} onClick={()=>setSelectedHospital(h)}><div className="hospitalIcon"><Hospital size={19}/></div><div className="hospitalCopy"><strong>{h.name}</strong><span>{h.type} · {h.city}</span><small>{h.configured?`${h.radio} · Tone ${h.tone}`:"Nearby hospital · Verify receiving capability"}</small></div><div className="etaBox"><span>{h.distanceMiles!==undefined?"DISTANCE":"SIM ETA"}</span><strong>{h.distanceMiles!==undefined?`${h.distanceMiles} mi`:`${h.eta} min`}</strong></div></button>)}</div>
      <div className="transportDetails"><div><span>TRANSPORT MODE</span><div className="segmentedControl"><button className={transportMode==="Code 2"?"selected":""} onClick={()=>setTransportMode("Code 2")}>Code 2</button><button className={transportMode==="Code 3"?"selected danger":""} onClick={()=>setTransportMode("Code 3")}>Code 3</button></div></div><div><span>STAT</span><button className={statTransport?"statButton selected":"statButton"} onClick={()=>setStatTransport(!statTransport)}>{statTransport?"STAT — YES":"STAT — NO"}</button></div><div><span>PATIENTS</span><div className="patientStepper"><button onClick={()=>setPatientCount(Math.max(1,patientCount-1))}>−</button><strong>{patientCount}</strong><button onClick={()=>setPatientCount(patientCount+1)}>+</button></div></div></div>
      <div className="modalActions"><button className="secondary" onClick={()=>setDestModal(false)}>Cancel</button><button className="primary" disabled={!selectedHospital} onClick={confirmDepart}><Navigation size={16}/>Confirm Depart Scene</button></div>
    </section></div>}
    {noteModal&&<div className="backdrop"><section className="modal"><div className="modalHead"><div><span>APOLLO INTERNAL</span><h2>Add Response Note</h2><p>Location/access knowledge for future agency responders.</p></div><button onClick={()=>setNoteModal(false)}><X/></button></div><textarea value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="Gate, driveway, parking, building access, best approach..."/><div className="modalActions"><button className="secondary" onClick={()=>setNoteModal(false)}>Cancel</button><button className="primary" onClick={addNote}>Save Response Note</button></div></section></div>}
    {msgModal&&<div className="backdrop"><section className="modal"><div className="modalHead"><div><span>APOLLO INTERNAL MESSAGING</span><h2>Send Message</h2><p>This workflow is independent of the county CAD interface.</p></div><button onClick={()=>setMsgModal(false)}><X/></button></div><label>To<select value={msgTo} onChange={e=>setMsgTo(e.target.value)}><option>All Units</option><option>Dispatch</option><option>Supervisors</option>{units.map(u=><option key={u.cadId}>{u.cadId}</option>)}</select></label><textarea value={msgText} onChange={e=>setMsgText(e.target.value)} placeholder="Message..."/><div className="modalActions"><button className="secondary" onClick={()=>setMsgModal(false)}>Cancel</button><button className="primary" onClick={()=>void sendMsg()}>Send Message</button></div>{messages.length>0&&<div className="msgHistory">{messages.slice(0,4).map(m=><div key={m.id}><strong>{m.time} · {m.from} → {m.to}</strong><span>{m.text}</span></div>)}</div>}</section></div>}
    {delayModal&&<div className="backdrop"><section className="modal"><div className="modalHead"><div><span>OPERATIONAL EXCEPTION</span><h2>Report Delay</h2><p>Timestamped Apollo operational event.</p></div><button onClick={()=>setDelayModal(false)}><X/></button></div><div className="delayGrid">{delayOptions.map(d=><button key={d} className={delay===d?"selected":""} onClick={()=>setDelay(d)}>{d}</button>)}</div><textarea value={delayNote} onChange={e=>setDelayNote(e.target.value)} placeholder="Optional note"/><div className="modalActions"><button className="secondary" onClick={()=>setDelayModal(false)}>Cancel</button><button className="primary" onClick={saveDelay}>Report Delay</button></div></section></div>}
    {emergency&&<div className="emergencyOverlay"><section><Siren size={44}/><span>EMERGENCY ACTIVATED</span><h2>{assignment?.cadId||"MDT"}</h2><p>Emergency sent to CAD through the secure Apollo integration API.</p><button onClick={()=>{setEmergency(false);if(assignment?.cadId)void fetch("/api/integration/mdt/send-emergency",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({radioIdentifier:assignment.cadId,callNumber:liveCall.callNumber,active:false,timestamp:new Date().toISOString(),latitude:devicePosition?.lat,longitude:devicePosition?.lng})})}}>CLEAR EMERGENCY / RETURN</button></section></div>}
    {alertBanner}
  </main>;
}

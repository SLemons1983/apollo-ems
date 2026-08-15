"use client";

import {
  AlertTriangle, Ambulance, ArrowLeft, Check, ChevronRight, CircleDot, Construction,
  Hospital, Map, MapPin, Maximize2, MessageSquareText, Moon, Navigation,
  Phone, Radio, Route, Satellite, Settings, ShieldAlert, Siren, SlidersHorizontal, LocateFixed, Layers,
  RefreshCw, SunMedium, Sunrise, Sunset, UserRoundCheck, Wifi, X, Search
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Status = "Dispatched"|"En Route"|"Holding Back"|"At Scene"|"Depart Scene"|"At Destination"|"Pending Paperwork"|"Unit Available"|"En Route Post"|"In Area"|"At Post"|"Out of Service";
type Source = "MDT MANUAL"|"GPS AUTO"|"CAD"|"APOLLO";
type CrewMember = { employeeId:string; displayName:string };
type RideAlongType = "None"|"Paramedic Intern"|"EMT Student"|"Other Ride Along";
type DeviceAssignment = { id:string; vehicle:string; cadId:string; station:string; level:"SUP"|"ALS"|"BLS"; crewMembers:CrewMember[]; rideAlongType:RideAlongType; rideAlongName?:string; outOfServiceReason?:string };
type Unit = { cadId:string; vehicle:string; station:string; status:Status; lat:number; lng:number; emergency?:boolean };
type Note = { id:number; text:string; author:string; time:string };
type Msg = { id:number|string; from:string; to:string; text:string; time:string };
type ReceivedMsg = { id:string; sender:string; recipient:string; body:string; created_at:string };
type LiveCadCall = { eventType:string; radioIdentifier:string; callNumber:string; emsNumber:string; priority:string; zone?:string; nature:string; facility?:string; address:string; city:string; state:string; zip?:string; suite?:string; holdBackRequired:boolean; dispatchComments?:string; premiseNotes?:string; cautionNotes?:string; status:string; cadTimestamp:string };
type MdtAlert = { id:string; tone:"call"|"message"|"comments"|"holdback"; eyebrow:string; title:string; body:string };

type NavigationKind = "crew"|"dispatch"|"hospital"|"unit";
type NavigationSession = {
  kind:NavigationKind;
  label:string;
  destination:string|{lat:number;lng:number};
  etaMinutes:number|null;
  distanceMiles:number|null;
  locked:boolean;
};
type CrewPlace = { name:string; address:string; lat:number; lng:number };


type DestinationNeed = "General Hospital"|"Stroke Center"|"STEMI / Cardiac"|"Trauma Center"|"Burn Center"|"Pediatric"|"Behavioral / 5150"|"VA";
type HospitalRecord = { name:string; city:string; eta:number; needs:DestinationNeed[]; radio:string; tone:string; phone:string; type:string; navQuery?:string };


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
  "General Hospital","Stroke Center","STEMI / Cardiac","Trauma Center",
  "Burn Center","Pediatric","Behavioral / 5150","VA"
];

const HOSPITALS: HospitalRecord[] = [
  {name:"Adventist Health Reedley",city:"Reedley",eta:8,needs:["General Hospital"],radio:"Med 4",tone:"961",phone:"Agency directory",type:"Receiving Hospital"},
  {name:"Adventist Health Selma",city:"Selma",eta:18,needs:["General Hospital"],radio:"Med 4",tone:"956",phone:"Agency directory",type:"Receiving Hospital"},
  {name:"Saint Agnes Medical Center",city:"Fresno",eta:31,needs:["General Hospital","Stroke Center","STEMI / Cardiac"],radio:"Med 2 / 5",tone:"985",phone:"Agency directory",type:"Primary Stroke / Cardiac"},
  {name:"Regional Medical Center",city:"Fresno",eta:34,needs:["General Hospital","Stroke Center","STEMI / Cardiac","Trauma Center","Burn Center"],radio:"Med 3 / 4 / 7",tone:"983",phone:"Agency directory",type:"Comprehensive Stroke / Trauma / Burn / Cardiac"},
  {name:"Clovis Community Medical Center",city:"Clovis",eta:36,needs:["General Hospital","Stroke Center"],radio:"Med 1 / 5",tone:"945",phone:"Agency directory",type:"Primary Stroke Center"},
  {name:"Valley Children's Hospital",city:"Madera",eta:42,needs:["Pediatric"],radio:"Med 5 / 7",tone:"981",phone:"Agency directory",type:"Pediatric Specialty"},
  {name:"Veterans Administration",city:"Fresno",eta:33,needs:["VA"],radio:"Med 6",tone:"969",phone:"241-3600",type:"VA Emergency Department"}
];

const statusOptions: Status[] = ["En Route","Holding Back","At Scene","Depart Scene","At Destination","Pending Paperwork","Unit Available","En Route Post","In Area","At Post"];
const delayOptions = ["Traffic","Road Construction","Weather","Road Closure","Railroad Crossing","Access Problem","Law Enforcement","Fire Activity","Mechanical","Hospital Delay","Other"];

function pt(){return new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date())}
function mapsUrl(lat:number,lng:number){return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}

export default function MDT(){
  const[clock,setClock]=useState("--:--:--");
  const[assignment,setAssignment]=useState<DeviceAssignment|null>(null);
  const[loginOpen,setLoginOpen]=useState(false);
  const[selectedVehicle,setSelectedVehicle]=useState("310"); const[selectedRadioId,setSelectedRadioId]=useState("310"); const[loginError,setLoginError]=useState("");
  const[employees,setEmployees]=useState<CrewMember[]>([]); const[crewIds,setCrewIds]=useState(["","","",""]); const[rideAlongType,setRideAlongType]=useState<RideAlongType>("None"); const[rideAlongName,setRideAlongName]=useState(""); const[canManageDevice,setCanManageDevice]=useState(false); const[refreshing,setRefreshing]=useState(false);
  const[units,setUnits]=useState<Unit[]>([]);
 const availableRadioIdentifiers=useMemo(()=>radioIdentifiersForVehicle(selectedVehicle),[selectedVehicle]);
  const[status,setStatus]=useState<Status>("Unit Available"); const[autoStatus,setAutoStatus]=useState(true); const[holdBack,setHoldBack]=useState(false);
  const[displayMode,setDisplayMode]=useState<"Auto"|"Day"|"Night">("Auto"); const[autoNight,setAutoNight]=useState(false); const[brightness,setBrightness]=useState(100); const[blackout,setBlackout]=useState(false);
  const[fullMap,setFullMap]=useState(false); const[readCard,setReadCard]=useState<{title:string;body:string}|null>(null); const[statusModal,setStatusModal]=useState(false);
  const[destModal,setDestModal]=useState(false); const[destinationNeed,setDestinationNeed]=useState<DestinationNeed>("General Hospital");
  const[selectedHospital,setSelectedHospital]=useState<HospitalRecord|null>(null); const[transportMode,setTransportMode]=useState<"Code 2"|"Code 3">("Code 2");
  const[statTransport,setStatTransport]=useState(false); const[patientCount,setPatientCount]=useState(1); const[callInDone,setCallInDone]=useState(false);
  const[responseNotes,setResponseNotes]=useState<Note[]>([]);
  const[noteModal,setNoteModal]=useState(false); const[newNote,setNewNote]=useState("");
  const[msgModal,setMsgModal]=useState(false); const[msgTo,setMsgTo]=useState("All Units"); const[msgText,setMsgText]=useState(""); const[messages,setMessages]=useState<Msg[]>([]);
  const[delayModal,setDelayModal]=useState(false); const[delay,setDelay]=useState(""); const[delayNote,setDelayNote]=useState(""); const[activeDelay,setActiveDelay]=useState<string|null>(null);
  const[selectedUnit,setSelectedUnit]=useState<Unit|null>(null); const[emergency,setEmergency]=useState(false); const[emergencyHold,setEmergencyHold]=useState(false); const[emergencyProgress,setEmergencyProgress]=useState(0);
  const emergencyTimer=useRef<number|null>(null); const emergencyTick=useRef<number|null>(null);
  const googleMapRef=useRef<HTMLDivElement|null>(null); const googleMapObjectRef=useRef<any>(null); const googleMarkersRef=useRef<any[]>([]); const googleMarkerUnitIdsRef=useRef<string[]>([]); const trafficLayerRef=useRef<any>(null);
  const routePolylinesRef=useRef<any[]>([]); const routeMarkersRef=useRef<any[]>([]); const activeRouteRef=useRef<any|null>(null);
  const[googleReady,setGoogleReady]=useState(false); const[mapGeneration,setMapGeneration]=useState(0); const[googleMapError,setGoogleMapError]=useState(""); const[trafficEnabled,setTrafficEnabled]=useState(true);
  const[devicePosition,setDevicePosition]=useState<{lat:number;lng:number}|null>(null); const[gpsAccuracy,setGpsAccuracy]=useState<number|null>(null);
  const[navigation,setNavigation]=useState<NavigationSession|null>(null); const[previousCrewNavigation,setPreviousCrewNavigation]=useState<NavigationSession|null>(null);
  const[crewPlace,setCrewPlace]=useState<CrewPlace|null>(null); const[routeError,setRouteError]=useState(""); const[searchError,setSearchError]=useState(""); const[searchQuery,setSearchQuery]=useState(""); const[searchPredictions,setSearchPredictions]=useState<any[]>([]); const[searchLoading,setSearchLoading]=useState(false);
  const[events,setEvents]=useState<{id:number;time:string;label:string;source:Source}[]>([]);
  const[liveCall,setLiveCall]=useState<LiveCadCall>({eventType:"NONE",radioIdentifier:"",callNumber:"",emsNumber:"—",priority:"—",nature:"No Active Call",address:"No incident assigned",city:"",state:"",holdBackRequired:false,status:"Unit Available",cadTimestamp:""});
  const[integrationState,setIntegrationState]=useState<"LOCAL"|"CONNECTED"|"ERROR">("LOCAL");
  const[alertQueue,setAlertQueue]=useState<MdtAlert[]>([]); const seenAlertKeysRef=useRef<Set<string>>(new Set()); const acknowledgedAlertKeysRef=useRef<Set<string>>(new Set());

  useEffect(()=>{const tick=()=>{setClock(pt());const h=Number(new Intl.DateTimeFormat("en-US",{timeZone:"America/Los_Angeles",hour:"2-digit",hour12:false}).format(new Date()));setAutoNight(h>=19||h<7)};tick();const t=window.setInterval(tick,1000);return()=>window.clearInterval(t)},[]);
  useEffect(()=>{
    try{acknowledgedAlertKeysRef.current=new Set(JSON.parse(window.localStorage.getItem("apollo-mdt-acknowledged-alerts")??"[]"))}catch{}
  },[]);

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

  async function refreshMdt(openIfUnassigned=false){
    setRefreshing(true);
    try{
      const response=await fetch("/api/mdt/bootstrap",{cache:"no-store"});
      const data=await response.json();
      if(!response.ok||!data.ok)throw new Error(data.error||"Unable to refresh MDT");
      setEmployees(data.employees??[]);setCanManageDevice(Boolean(data.canManageDevice));setUnits(rowsToUnits(data.sessions??[]));
      const savedId=window.localStorage.getItem("apollo-mdt-session-id");
      const row=(data.sessions??[]).find((item:any)=>item.id===savedId);
      if(row){const next=rowToAssignment(row);setAssignment(next);setStatus(row.status);setSelectedVehicle(next.vehicle);setSelectedRadioId(next.cadId);setCrewIds([...next.crewMembers.map(member=>member.employeeId),"","",""].slice(0,4));setRideAlongType(next.rideAlongType);setRideAlongName(next.rideAlongName??"");}
      else if(openIfUnassigned||!savedId)setLoginOpen(true);
      setIntegrationState("CONNECTED");
    }catch{setIntegrationState("ERROR");}
    finally{setRefreshing(false)}
  }

  useEffect(()=>{void refreshMdt(true)},[]);

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
          setStatus(data.session.status as Status);
        }
        if(data.call){
          setLiveCall((previous)=>{
            const isNewCall=previous.callNumber!==data.call.callNumber;
            if(isNewCall){
              log(`NEW CAD CALL — EMS ${data.call.emsNumber}`,"CAD");
              enqueueAlert(`call:${data.call.callNumber}`,{
                tone:"call",eyebrow:"NEW CAD CALL",title:`EMS ${data.call.emsNumber} · Priority ${data.call.priority}`,
                body:`${data.call.nature}\n${data.call.address}, ${data.call.city}`
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
            return data.call;
          });
          setHoldBack(Boolean(data.call.holdBackRequired));
          if(data.call.status&&status!==data.call.status&&["Dispatched","Holding Back"].includes(data.call.status))setStatus(data.call.status as Status);
        }else if(["Unit Available","En Route Post","In Area","At Post","Out of Service"].includes(data.session?.status)){
          setLiveCall({eventType:"NONE",radioIdentifier:assignment.cadId,callNumber:"",emsNumber:"—",priority:"—",nature:"No Active Call",address:"No incident assigned",city:"",state:"",holdBackRequired:false,status:data.session?.status??"Unit Available",cadTimestamp:""});
          setHoldBack(false);setSelectedHospital(null);setCallInDone(false);
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
  const hasActiveCall=!['Unit Available','En Route Post','In Area','At Post','Out of Service'].includes(status);
  const nextStatus=useMemo(()=>{if(status==="Dispatched")return {label:"En Route" as Status,note:"Begin response"};if(status==="En Route")return holdBack?{label:"Holding Back" as Status,note:"Hold Back Required by Dispatch"}:{label:"At Scene" as Status,note:autoStatus?"GPS automation armed":"Manual status available"};if(status==="Holding Back")return {label:"At Scene" as Status,note:"Use when cleared to enter"};if(status==="At Scene")return {label:"Depart Scene" as Status,note:"Destination workflow"};if(status==="Depart Scene")return {label:"At Destination" as Status,note:"GPS arrival automation available"};if(status==="At Destination")return {label:"Pending Paperwork" as Status,note:"Complete documentation"};if(status==="Pending Paperwork")return {label:"Unit Available" as Status,note:"Return unit to service"};if(status==="Unit Available")return {label:"En Route Post" as Status,note:"Return / move to post"};if(status==="En Route Post")return {label:"In Area" as Status,note:"Arrived in response area"};if(status==="In Area")return {label:"At Post" as Status,note:"Arrived at assigned post"};return null},[status,holdBack,autoStatus]);
  const mapUnits=useMemo(()=>units.map(u=>u.cadId===assignment?.cadId?{...u,status,emergency,lat:devicePosition?.lat??u.lat,lng:devicePosition?.lng??u.lng}:u),[units,assignment?.cadId,status,emergency,devicePosition?.lat,devicePosition?.lng]);
  const markerSignature=useMemo(()=>`${mapUnits.map(u=>`${u.cadId}|${u.status}|${u.emergency}`).join(";")}|${liveCall.callNumber}`,[mapUnits,liveCall.callNumber]);
  const myUnit=mapUnits.find(u=>u.cadId===assignment?.cadId)??{cadId:"",vehicle:"",station:"",status:"Unit Available" as Status,lat:36.5965,lng:-119.4512};

  useEffect(()=>{
    if(!navigator.geolocation)return;
    const id=navigator.geolocation.watchPosition(
      pos=>{setDevicePosition({lat:pos.coords.latitude,lng:pos.coords.longitude});setGpsAccuracy(Math.round(pos.coords.accuracy))},
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

        const {Map}=await g.maps.importLibrary("maps");
        if(cancelled||!googleMapRef.current)return;

        const map=new Map(googleMapRef.current,{
          center:{lat:myUnit.lat,lng:myUnit.lng},
          zoom:13,
          mapId:"DEMO_MAP_ID",
          disableDefaultUI:true,
          zoomControl:true,
          streetViewControl:false,
          fullscreenControl:false,
          mapTypeControl:false,
          gestureHandling:"greedy"
        });

        googleMapObjectRef.current=map;
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
        for(const marker of googleMarkersRef.current){marker.map=null}
        googleMarkersRef.current=[];
        googleMarkerUnitIdsRef.current=[];
        const {AdvancedMarkerElement,PinElement}=await g.maps.importLibrary("marker");
        if(!active)return;
        for(const u of mapUnits){
          const mine=u.cadId===assignment?.cadId;
          const pin=new PinElement({
            background:u.emergency?"#b91c1c":mine?"#1673c7":"#ffffff",
            borderColor:u.emergency?"#7f1d1d":"#1673c7",
            glyphColor:u.emergency?"#ffffff":mine?"#ffffff":"#1673c7",
            glyph:u.cadId.replace("Medic ","").replace("S",""),
            scale:u.emergency?1.35:mine?1.2:1
          });
          const marker=new AdvancedMarkerElement({
            map,
            position:{lat:u.lat,lng:u.lng},
            title:`${u.cadId} — ${u.status}${u.emergency?" — EMERGENCY":""}`,
            content:pin.element,
            gmpClickable:true
          });
          marker.addListener("click",()=>setSelectedUnit(u));
          googleMarkersRef.current.push(marker);
          googleMarkerUnitIdsRef.current.push(u.cadId);
        }
        if(liveCall.callNumber){
          const scenePin=new PinElement({background:"#c83d3d",borderColor:"#7f1d1d",glyphColor:"#ffffff",glyph:"!"});
          const sceneMarker=new AdvancedMarkerElement({map,position:{lat:36.5987,lng:-119.4540},title:`EMS ${liveCall.emsNumber} Scene — ${liveCall.address}`,content:scenePin.element});
          googleMarkersRef.current.push(sceneMarker);
          googleMarkerUnitIdsRef.current.push("");
        }
      }catch{
        setGoogleMapError("Google Maps markers failed to load");
      }
    };
    void renderMarkers();
    return()=>{active=false}
  },[googleReady,mapGeneration,markerSignature,assignment?.cadId]);

  useEffect(()=>{
    googleMarkersRef.current.forEach((marker,index)=>{
      const cadId=googleMarkerUnitIdsRef.current[index];
      if(!cadId)return;
      const unit=mapUnits.find(item=>item.cadId===cadId);
      if(unit)marker.position={lat:unit.lat,lng:unit.lng};
    });
  },[mapUnits]);

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

  function endNavigation(){
    clearRouteRendering();
    activeRouteRef.current=null;
    setNavigation(null);
    setRouteError("");
  }

  async function startEmbeddedNavigation(kind:NavigationKind,label:string,destination:string|{lat:number;lng:number},force=false){
    if(!googleReady||!googleMapObjectRef.current){
      setRouteError("Google Maps is not ready for embedded navigation.");
      return;
    }
    const priority:Record<NavigationKind,number>={crew:1,unit:2,hospital:3,dispatch:4};
    if(navigation&&!force&&priority[kind]<priority[navigation.kind]){
      setRouteError(`${navigation.label} has navigation priority.`);
      return;
    }
    if(kind==="dispatch"&&navigation?.kind==="crew"){
      setPreviousCrewNavigation(navigation);
    }
    try{
      setRouteError("");
      clearRouteRendering();
      const g=(window as any).google;
      const {Route}=await g.maps.importLibrary("routes");
      const origin=devicePosition??{lat:myUnit.lat,lng:myUnit.lng};
      const {routes}=await Route.computeRoutes({
        origin,
        destination,
        travelMode:"DRIVING",
        routingPreference:"TRAFFIC_AWARE",
        fields:["path","distanceMeters","durationMillis","viewport"]
      });
      if(!routes?.length)throw new Error("No route returned");
      const route=routes[0];
      activeRouteRef.current=route;
      renderActiveRoute(googleMapObjectRef.current,true);
      const etaMinutes=typeof route.durationMillis==="number"?Math.max(1,Math.round(route.durationMillis/60000)):null;
      const distanceMiles=typeof route.distanceMeters==="number"?Math.round((route.distanceMeters/1609.344)*10)/10:null;
      setNavigation({kind,label,destination,etaMinutes,distanceMiles,locked:kind==="dispatch"||kind==="hospital"});
      log(`${kind.toUpperCase()} navigation → ${label}`,"APOLLO");
    }catch(err){
      console.error("[Apollo MDT] Route computation error:",err);
      setRouteError("Unable to calculate embedded route. Make sure Routes API is enabled.");
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
  const filteredHospitals=useMemo(()=>HOSPITALS.filter(h=>h.needs.includes(destinationNeed)).sort((a,b)=>a.eta-b.eta),[destinationNeed]);
  const callInActive=status==="Depart Scene"&&selectedHospital&&navigation?.kind==="hospital"&&navigation.etaMinutes!==null&&navigation.etaMinutes<=12&&!callInDone;

  function log(label:string,source:Source){setEvents(e=>[{id:Date.now(),time:pt(),label,source},...e])}
  async function sendStatus(next:Status,source:Source="MDT MANUAL"){
    if(!assignment?.cadId)return;
    try{await fetch("/api/integration/mdt/send-status",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({radioIdentifier:assignment.cadId,callNumber:liveCall.callNumber,emsNumber:liveCall.emsNumber,status:next,timestamp:new Date().toISOString(),source,latitude:devicePosition?.lat,longitude:devicePosition?.lng})})}catch{}
  }
  function setManual(next:Status){setStatus(next);log(next,"MDT MANUAL");void sendStatus(next,"MDT MANUAL");setStatusModal(false);if(blackout)setBlackout(false);if(next==="Dispatched"||next==="En Route"){startDispatchNavigation(`EMS ${liveCall.emsNumber} Scene`,`${liveCall.address}, ${liveCall.city}, ${liveCall.state} ${liveCall.zip??""}`)}}
  function confirmDepart(){if(!selectedHospital)return;setStatus("Depart Scene");setCallInDone(false);log(`Depart Scene → ${selectedHospital.name} · ${transportMode}${statTransport?" · STAT":""} · ${patientCount} patient${patientCount===1?"":"s"}`,"MDT MANUAL");void sendStatus("Depart Scene","MDT MANUAL");setDestModal(false);void startEmbeddedNavigation("hospital",selectedHospital.name,selectedHospital.navQuery||`${selectedHospital.name}, ${selectedHospital.city}, CA`,true)}
  function advance(){if(!nextStatus)return;if(nextStatus.label==="Depart Scene"){setDestModal(true);return}setManual(nextStatus.label)}
  async function login(){
    setLoginError("");
    if(!canManageDevice){setLoginError("An active ApolloEMS supervisor account is required to assign this MDT.");return}
    const radio=availableRadioIdentifiers.find(x=>x.cadId===selectedRadioId);if(!radio){setLoginError("Select a valid radio identifier.");return}
    const selectedCrew=crewIds.filter(Boolean).map(id=>employees.find(employee=>employee.employeeId===id)).filter(Boolean) as CrewMember[];
    if(selectedCrew.length<1){setLoginError("Crew Member 1 is required.");return}
    if(new Set(selectedCrew.map(member=>member.employeeId)).size!==selectedCrew.length){setLoginError("The same employee cannot be assigned more than once.");return}
    const response=await fetch("/api/mdt/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:assignment?.id,physicalVehicle:selectedVehicle,radioIdentifier:selectedRadioId,station:radio.station,level:radio.level,crewMembers:selectedCrew,rideAlongType,rideAlongName,status:assignment?.id?status:"Unit Available",loggedOnAt:undefined})});
    const data=await response.json();if(!response.ok||!data.ok){setLoginError(data.error||"Unable to assign MDT");return}
    const a=rowToAssignment(data.session);window.localStorage.setItem("apollo-mdt-session-id",a.id);setAssignment(a);setStatus(data.session.status);setLoginOpen(false);log(`Device assigned: Vehicle ${a.vehicle} / ${a.cadId}`,"APOLLO");void refreshMdt();
  }
  async function clearPairing(){
    if(assignment?.id)await fetch(`/api/mdt/session?id=${encodeURIComponent(assignment.id)}`,{method:"DELETE"});
    window.localStorage.removeItem("apollo-mdt-session-id");setAssignment(null);setStatus("Unit Available");setLoginOpen(true);void refreshMdt();
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
    <div className="mapTop">
      <div className="mapTopRoute"><Navigation size={15}/><span>{navigation?navigation.label:`${liveCall.address}, ${liveCall.city}`}</span></div>
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
        : <button onClick={()=>startDispatchNavigation(`EMS ${liveCall.emsNumber} Scene`,`${liveCall.address}, ${liveCall.city}, ${liveCall.state} ${liveCall.zip??""}`)}><Route size={16}/>Start Scene Navigation</button>}
    </div>
  </div>;

  if(blackout)return <main className="mdt-root blackout" onClick={()=>setBlackout(false)}><Moon size={28}/><strong>BLACKOUT</strong><span>Tap anywhere to restore display</span><small>{assignment?.cadId||"UNASSIGNED"} · {status} · {clock}</small></main>;
  const activeAlert=alertQueue[0]??null;
  const alertBanner=activeAlert&&<div className="mdtAlertBackdrop"><section className={`mdtAlert ${activeAlert.tone}`} role="alertdialog" aria-live="assertive" aria-modal="true"><div className="mdtAlertIcon">{activeAlert.tone==="holdback"?<ShieldAlert size={44}/>:activeAlert.tone==="message"?<MessageSquareText size={44}/>:<Siren size={44}/>}</div><span>{activeAlert.eyebrow}</span><h2>{activeAlert.title}</h2><p>{activeAlert.body}</p><button autoFocus onClick={acknowledgeAlert}><Check size={19}/>ACKNOWLEDGE{alertQueue.length>1?` · ${alertQueue.length-1} MORE`:""}</button></section></div>;

  if(fullMap)return <main className={`mdt-root fullMap ${night?"night":""}`}><button className="mapReturn" onClick={()=>setFullMap(false)}><ArrowLeft size={19}/>RETURN TO MDT</button>{map}<div className="floatBar"><div><strong>{assignment?.cadId||"UNASSIGNED"}</strong><span>{navigation?`${navigation.label} · ${navigation.etaMinutes??"—"} min`:`EMS ${liveCall.emsNumber} · ${status}`}</span></div>{navigation&&<button onClick={endNavigation}>END NAVIGATION</button>}<button onClick={()=>setStatusModal(true)}>{status}</button></div>{alertBanner}</main>;

  return <main className={`mdt-root shell ${night?"night":"day"}`} style={{filter:`brightness(${brightness/100})`}}>
    <header><div className="identity"><div className="logo"><Radio size={20}/></div><div><span>APOLLO MDT</span><strong>{assignment?.cadId||"DEVICE UNASSIGNED"}</strong><small>{assignment?`Vehicle ${assignment.vehicle} · ${assignment.level} · ${assignment.station}`:"Supervisor pairing required"}</small></div></div>
      <div className="center"><span><Wifi size={13}/>CAD {integrationState}</span><span><Satellite size={13}/>GPS {gpsAccuracy!==null?`${gpsAccuracy} ft`:"WAIT"}</span><strong>{clock}</strong></div>
      <div className="controls"><div className="modes"><button className={displayMode==="Auto"?"active":""} onClick={()=>setDisplayMode("Auto")}>AUTO</button><button className={displayMode==="Day"?"active":""} onClick={()=>setDisplayMode("Day")}><Sunrise size={13}/>DAY</button><button className={displayMode==="Night"?"active":""} onClick={()=>setDisplayMode("Night")}><Sunset size={13}/>NIGHT</button></div><button onClick={()=>setBlackout(true)}><Moon size={15}/>Blackout</button><label><SunMedium size={15}/><input type="range" min="35" max="100" value={brightness} onChange={e=>setBrightness(+e.target.value)}/></label><button onClick={()=>void refreshMdt()} disabled={refreshing}><RefreshCw size={15}/>{refreshing?"Refreshing":"Refresh"}</button><button onClick={()=>setLoginOpen(true)} disabled={!canManageDevice}><Settings size={15}/>Device</button></div>
      <div className="emergencyZone"><button className={`emergencyBtn ${emergencyHold?"holding":""}`} onPointerDown={emergencyDown} onPointerUp={emergencyUp} onPointerLeave={emergencyUp} onPointerCancel={emergencyUp} style={{"--hold":`${emergencyProgress}%`} as React.CSSProperties}><Siren size={16}/>HOLD 3 SEC</button></div>
    </header>
    {callInActive&&<section className="callInBanner"><div><Radio size={20}/><span>CALL IN REMINDER · ETA {navigation!.etaMinutes} MIN</span></div><strong>{selectedHospital!.name}</strong><small>Radio: {selectedHospital!.radio} · Tone {selectedHospital!.tone} · Phone: {selectedHospital!.phone}</small><button onClick={()=>setCallInDone(true)}><Check size={15}/>Call-In Complete</button></section>}

    <section className="grid">
      <aside className="call"><div className="callHead"><span className="p">P{liveCall.priority}</span><div><small>EMS {liveCall.emsNumber}</small><strong>{liveCall.nature}</strong></div><span className="chip">{status}</span></div><div className="callNo">{liveCall.callNumber}</div>
        <div className="addr"><MapPin size={17}/><div><strong>{liveCall.address}</strong><span>{liveCall.city}, {liveCall.state} {liveCall.zip??""}</span></div></div>
        <button className="readBox" onClick={()=>read(`DISPATCH COMMENTS — EMS ${liveCall.emsNumber}`,liveCall.dispatchComments||"No dispatch comments.")}><div><label>DISPATCH COMMENTS</label><span><Maximize2 size={12}/>Tap to enlarge</span></div><p>{liveCall.dispatchComments||"No dispatch comments."}</p></button>
        <button className="readBox" onClick={()=>read(`PREMISE / CAUTION — EMS ${liveCall.emsNumber}`,[liveCall.premiseNotes,liveCall.cautionNotes].filter(Boolean).join("\n\n")||"No premise or caution notes.")}><div><label>PREMISE / CAUTION</label><span><Maximize2 size={12}/>Tap to enlarge</span></div><p>{[liveCall.premiseNotes,liveCall.cautionNotes].filter(Boolean).join(" · ")||"No premise or caution notes."}</p></button>
        <button className="readBox response" onClick={()=>read("RESPONSE NOTES",responseNotes.map(n=>`${n.text}\n— ${n.author} · ${n.time}`).join("\n\n"))}><div><label>RESPONSE NOTES · APOLLO INTERNAL</label><span><Maximize2 size={12}/>Tap to enlarge</span></div><p>{responseNotes[0]?.text||"No response notes for this location."}</p></button><button className="tiny" onClick={()=>setNoteModal(true)}>+ Add Response Note</button>
        {activeDelay&&<div className="delay"><Construction size={16}/><div><strong>ACTIVE DELAY</strong><span>{activeDelay}</span></div><button onClick={()=>setActiveDelay(null)}><X size={14}/></button></div>}
        <div className="aci"><ShieldAlert size={16}/><div><strong>ACI READY</strong><span>No active clinical or communications advisory.</span></div></div>
        {status==="Out of Service"&&<div className="oosNotice"><AlertTriangle size={16}/><div><strong>OUT OF SERVICE — CAD CONTROLLED</strong><span>{assignment?.outOfServiceReason||"Reason not provided"}</span></div></div>}
        <div className="auto"><div><Satellite size={16}/><div><strong>GPS Status Automation</strong><span>Manual override always available</span></div><button className={autoStatus?"tog on":"tog"} onClick={()=>setAutoStatus(!autoStatus)}><i/></button></div><small>{autoStatus?"At Scene geofence armed · target radius 100 ft":"Automatic status changes disabled"}</small>{holdBack&&<div className="hold active"><ShieldAlert size={13}/>HOLD BACK REQUIRED — CAD</div>}</div>
      </aside>

      <section className="map">{map}</section>
      <aside className="actions"><section className="current"><label>CURRENT STATUS</label><strong>{status}</strong>{nextStatus&&<button className={holdBack&&status==="En Route"?"next holdback":"next"} onClick={advance}><span>NEXT STATUS</span><b>{nextStatus.label.toUpperCase()}</b><small>{nextStatus.note}</small></button>}<button onClick={()=>setStatusModal(true)} disabled={status==="Out of Service"}><SlidersHorizontal size={15}/>{status==="Out of Service"?"CAD controls this status":"Manual Status Override"}</button></section>
        <button className="big blue" onClick={()=>setDestModal(true)} disabled={!hasActiveCall||status==="Out of Service"}><Navigation size={20}/><div><strong>Destination / Depart Scene</strong><span>Select destination need and transport details</span></div></button>
        <button className="big" onClick={()=>setDelayModal(true)}><Construction size={20}/><div><strong>Report Delay</strong><span>Traffic · weather · road construction · access</span></div></button>
        <button className="big" onClick={()=>setMsgModal(true)}><MessageSquareText size={20}/><div><strong>Messages</strong><span>Apollo internal · Dispatch ↔ MDT ↔ MDT</span></div></button>
        <button className="big"><Hospital size={20}/><div><strong>Hospitals</strong><span>Radio · tone · phone · destination info</span></div></button>
        <section className="history"><label>RECENT STATUS HISTORY</label>{events.slice(0,5).map(e=><div key={e.id}><strong>{e.time}</strong><span>{e.label}<small>{e.source}</small></span></div>)}</section>
      </aside>
    </section>

    <footer><button className="active"><Map size={16}/>Call / Map</button><button onClick={()=>setMsgModal(true)}><MessageSquareText size={16}/>Messages</button><button><Hospital size={16}/>Hospitals</button><button onClick={()=>setDelayModal(true)}><Construction size={16}/>Delay</button><button onClick={()=>setStatusModal(true)} disabled={status==="Out of Service"}><SlidersHorizontal size={16}/>Status</button></footer>

    {selectedUnit&&<div className="unitCard"><button className="close" onClick={()=>setSelectedUnit(null)}><X size={16}/></button><div className={selectedUnit.emergency?"unitTitle emergency":"unitTitle"}><Ambulance size={22}/><div><strong>{selectedUnit.cadId}</strong><span>Vehicle {selectedUnit.vehicle} · {selectedUnit.status}</span></div></div>{selectedUnit.emergency&&<div className="emergencyLabel"><AlertTriangle size={16}/>UNIT EMERGENCY ACTIVE</div>}<button onClick={()=>{setMsgTo(selectedUnit.cadId);setMsgModal(true);setSelectedUnit(null)}}><MessageSquareText size={15}/>Message Unit</button><a className={hasActiveCall&&!selectedUnit.emergency?"disabled":""} href={hasActiveCall&&!selectedUnit.emergency?undefined:mapsUrl(selectedUnit.lat,selectedUnit.lng)} target="_blank"><Navigation size={15}/>Navigate to Unit</a>{hasActiveCall&&!selectedUnit.emergency&&<small>Navigation disabled while committed to an active call.</small>}</div>}

    {loginOpen&&<div className="backdrop"><section className="modal pairing"><div className="modalHead"><div><span>SUPERVISOR DEVICE ASSIGNMENT</span><h2>Assign this MDT and Crew</h2><p>Pair this device to a physical vehicle, radio identifier, and active ApolloEMS employees.</p></div>{assignment&&<button onClick={()=>setLoginOpen(false)}><X/></button>}</div><div className="pairingGrid">
<label>Vehicle<span>Physical vehicle containing this MDT.</span><select value={selectedVehicle} onChange={e=>{const vehicle=e.target.value;setSelectedVehicle(vehicle);setSelectedRadioId(radioIdentifiersForVehicle(vehicle)[0]?.cadId??"")}} disabled={Boolean(assignment)}>{VEHICLES.map(vehicle=><option key={vehicle} value={vehicle}>Vehicle {vehicle}</option>)}</select></label>
<label>Radio Identifier<span>CAD routing identity used to send calls to this MDT.</span><select value={selectedRadioId} onChange={e=>setSelectedRadioId(e.target.value)}>{availableRadioIdentifiers.map(r=><option key={r.cadId} value={r.cadId}>{r.cadId} — {r.level} — {r.station}</option>)}</select></label>
</div><div className="crewGrid">{crewIds.map((id,index)=><label key={index}>Crew Member {index+1}{index===0?" — Required":" — Optional"}<select value={id} onChange={e=>setCrewIds(current=>current.map((value,crewIndex)=>crewIndex===index?e.target.value:value))}><option value="">{index===0?"Select required employee":"No employee"}</option>{employees.map(employee=><option key={employee.employeeId} value={employee.employeeId}>{employee.displayName}</option>)}</select></label>)}</div><div className="pairingGrid"><label>Ride Along Type<select value={rideAlongType} onChange={e=>setRideAlongType(e.target.value as RideAlongType)}><option>None</option><option>Paramedic Intern</option><option>EMT Student</option><option>Other Ride Along</option></select></label><label>Ride Along Name — Optional<input value={rideAlongName} onChange={e=>setRideAlongName(e.target.value)} disabled={rideAlongType==="None"}/></label></div>{loginError&&<div className="loginError">{loginError}</div>}<div className="modalActions">{assignment&&<button className="secondary" onClick={()=>void clearPairing()}>Log Off Unit</button>}<button className="primary" onClick={()=>void login()}><UserRoundCheck size={16}/>{assignment?"Save Crew Changes":"Log On Unit"}</button></div>{!canManageDevice&&<div className="prototypeNote"><AlertTriangle size={14}/>Your account can operate an assigned MDT, but only an active supervisor can assign the device or change crew.</div>}</section></div>}
    {readCard&&<div className="backdrop" onMouseDown={()=>setReadCard(null)}><section className="readModal" onMouseDown={e=>e.stopPropagation()}><div><span>READING VIEW</span><button onClick={()=>setReadCard(null)}><X/></button></div><h2>{readCard.title}</h2><p>{readCard.body}</p><button onClick={()=>setReadCard(null)}><ArrowLeft size={18}/>RETURN TO MDT</button></section></div>}
    {statusModal&&<div className="backdrop" onMouseDown={()=>setStatusModal(false)}><section className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modalHead"><div><span>MANUAL OVERRIDE</span><h2>Change Unit Status</h2><p>Manual control remains available regardless of automation.</p></div><button onClick={()=>setStatusModal(false)}><X/></button></div><div className="statusGrid">{statusOptions.map(s=><button key={s} className={status===s?"selected":""} onClick={()=>setManual(s)}><CircleDot size={15}/><strong>{s}</strong></button>)}</div></section></div>}
    {destModal&&<div className="backdrop" onMouseDown={()=>setDestModal(false)}><section className="modal destinationModal" onMouseDown={e=>e.stopPropagation()}><div className="modalHead"><div><span>DEPART SCENE WORKFLOW</span><h2>Select Destination</h2><p>Choose the receiving capability needed. Apollo filters configured facilities and ranks them by simulated travel time.</p></div><button onClick={()=>setDestModal(false)}><X/></button></div>
      <div className="destinationNeeds">{DESTINATION_NEEDS.map(need=><button key={need} className={destinationNeed===need?"selected":""} onClick={()=>{setDestinationNeed(need);setSelectedHospital(null)}}>{need}</button>)}</div>
      <div className="hospitalResults">{filteredHospitals.length===0?<div className="noHospitals">No configured hospitals match this destination need.</div>:filteredHospitals.map(h=><button key={h.name} className={selectedHospital?.name===h.name?"hospitalRow selected":"hospitalRow"} onClick={()=>setSelectedHospital(h)}><div className="hospitalIcon"><Hospital size={19}/></div><div className="hospitalCopy"><strong>{h.name}</strong><span>{h.type} · {h.city}</span><small>{h.radio} · Tone {h.tone}</small></div><div className="etaBox"><span>SIM ETA</span><strong>{h.eta} min</strong></div></button>)}</div>
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

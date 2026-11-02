"use client";
import { useCallback, useState } from "react";
import Modal from "@/components/ui/Modal";
import OnboardingAddress from "@/components/OnboardingAddress";
import SnowdMap from "@/components/SnowdMap";
import { useServiceLocation } from "@/context/ServiceLocationContext";
import { formatServiceAddress, sameServiceAddress, type ServiceLocation } from "@/lib/serviceLocations";
import type { PropertySize } from "@/lib/types";
import IconSwap from "@/components/ui/IconSwap";
import popup from "@/components/ui/popup.module.css";
import { Building2, Car, Check, House, KeyRound, MapPin, RotateCcw } from "lucide-react";

export default function ServiceLocationPicker({onClose,initial,onPreview,existingOrder=false,initialSaveFavorite=false,saveOnly=false,propertyId}:{onClose:()=>void;initial?:ServiceLocation | null;onPreview?:(location:ServiceLocation | null)=>void;existingOrder?:boolean;initialSaveFavorite?:boolean;saveOnly?:boolean;propertyId?:string}) {
  const locations = useServiceLocation();
  const [draft,setDraft] = useState<ServiceLocation>(initial || locations?.location || {address:"",city:"",province:"",postalCode:"",propertySize:"medium"});
  const [saveFavorite,setSaveFavorite] = useState(initialSaveFavorite || saveOnly), [makeHome,setMakeHome] = useState(false), [confirmed,setConfirmed] = useState(false);
  const [label,setLabel] = useState(initial && "label" in initial && typeof initial.label === "string" ? initial.label : ""),[busy,setBusy] = useState(false),[error,setError] = useState("");
  const different = !saveOnly && !sameServiceAddress(draft,locations?.home);
  const valid = Boolean(draft.address.trim() && draft.city.trim() && draft.province.trim() && /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(draft.postalCode.trim()));
  const mapped = Number.isFinite(draft.lat) && Number.isFinite(draft.lng);
  const edit = (value:ServiceLocation) => {const next={...value,propertySize:value.propertySize || draft.propertySize || "medium"};setDraft(next);setConfirmed(false);setError("");onPreview?.(next);};
  const resolve = useCallback((point:{lat:number;lng:number})=>{
    setDraft(current=>Number.isFinite(current.lat) && Number.isFinite(current.lng) ? current : {...current,...point});
  },[]);
  const submit = async (restoreHome=false) => {
    if (!locations || busy) return;
    setBusy(true);setError("");
    try {
      await locations.update(restoreHome ? {restoreHome:true} : {location:draft,saveFavorite,makeHome,label,confirmDifferent:confirmed,...(saveOnly ? {select:false,propertyId} : {})});
      onClose();
    } catch(e) {setError(e instanceof Error ? e.message : "Could not save this address. Try again.");}
    finally {setBusy(false);}
  };
  return <Modal isOpen onClose={()=>{if(!busy)onClose();}} title={saveOnly ? propertyId ? "Edit property" : "Add a property" : "Service location"} size="lg"><div className={popup.stack}>
    {locations?.error && <p role="alert" className={popup.alert}>{locations.error} <button type="button" className="font-semibold underline" onClick={locations.reload}>Try again</button></p>}
    {!locations?.ready && !locations?.error && <p role="status" className={popup.note}>Loading your properties…</p>}
    {existingOrder && <p className="dialog-message">This selection is for your next booking. Your current work order keeps its address.</p>}
    {!saveOnly && (locations?.home || !!locations?.properties.length) && <div className={popup.options}>
      {locations?.home && <button className={popup.option} type="button" disabled={busy} aria-pressed={sameServiceAddress(draft,locations.home)} onClick={()=>{edit(locations.home!);setMakeHome(false);setSaveFavorite(false);}}><IconSwap icon={<House />}><House size={16} aria-hidden="true" />Use profile home</IconSwap></button>}
      {!!locations?.properties.length && <label className={popup.field}><span className="sr-only">Saved properties</span><select aria-label="Saved properties" value="" disabled={busy} onChange={e=>{const property=locations.properties.find(p=>p.id===e.target.value);if(property){edit(property);setLabel(property.label);setSaveFavorite(false);setMakeHome(false);}}}><option value="" disabled>Saved properties…</option>{locations.properties.map(p=><option value={p.id} key={p.id}>{p.label} · {p.address}</option>)}</select></label>}
    </div>}
    <fieldset disabled={busy} className={popup.form}>
      <OnboardingAddress compact value={draft} onChange={edit} note={makeHome ? "This will replace the home address on your profile." : saveOnly ? "Saved properties are private. Choose one when you book." : "Operators see this address for your next booking."} />
      <div className={popup.mapCard} aria-label="Selected address preview">
        <div>{valid ? <SnowdMap key={formatServiceAddress(draft)} location={mapped ? `${draft.lat},${draft.lng}` : formatServiceAddress(draft)} compact client markerAddress={formatServiceAddress(draft)} onLocationResolved={resolve} /> : <div className={popup.emptyMap}>Choose an address to preview its location.</div>}</div>
        <div className={popup.mapFoot}><div><strong>{draft.address || "No address yet"}</strong><span>{valid && !mapped ? "Finding it on the map… Select a suggestion if this takes long." : [draft.city, draft.province, draft.postalCode].filter(Boolean).join(", ") || "Start typing to search"}</span></div></div>
      </div>
      <fieldset><legend>Driveway size</legend><div className={popup.options}>{([["small","1-car"],["medium","2-car"],["large","3+ car"]] as const).map(([size,text])=><button type="button" key={size} className={popup.option} aria-pressed={(draft.propertySize || "medium") === size} onClick={()=>edit({...draft,propertySize:size as PropertySize})}><IconSwap icon={<Car />}>{text}</IconSwap></button>)}</div></fieldset>
      {!saveOnly && <label className={popup.check}><input type="checkbox" checked={saveFavorite} onChange={e=>setSaveFavorite(e.target.checked)} /><span className={popup.tick} aria-hidden="true"><Check size={13} strokeWidth={3} /></span><span>Save as a favourite property</span></label>}
      {saveFavorite && <fieldset><legend>Property type</legend><div className={popup.options}>{([["Main house",House],["Rental house",KeyRound],["Business",Building2]] as const).map(([kind,Icon])=><button type="button" key={kind} className={popup.option} aria-pressed={label === kind} onClick={()=>setLabel(kind)}><IconSwap icon={<Icon />}><Icon size={16} aria-hidden="true" />{kind}</IconSwap></button>)}</div></fieldset>}
      {saveFavorite && <label>Property name<input value={label} maxLength={60} onChange={e=>setLabel(e.target.value)} placeholder="For example, Lake house" /></label>}
      <label className={popup.check}><input type="checkbox" checked={makeHome} onChange={e=>setMakeHome(e.target.checked)} /><span className={popup.tick} aria-hidden="true"><Check size={13} strokeWidth={3} /></span><span>Make this my profile home</span></label>
      {different && valid && <label className={popup.check}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} /><span className={popup.tick} aria-hidden="true"><Check size={13} strokeWidth={3} /></span><span>This differs from your profile home{locations?.home ? ` (${formatServiceAddress(locations.home)})` : ""}. Yes, I want service at {formatServiceAddress(draft)}{makeHome ? " and to make it my new home" : ""}.</span></label>}
    </fieldset>
    {error && <p role="alert" className={popup.alert}>{error}</p>}
    <div className={popup.actions}>
      {!saveOnly && locations?.selectedLocation && <button type="button" className="dialog-btn" data-tone="neutral" disabled={busy} onClick={()=>void submit(true)}><IconSwap icon={<RotateCcw />}>Reset to profile home</IconSwap></button>}
      <button type="button" className="dialog-btn action-shine" data-tone="primary" disabled={busy || !locations?.ready || !valid || !mapped || (different && !confirmed) || (saveFavorite && !label.trim())} onClick={()=>void submit()}><IconSwap icon={<MapPin />}>{busy ? "Saving…" : saveOnly ? "Save property" : "Use this location"}</IconSwap></button>
    </div>
  </div></Modal>;
}

"use client";
import { useCallback, useState } from "react";
import Modal from "@/components/ui/Modal";
import OnboardingAddress from "@/components/OnboardingAddress";
import SnowdMap from "@/components/SnowdMap";
import { useServiceLocation } from "@/context/ServiceLocationContext";
import { formatServiceAddress, sameServiceAddress, type ServiceLocation } from "@/lib/serviceLocations";
import type { PropertySize } from "@/lib/types";
import styles from "./service-location.module.css";

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
  return <Modal isOpen onClose={()=>{if(!busy)onClose();}} title={saveOnly ? propertyId ? "Edit property" : "Add a property" : "Service location"} size="lg"><div className={styles.editor}>
    {locations?.error && <p role="alert">{locations.error} <button type="button" onClick={locations.reload}>Try again</button></p>}
    {!locations?.ready && !locations?.error && <p role="status">Loading your properties…</p>}
    {existingOrder && <p className={styles.note}>This selection is for your next booking. Your current work order keeps its address.</p>}
    {!saveOnly && locations?.home && <button className="btn-secondary" type="button" disabled={busy} onClick={()=>{edit(locations.home!);setMakeHome(false);setSaveFavorite(false);}}>Use profile home</button>}
    {!saveOnly && !!locations?.properties.length && <label>Saved properties<select value="" disabled={busy} onChange={e=>{const property=locations.properties.find(p=>p.id===e.target.value);if(property){edit(property);setLabel(property.label);setSaveFavorite(false);setMakeHome(false);}}}><option value="" disabled>Choose a property</option>{locations.properties.map(p=><option value={p.id} key={p.id}>{p.label} · {p.address}</option>)}</select></label>}
    <fieldset disabled={busy} className={styles.fields}>
      <OnboardingAddress compact value={draft} onChange={edit} note={makeHome ? "This will replace the home address on your profile." : saveOnly ? "Saved properties are private. Choose one when you book." : "Operators see this address for your next booking."} />
      <label>Driveway size<select value={draft.propertySize || "medium"} onChange={e=>edit({...draft,propertySize:e.target.value as PropertySize})}><option value="small">1-car driveway</option><option value="medium">2-car driveway</option><option value="large">3+ car driveway</option></select></label>
      <div className={styles.preview} aria-label="Selected address preview">{valid ? <SnowdMap key={formatServiceAddress(draft)} location={mapped ? `${draft.lat},${draft.lng}` : formatServiceAddress(draft)} compact client markerAddress={formatServiceAddress(draft)} onLocationResolved={resolve} /> : <p>Choose an address to preview its location.</p>}</div>
      {valid && !mapped && <p role="status">Waiting for the map location. Select an address suggestion if the preview is unavailable.</p>}
      {!saveOnly && <label className={styles.check}><input type="checkbox" checked={saveFavorite} onChange={e=>setSaveFavorite(e.target.checked)} />Save as a favourite property</label>}
      {saveFavorite && <label>Property name<input value={label} maxLength={60} onChange={e=>setLabel(e.target.value)} placeholder="For example, Lake house" /></label>}
      <label className={styles.check}><input type="checkbox" checked={makeHome} onChange={e=>setMakeHome(e.target.checked)} />Make this my profile home</label>
      {different && valid && <div className={styles.confirm}><p>This differs from your profile home{locations?.home ? ` (${formatServiceAddress(locations.home)})` : ""}.</p><label className={styles.check}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} />Yes, I want service at {formatServiceAddress(draft)}{makeHome ? " and to make it my new home" : ""}.</label></div>}
    </fieldset>
    {error && <p role="alert">{error}</p>}
    <button type="button" className="btn-primary" disabled={busy || !locations?.ready || !valid || !mapped || (different && !confirmed) || (saveFavorite && !label.trim())} onClick={()=>void submit()}>{busy ? "Saving…" : saveOnly ? "Save property" : "Use this location"}</button>
    {!saveOnly && locations?.selectedLocation && <button type="button" className="btn-secondary" disabled={busy} onClick={()=>void submit(true)}>Reset to profile home</button>}
  </div></Modal>;
}

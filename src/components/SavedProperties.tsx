"use client";
import { useState } from "react";
import { useServiceLocation } from "@/context/ServiceLocationContext";
import { formatServiceAddress, sameServiceAddress, type SavedProperty, type ServiceLocation } from "@/lib/serviceLocations";
import ServiceLocationPicker from "./ServiceLocationPicker";
import styles from "./service-location.module.css";
const blank:ServiceLocation={address:"",city:"",province:"",postalCode:"",propertySize:"medium"};
export default function SavedProperties() {
  const locations=useServiceLocation();
  const [editing,setEditing]=useState<{location:ServiceLocation;id?:string;saveOnly:boolean} | null>(null);
  const [removing,setRemoving]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const remove=async (p:SavedProperty)=>{
    if (!locations || busy) return;
    setBusy(true);setError("");
    try { await locations.update({removePropertyId:p.id}); setRemoving(""); }
    catch(e) { setError(e instanceof Error ? e.message : "Could not remove this property. Try again."); }
    finally { setBusy(false); }
  };
  const active=(value:ServiceLocation)=>sameServiceAddress(value,locations?.location);
  return <section className={styles.properties} aria-labelledby="saved-properties-title"><h2 id="saved-properties-title">Other properties</h2>
    {locations?.error ? <p role="alert">{locations.error} <button onClick={locations.reload}>Try again</button></p> : !locations?.ready ? <p role="status">Loading properties…</p> : <>
      <ul>
        {locations.home && <li><div><strong>Profile home{active(locations.home) && <span className={styles.badge}>Service address</span>}</strong><p>{formatServiceAddress(locations.home)}</p></div>{!active(locations.home) && <button className="btn-secondary" disabled={busy} onClick={()=>setEditing({location:locations.home!,saveOnly:false})}>Use for service</button>}</li>}
        {locations.properties.map(p=><li key={p.id}><div><strong>{p.label}{active(p) && <span className={styles.badge}>Service address</span>}</strong><p>{formatServiceAddress(p)}</p></div>
          {removing === p.id ? <div className={styles.actions}><button className="btn-secondary" disabled={busy} onClick={()=>setRemoving("")}>Keep</button><button className="btn-primary" disabled={busy} aria-label={`Confirm removing ${p.label}`} onClick={()=>void remove(p)}>{busy ? "Removing…" : "Remove"}</button></div>
          : <div className={styles.actions}>{!active(p) && <button className="btn-secondary" disabled={busy} aria-label={`Use ${p.label} for service`} onClick={()=>setEditing({location:p,id:p.id,saveOnly:false})}>Use for service</button>}<button className="btn-secondary" disabled={busy} aria-label={`Edit ${p.label}`} onClick={()=>setEditing({location:p,id:p.id,saveOnly:true})}>Edit</button><button className="btn-secondary" disabled={busy} aria-label={`Remove ${p.label}`} onClick={()=>setRemoving(p.id)}>Remove</button></div>}
        </li>)}
      </ul>
      {error && <p role="alert">{error}</p>}
      {!locations.properties.length && <p className="my-4 text-sm">Add a rental house or business property, then pick it when you book.</p>}
      <button className="btn-primary" disabled={busy} onClick={()=>setEditing({location:blank,saveOnly:true})}>Add a property</button>
    </>}
    {editing && <ServiceLocationPicker initialSaveFavorite={editing.saveOnly} saveOnly={editing.saveOnly} propertyId={editing.id} initial={editing.location} onClose={()=>setEditing(null)} />}
  </section>;
}

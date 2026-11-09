"use client";

import BackButton from "@/components/BackButton";
import OnboardingAddress from "@/components/OnboardingAddress";
import SnowdMap from "@/components/SnowdMap";
import { useAuth } from "@/context/AuthContext";
import { useServiceLocation } from "@/context/ServiceLocationContext";
import { db, storage } from "@/lib/firebase";
import { formatServiceAddress, propertyUse, sameServiceAddress, type ServiceLocation } from "@/lib/serviceLocations";
import { PROPERTY_USES, SHOVELING_SERVICES, type ClientProfile, type PropertySize, type PropertyUse, type ServiceType } from "@/lib/types";
import popup from "@/components/ui/popup.module.css";
import { doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Building2, Check, House, ImagePlus, KeyRound, Snowflake, Tent, Trash2, TreePine, X } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import styles from "./property.module.css";

type Draft = { label: string; location: ServiceLocation; use: PropertyUse; areaSqft: string; serviceTypes: ServiceType[]; instructions: string; photos: string[] };

const USE_ICONS: Record<PropertyUse, typeof House> = { home: House, rental: KeyRound, business: Building2, cottage: TreePine, other: Tent };
const SIZES = [["small", "1-car driveway"], ["medium", "2-car driveway"], ["large", "3+ car driveway"], ["commercial", "Commercial lot"]] as const;
const MAX_PHOTOS = 6;

export default function PropertyEditPage() {
  const id = decodeURIComponent(useParams().id as string);
  const isHome = id === "home";
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const locations = useServiceLocation();
  const client = profile?.role === "client" ? profile as ClientProfile : null;
  const property = isHome ? null : locations?.properties.find(p => p.id === id);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fill the form once the property has loaded; later reloads never overwrite unsaved edits.
  const source = isHome ? client && locations?.home : property;
  useEffect(() => {
    if (draft || !source || !client) return;
    if (isHome) {
      const d = client.propertyDetails;
      setDraft({ label: "Home", location: locations!.home!, use: d?.use || "home", areaSqft: d?.areaSqft ? String(d.areaSqft) : "", serviceTypes: d?.serviceTypes || [], instructions: d?.specialInstructions || "", photos: d?.photos || [] });
    } else if (property) {
      setDraft({ label: property.label, location: property, use: propertyUse(property), areaSqft: property.areaSqft ? String(property.areaSqft) : "", serviceTypes: property.serviceTypes || [], instructions: property.instructions || "", photos: property.photos || [] });
    }
  }, [draft, source, client, isHome, property, locations]);

  const edit = (patch: Partial<Draft>) => { setDraft(current => current && { ...current, ...patch }); setNotice(""); setError(""); };
  const editLocation = (value: ServiceLocation) => setDraft(current => current && { ...current, location: { ...value, propertySize: value.propertySize || current.location.propertySize || "medium" } });
  const resolve = useCallback((point: { lat: number; lng: number }) => {
    setDraft(current => !current || (Number.isFinite(current.location.lat) && Number.isFinite(current.location.lng)) ? current : { ...current, location: { ...current.location, ...point } });
  }, []);

  if (profile && profile.role !== "client") return <Notice title="Properties are for client accounts" />;
  if (locations?.error) return <Notice title="Could not load your properties" action={<button type="button" className="btn-secondary" onClick={locations.reload}>Try again</button>} />;
  if (!draft) {
    if (locations?.ready && client && !source) return <Notice title="Property not found" text="It may have been removed." />;
    return <div className={styles.notice} role="status"><div className="animate-spin-slow"><Image src="/logo.png" alt="" width={40} height={40} /></div><p>Loading property…</p></div>;
  }

  const { location } = draft;
  const validAddress = Boolean(location.address.trim() && location.city.trim() && location.province.trim() && /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(location.postalCode.trim()));
  const mapped = Number.isFinite(location.lat) && Number.isFinite(location.lng);
  const area = draft.areaSqft.trim() ? Number(draft.areaSqft) : undefined;
  const validArea = area === undefined || (Number.isInteger(area) && area > 0 && area <= 1_000_000);
  const canSave = !busy && validAddress && mapped && validArea && draft.label.trim().length > 0 && draft.label.length <= 60;
  const original = isHome ? locations?.home : property;
  const addressChanged = !sameServiceAddress(location, original);

  const uploadPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!client || !files.length) return;
    if (draft.photos.length + files.length > MAX_PHOTOS) { setError(`You can add up to ${MAX_PHOTOS} photos per property.`); return; }
    if (files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) { setError("Choose JPG, PNG or WebP images under 5 MB each."); return; }
    setBusy("photos"); setError("");
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const storageRef = ref(storage, `property-photos/${client.uid}/${crypto.randomUUID()}`);
        await uploadBytes(storageRef, file);
        uploaded.push(await getDownloadURL(storageRef));
      }
      setDraft(current => current && { ...current, photos: [...current.photos, ...uploaded] });
      setNotice("Photos added. Save to keep them.");
    } catch (e) {
      console.error("Property photo upload failed", e);
      setError("Photos could not be uploaded. Please try again.");
    } finally { setBusy(""); }
  };

  const save = async () => {
    if (!locations || !client || !canSave) return;
    setBusy("save"); setError(""); setNotice("");
    try {
      if (isHome) {
        if (addressChanged) await locations.update({ location, makeHome: true, select: false });
        await updateDoc(doc(db, "users", client.uid), {
          "propertyDetails.use": draft.use,
          "propertyDetails.propertySize": location.propertySize || "medium",
          "propertyDetails.areaSqft": area ?? null,
          "propertyDetails.serviceTypes": draft.serviceTypes,
          "propertyDetails.specialInstructions": draft.instructions.trim(),
          "propertyDetails.photos": draft.photos,
        });
        await refreshProfile();
      } else {
        await locations.update({ location, label: draft.label.trim(), saveFavorite: true, select: false, propertyId: id, details: { use: draft.use, areaSqft: area, serviceTypes: draft.serviceTypes, instructions: draft.instructions, photos: draft.photos } });
      }
      setNotice("Property saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this property. Try again.");
    } finally { setBusy(""); }
  };

  const remove = async () => {
    if (!locations || busy) return;
    setBusy("delete"); setError("");
    try {
      await locations.update({ removePropertyId: id });
      router.push(`/dashboard/u/${encodeURIComponent(client!.uid)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete this property. Try again.");
      setBusy("");
    }
  };

  return <div className={styles.page}>
    <div><BackButton href={client ? `/dashboard/u/${encodeURIComponent(client.uid)}` : "/dashboard"} label="Profile" /></div>
    <header className={styles.header}>
      <p className={styles.eyebrow}>{isHome ? "Profile home" : "Saved property"}</p>
      <h1>{draft.label || "Untitled property"}</h1>
      <p>{formatServiceAddress(original)}</p>
    </header>

    <fieldset disabled={!!busy} className={`${popup.form} ${styles.form}`}>
      <section className={styles.card} aria-labelledby="use-title">
        <h2 id="use-title">What is this property?</h2>
        <div className={popup.options}>{PROPERTY_USES.map(([use, text]) => {
          const Icon = USE_ICONS[use];
          return <button type="button" key={use} className={popup.option} aria-pressed={draft.use === use} onClick={() => edit({ use })}><Icon size={16} aria-hidden="true" />{text}</button>;
        })}</div>
        {!isHome && <label>Property name<input value={draft.label} maxLength={60} onChange={e => edit({ label: e.target.value })} placeholder="For example, Lake house" /></label>}
      </section>

      <section className={styles.card} aria-labelledby="photos-title">
        <div className={styles.head}><h2 id="photos-title">Photos</h2><span>{draft.photos.length}/{MAX_PHOTOS}</span></div>
        <p>Show operators the driveway, walkways and anywhere snow should go.</p>
        {draft.photos.length > 0 && <ul className={styles.photos}>{draft.photos.map((url, index) => <li key={url}>
          <Image src={url} alt={`Property photo ${index + 1}`} width={360} height={360} unoptimized />
          <button type="button" className={styles.removePhoto} aria-label={`Remove photo ${index + 1}`} onClick={() => edit({ photos: draft.photos.filter(p => p !== url) })}><X size={16} aria-hidden="true" /></button>
        </li>)}</ul>}
        {draft.photos.length < MAX_PHOTOS && <label className={`btn-secondary ${styles.upload}`}>
          <ImagePlus size={16} aria-hidden="true" />{busy === "photos" ? "Uploading…" : "Add photos"}
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadPhotos} className="sr-only" />
        </label>}
      </section>

      <section className={styles.card} aria-labelledby="size-title">
        <h2 id="size-title">Size</h2>
        <div className={popup.options}>{SIZES.map(([size, text]) => <button type="button" key={size} className={popup.option} aria-pressed={(location.propertySize || "medium") === size} onClick={() => { editLocation({ ...location, propertySize: size as PropertySize }); setNotice(""); }}>{text}</button>)}</div>
        <label>Area to clear (sq ft, optional)<input inputMode="numeric" value={draft.areaSqft} onChange={e => edit({ areaSqft: e.target.value.replace(/[^\d]/g, "").slice(0, 7) })} placeholder="For example, 600" aria-invalid={!validArea} /></label>
      </section>

      <section className={styles.card} aria-labelledby="needs-title">
        <h2 id="needs-title">Requirements</h2>
        <p>What should be cleared every visit?</p>
        <div className={popup.options}>{SHOVELING_SERVICES.map(([service, text]) => <label key={service} className={popup.option}>
          <input type="checkbox" checked={draft.serviceTypes.includes(service)} onChange={e => edit({ serviceTypes: e.target.checked ? [...draft.serviceTypes, service] : draft.serviceTypes.filter(s => s !== service) })} />
          <span className={popup.tick} aria-hidden="true"><Check size={13} strokeWidth={3} /></span>{text}
        </label>)}</div>
        <label>Instructions for operators<textarea rows={4} maxLength={1000} value={draft.instructions} onChange={e => edit({ instructions: e.target.value })} placeholder="For example, salt the front steps, clear before 7 am, side gate code 1234" /></label>
      </section>

      <section className={styles.card} aria-labelledby="address-title">
        <h2 id="address-title">Address</h2>
        <OnboardingAddress compact value={location} onChange={value => { editLocation(value); setNotice(""); setError(""); }} note={isHome ? "Changing this moves the home address on your profile." : "Saved properties are private. Choose one when you book."} />
        <div className={popup.mapCard} aria-label="Address preview">
          <div>{validAddress ? <SnowdMap key={formatServiceAddress(location)} location={mapped ? `${location.lat},${location.lng}` : formatServiceAddress(location)} compact client markerAddress={formatServiceAddress(location)} onLocationResolved={resolve} /> : <div className={popup.emptyMap}>Enter a complete address to see it on the map.</div>}</div>
          <div className={popup.mapFoot}><div><strong>{location.address || "No address yet"}</strong><span>{validAddress && !mapped ? "Finding it on the map… Select a suggestion if this takes long." : [location.city, location.province, location.postalCode].filter(Boolean).join(", ")}</span></div></div>
        </div>
      </section>
    </fieldset>

    {error && <p role="alert" className={popup.alert}>{error}</p>}
    {notice && <p role="status" className={styles.saved}>{notice}</p>}

    <div className={styles.actions}>
      <button type="button" className="btn-primary" disabled={!canSave} onClick={() => void save()}>{busy === "save" ? "Saving…" : "Save property"}</button>
      {!isHome && (confirmDelete
        ? <div className={styles.confirm} role="group" aria-label="Confirm delete">
          <span>Delete {draft.label}?</span>
          <button type="button" className="btn-secondary" disabled={!!busy} onClick={() => setConfirmDelete(false)}>Keep</button>
          <button type="button" className={styles.danger} disabled={!!busy} onClick={() => void remove()}>{busy === "delete" ? "Deleting…" : "Delete"}</button>
        </div>
        : <button type="button" className={styles.deleteLink} disabled={!!busy} onClick={() => setConfirmDelete(true)}><Trash2 size={15} aria-hidden="true" />Delete property</button>)}
      {isHome && <p className={styles.hint}>Your profile home can be moved but not deleted.</p>}
    </div>
  </div>;
}

function Notice({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return <div className={styles.notice}>
    <Snowflake className="h-12 w-12 opacity-30" aria-hidden="true" />
    <h1>{title}</h1>
    {text && <p>{text}</p>}
    {action || <BackButton href="/dashboard" label="Back" />}
  </div>;
}

"use client";

import BackButton from "@/components/BackButton";
import ProfileMap, { type ProfilePlace } from "@/components/ProfileMap";
import StarRating from "@/components/StarRating";
import UserAvatar from "@/components/UserAvatar";
import PhotoViewer from "@/components/work-orders/PhotoViewer";
import { useAuth } from "@/context/AuthContext";
import { useServiceLocation } from "@/context/ServiceLocationContext";
import { db } from "@/lib/firebase";
import { formatServiceAddress } from "@/lib/serviceLocations";
import { SERVICE_LABELS, type ClientProfile, type OperatorProfile, type UserProfile } from "@/lib/types";
import type { ProfileJob, ProfileReview } from "@/app/api/profiles/[uid]/route";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Briefcase, MapPin, MessageSquare, Pencil, Snowflake } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "./profile.module.css";

const formatDate = (ms: number | null) => ms ? new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
// Other people only ever see roughly where someone is, never the exact address.
const approx = (value?: number | null) => value == null || !Number.isFinite(value) ? undefined : Math.round(value * 100) / 100;

export default function PublicProfilePage() {
  const uid = useParams().uid as string;
  const router = useRouter();
  const { user, profile: me } = useAuth();
  const locations = useServiceLocation();
  const [person, setPerson] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<{ reviews: ProfileReview[]; jobs: ProfileJob[]; completedJobs: number } | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwn = me?.uid === uid;
  const isOperator = person?.role === "operator";
  const operator = person as OperatorProfile;
  const client = person as ClientProfile;

  useEffect(() => {
    if (!uid) return;
    let active = true;
    getDoc(doc(db, "users", uid))
      .then(snap => { if (active) setPerson(snap.exists() ? { ...(snap.data() as UserProfile), uid } : null); })
      .catch(error => console.error("Error fetching profile:", error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [uid]);

  useEffect(() => {
    if (!user || !isOperator) return;
    let active = true;
    user.getIdToken()
      .then(token => fetch(`/api/profiles/${encodeURIComponent(uid)}`, { headers: { Authorization: `Bearer ${token}` } }))
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active) setRecord(data || { reviews: [], jobs: [], completedJobs: 0 }); })
      .catch(() => { if (active) setRecord({ reviews: [], jobs: [], completedJobs: 0 }); });
    return () => { active = false; };
  }, [user, uid, isOperator]);

  useEffect(() => {
    if (me?.role !== "client" || isOwn) return;
    const mine = me as ClientProfile;
    setSaved(!!mine.savedOperators?.includes(uid) || mine.favoriteOperatorId === uid);
  }, [me, uid, isOwn]);

  // Your own profile shows your home and every saved property; anyone else's shows only their area.
  const places = useMemo<ProfilePlace[]>(() => {
    if (!person || isOperator || !isOwn) return [];
    const home = locations?.home;
    return [
      ...(home ? [{ id: "home", label: "Home", address: formatServiceAddress(home), lat: home.lat, lng: home.lng, home: true }] : []),
      ...(locations?.properties || []).map(p => ({ id: p.id, label: p.label, address: formatServiceAddress(p), lat: p.lat, lng: p.lng })),
    ];
  }, [person, isOperator, isOwn, locations?.home, locations?.properties]);

  if (loading) {
    return <div className={styles.notice} role="status">
      <div className="animate-spin-slow"><Image src="/logo.png" alt="" width={40} height={40} /></div>
      <p>Loading profile…</p>
    </div>;
  }
  if (!person) {
    return <div className={styles.notice}>
      <Snowflake className="h-12 w-12 opacity-30" aria-hidden="true" />
      <h1>User not found</h1>
      <BackButton href="/dashboard" label="Back" />
    </div>;
  }
  if (!isOwn && me?.role !== "admin" && isOperator && person.idVerified !== true) {
    return <div className={styles.notice}>
      <Snowflake className="h-12 w-12 text-amber-500" aria-hidden="true" />
      <h1>Profile not available</h1>
      <p>This account is pending identity verification by our team. Once approved, their profile will be visible here.</p>
      <BackButton href="/dashboard" label="Back" />
    </div>;
  }

  const name = (isOperator && operator.businessName) || person.displayName;
  const basedIn = [person.city, person.province].filter(Boolean).join(", ");
  const cityMode = isOperator && operator.serviceAreaMode === "cities" && !!operator.serviceAreas?.length;
  const radiusKm = operator.serviceRadius || 10;
  const areaAddress = [person.city, person.province, person.postalCode, "Canada"].filter(Boolean).join(", ");
  const mapCaption = isOperator
    ? cityMode ? `Works in ${operator.serviceAreas!.map(area => area.city).join(", ")}` : `Works within ${radiusKm} km of ${person.city || "their base"}`
    : isOwn ? places.length > 1 ? `Your home and ${places.length - 1} saved ${places.length === 2 ? "property" : "properties"}` : "Your home"
    : `Located in ${basedIn}`;
  const propertyPhotos = client.propertyDetails?.photos || [];
  const showPropertyPhotos = !isOperator && (isOwn || me?.role === "operator" || me?.role === "admin");
  const reviews = record?.reviews || [];
  const average = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : operator.rating || 0;
  const jobPhotos = operator.portfolioPhotos || [];

  const toggleSaved = async () => {
    if (!me?.uid || saving) return;
    setSaving(true);
    try {
      const mine = me as ClientProfile;
      const current = [...new Set([...(mine.savedOperators || []), ...(mine.favoriteOperatorId ? [mine.favoriteOperatorId] : [])])];
      await updateDoc(doc(db, "users", me.uid), { savedOperators: saved ? current.filter(id => id !== uid) : [...new Set([...current, uid])], favoriteOperatorId: null });
      setSaved(!saved);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setSaving(false);
    }
  };

  return <div className={styles.page}>
    <div><BackButton href="/dashboard" label="Back" /></div>

    <header className={styles.header}>
      <UserAvatar photoURL={person.avatar} logoURL={isOperator ? operator.logoUrl : undefined} role={person.role} displayName={name} size={112} rounded="full" className={styles.logo} />
      <h1 className={styles.name}>{name}</h1>
      {basedIn && <p className={styles.location}><MapPin size={15} aria-hidden="true" />{basedIn}</p>}
      <div className={styles.actions}>
        {isOwn && <Link href="/dashboard/settings" className={styles.action}><Pencil size={15} aria-hidden="true" />Edit profile</Link>}
        {!isOwn && me?.role === "client" && isOperator && <>
          <button type="button" className={`${styles.action} ${styles.primary}`} onClick={() => router.push(`/dashboard/find?operator=${encodeURIComponent(uid)}`)}><Briefcase size={15} aria-hidden="true" />Hire</button>
          <button type="button" className={styles.action} onClick={toggleSaved} disabled={saving} aria-pressed={saved}>{saved ? "★ Saved" : "☆ Save"}</button>
        </>}
        {!isOwn && <button type="button" className={styles.action} onClick={() => router.push("/dashboard/messages")}><MessageSquare size={15} aria-hidden="true" />Message</button>}
      </div>
    </header>

    <section className={styles.card} aria-label={isOperator ? "Work area" : "Location"}>
      <div className={styles.map}>
        {isOperator
          ? cityMode ? <ProfileMap cities={operator.serviceAreas} /> : <ProfileMap area={{ lat: approx(person.lat), lng: approx(person.lng), address: areaAddress, radiusKm }} />
          : isOwn ? <ProfileMap places={places} /> : <ProfileMap area={{ lat: approx(person.lat), lng: approx(person.lng), address: areaAddress, radiusKm: 1 }} />}
      </div>
      <p className={styles.caption}>{mapCaption}</p>
    </section>

    {showPropertyPhotos && <section className={`${styles.card} ${styles.section}`}>
      <div className={styles.sectionHead}><h2>Property photos</h2>{propertyPhotos.length > 0 && <span>{propertyPhotos.length}</span>}</div>
      {propertyPhotos.length ? <div className={styles.photos}>{propertyPhotos.map((src, i) => <PhotoViewer key={src} src={src} title={`Property photo ${i + 1}`} className={styles.photo} />)}</div>
        : <p className={styles.empty}>{isOwn ? <>No property photos yet. <Link href="/dashboard/settings/properties" className="underline">Add photos</Link></> : "No property photos yet."}</p>}
    </section>}

    {isOperator && <section className={`${styles.card} ${styles.section}`}>
      <div className={styles.sectionHead}><h2>Jobs</h2><span>{Math.max(record?.completedJobs || 0, operator.completedJobs || 0)} completed</span></div>
      {jobPhotos.length > 0 && <div className={styles.photos}>{jobPhotos.map((src, i) => <PhotoViewer key={src} src={src} title={`Job photo ${i + 1}`} className={styles.photo} />)}</div>}
      {record?.jobs.length ? <ul className={styles.list}>{record.jobs.map(job => <li key={job.id}>
        <div className={styles.row}><strong>{job.serviceTypes.map(s => SERVICE_LABELS[s] || s).join(", ") || "Snow removal"}</strong><span className={styles.muted}>{formatDate(job.completedAt)}</span></div>
        <div className={styles.row}><span className={styles.muted}>{job.city}</span>{job.rating ? <StarRating rating={job.rating} size="sm" /> : null}</div>
      </li>)}</ul> : !jobPhotos.length && <p className={styles.empty}>No completed jobs yet.</p>}
    </section>}

    {isOperator && <section className={`${styles.card} ${styles.section}`}>
      <div className={styles.sectionHead}><h2>Reviews</h2>{reviews.length > 0 && <span>{reviews.length}</span>}</div>
      {reviews.length > 0 && <div className={styles.score}><b>{average.toFixed(1)}</b><StarRating rating={average} size="md" /></div>}
      {reviews.length ? <ul className={styles.list}>{reviews.map(review => <li key={review.id}>
        <div className={styles.row}><StarRating rating={review.rating} size="sm" /><span className={styles.muted}>{review.reviewer} · {formatDate(review.createdAt)}</span></div>
        {review.comment && <p className={styles.comment}>{review.comment}</p>}
      </li>)}</ul> : <p className={styles.empty}>{record ? "No reviews yet." : "Loading reviews…"}</p>}
    </section>}
  </div>;
}

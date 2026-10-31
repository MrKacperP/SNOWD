"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { profileLocation, type PropertyState, type ServiceLocation } from "@/lib/serviceLocations";
import type { ClientProfile } from "@/lib/types";
export type PropertyUpdate = { location?: ServiceLocation; label?: string; saveFavorite?: boolean; makeHome?: boolean; restoreHome?: boolean; confirmDifferent?: boolean; select?: boolean; propertyId?: string; removePropertyId?: string };
type Context = PropertyState & { home: ServiceLocation | null; location: ServiceLocation | null; ready: boolean; error: string; reload:()=>void; update:(value:PropertyUpdate)=>Promise<void> };
export const ServiceLocationContext = createContext<Context | null>(null);
export const useServiceLocation = () => useContext(ServiceLocationContext);
export default function ServiceLocationProvider({children}:{children:React.ReactNode}) {
  const {user,profile,refreshProfile} = useAuth();
  const [state,setState] = useState<PropertyState & {uid:string}>({uid:"",properties:[],selectedLocation:null});
  const [error,setError] = useState("");
  const [revision,setRevision] = useState(0);
  const request = useCallback(async (body?:PropertyUpdate) => {
    if (!user) throw new Error("Please sign in again.");
    const response = await fetch("/api/properties",{method:body ? "POST" : "GET",headers:{Authorization:`Bearer ${await user.getIdToken()}`,"Content-Type":"application/json"},...(body ? {body:JSON.stringify(body)} : {})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not save your property.");
    return data as PropertyState;
  },[user]);
  useEffect(()=>{
    if (!user || profile?.role !== "client") return;
    let active=true;
    request().then(data=>{if(active){setState({...data,uid:user.uid});setError("");}}).catch(()=>{if(active)setError("Could not load your properties. Try again before booking.");});
    return ()=>{active=false;};
  },[user,profile?.role,request,revision]);
  const update = useCallback(async (body:PropertyUpdate)=>{
    const data = await request(body);
    if (body.makeHome) await refreshProfile();
    setState({...data,uid:user!.uid});setError("");
  },[request,refreshProfile,user]);
  const home = useMemo(()=>profileLocation(profile as ClientProfile),[profile]);
  const ready = !!user && state.uid === user.uid;
  const value:Context = {properties:ready ? state.properties : [],selectedLocation:ready ? state.selectedLocation : null,home,location:ready ? state.selectedLocation || home : home,ready,error,reload:()=>setRevision(v=>v+1),update};
  return <ServiceLocationContext.Provider value={value}>{children}</ServiceLocationContext.Provider>;
}

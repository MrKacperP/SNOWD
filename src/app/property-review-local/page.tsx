"use client";
import {useState} from "react";
import {ServiceLocationContext,type PropertyUpdate} from "@/context/ServiceLocationContext";
import {type PropertyState,type ServiceLocation,formatServiceAddress} from "@/lib/serviceLocations";
import DashboardMap from "@/components/dashboard/DashboardMap";
import SavedProperties from "@/components/SavedProperties";
import type {ClientProfile,Job} from "@/lib/types";
const initialHome={address:"10 Home Street",city:"Toronto",province:"ON",postalCode:"M5V 2T6",lat:43.65,lng:-79.38,propertySize:"medium" as const};
const other={id:"rental",label:"Rental house with a long property name",address:"25 Other Road",city:"Toronto",province:"ON",postalCode:"M4B 1B3",lat:43.66,lng:-79.39,propertySize:"large" as const};
export default function Review(){
 const [home,setHome]=useState<ServiceLocation>(initialHome),[state,setState]=useState<PropertyState>({properties:[other],selectedLocation:null});
 const [failed,setFailed]=useState(false),[onTheWay,setOnTheWay]=useState(false);
 const job={id:"sample",status:"en-route",address:initialHome.address,city:"Toronto",province:"ON",postalCode:initialHome.postalCode,clientLat:43.65,clientLng:-79.38,operatorApproxLat:43.6525,operatorApproxLng:-79.384,operatorLocationRadiusKm:0.1,operatorLocationUpdatedAt:new Date()} as unknown as Job;
 const update=async (value:PropertyUpdate)=>{if(failed)throw Error("Sample save failed. Try again.");if(value.makeHome)setHome(value.location!);setState(current=>{if(value.removePropertyId)return {...current,properties:current.properties.filter(p=>p.id!==value.removePropertyId)};const saved={...value.location!,id:value.propertyId || `p${current.properties.length+1}`,label:value.label!};const properties=value.saveFavorite ? current.properties.some(p=>p.id===saved.id) ? current.properties.map(p=>p.id===saved.id?saved:p) : [...current.properties,saved] : current.properties;return {properties,selectedLocation:value.select===false ? current.selectedLocation : value.restoreHome || value.makeHome ? null : value.location!};});};
 return <ServiceLocationContext.Provider value={{...state,home,location:state.selectedLocation || home,ready:true,error:"",reload:()=>{},update}}><main style={{padding:16,maxWidth:960,margin:"auto"}}><p>Local review · sample properties and mocked map</p><label><input type="checkbox" checked={failed} onChange={e=>setFailed(e.target.checked)} />Simulate save failure</label> <label><input type="checkbox" checked={onTheWay} onChange={e=>setOnTheWay(e.target.checked)} />Operator on the way</label><DashboardMap role="client" job={onTheWay ? job : undefined} profile={{...home,uid:"sample",role:"client"} as ClientProfile} /><p data-testid="confirmed-location">Confirmed: {formatServiceAddress(state.selectedLocation || home)}</p><SavedProperties /></main></ServiceLocationContext.Provider>;
}

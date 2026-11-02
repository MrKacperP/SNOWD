"use client";
import OperatorWorkOrder from "@/components/work-orders/OperatorWorkOrder";
import type {Job,OperatorProfile} from "@/lib/types";
import {useSearchParams} from "next/navigation";
import {Suspense} from "react";
const operator={uid:"operator",role:"operator",address:"10 Home Street",city:"Toronto",province:"ON",postalCode:"M5V 2T6",lat:43.65,lng:-79.38,idVerified:true} as unknown as OperatorProfile;
const base={id:"order-1049",orderNumber:1049,operatorId:"operator",clientId:"client",address:"180 Matheson Blvd E",city:"Mississauga",province:"ON",postalCode:"L4Z 1V8",clientLat:43.6229,clientLng:-79.6853,propertySize:"medium",serviceTypes:["driveway","walkway"],price:80,paymentMethod:"cash",paymentStatus:"pending",scheduleMode:"asap",scheduledTime:"ASAP",chatId:"chat-1",specialInstructions:"Please salt the front steps too.",createdAt:new Date()} as unknown as Job;
function Review(){
 const state=useSearchParams().get("state")||"pending";
 const job={...base,status:state==="scheduled"?"accepted":state,...(state==="scheduled"?{scheduleMode:"scheduled",scheduledTime:"7:00 AM",scheduledDate:new Date(Date.now()+86400000).toISOString()}:{})} as unknown as Job;
 return <main style={{padding:16,maxWidth:1090,margin:"auto"}}><OperatorWorkOrder job={job} name="Adam Cosza" operator={operator} /></main>;
}
// Sample work order for design checks: ?state=pending | accepted | scheduled | en-route | in-progress
export default function WorkOrderReview(){ return <Suspense><Review /></Suspense>; }

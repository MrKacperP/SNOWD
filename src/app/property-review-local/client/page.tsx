"use client";
import {useState} from "react";
import {ClientHomeView} from "@/components/dashboard/ClientDashboard";
import type {ClientProfile,Job,JobStatus} from "@/lib/types";
const client={uid:"client",role:"client",address:"10 Home Street",city:"Toronto",province:"ON",postalCode:"M5V 2T6",lat:43.65,lng:-79.38} as unknown as ClientProfile;
const statuses:JobStatus[]=["pending","accepted","en-route","in-progress","completed","cancelled"];
export default function ClientReview(){
 const [status,setStatus]=useState<JobStatus>("en-route");
 const [arrival]=useState(()=>new Date(Date.now()+14*60000));
 const job={id:"sample",status,clientId:"client",operatorId:"op",address:"10 Home Street",city:"Toronto",province:"ON",postalCode:"M5V 2T6",clientLat:43.65,clientLng:-79.38,propertySize:"medium",serviceTypes:["driveway"],price:80,paymentMethod:"cash",paymentStatus:"pending",scheduleMode:"asap",scheduledTime:"ASAP",estimatedArrivalAt:arrival,cancellationNotice:true,cancelledBy:"op",createdAt:arrival} as unknown as Job;
 return <main style={{padding:16,maxWidth:1000,margin:"auto"}}><p>Local review · client dashboard work order</p>
  <select aria-label="Status" value={status} onChange={e=>setStatus(e.target.value as JobStatus)}>{statuses.map(s=><option key={s}>{s}</option>)}</select>
  <ClientHomeView key={status} locationLabel="Toronto, ON" activeJobs={[job]} profile={client} operatorNames={{op:"Its Gone"}} operators={{op:{uid:"op",businessName:"Its Gone Snow Co.",displayName:"Marcus Lee"} as never}} savedMinutes={135} loading={false} loadError={false} />
 </main>;
}

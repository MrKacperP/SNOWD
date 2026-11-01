"use client";
import {OperatorHomeView} from "@/components/dashboard/OperatorDashboard";
import type {Job,OperatorProfile,Transaction} from "@/lib/types";
const operator={uid:"operator",role:"operator",address:"10 Home Street",city:"Toronto",province:"ON",postalCode:"M5V 2T6",lat:43.65,lng:-79.38,idVerified:true} as unknown as OperatorProfile;
const offer=(id:string,address:string,lat:number,lng:number,minutesAgo:number)=>({id,status:"pending",operatorId:"operator",clientId:"client",address,city:"Toronto",province:"ON",postalCode:"M4B 1B3",clientLat:lat,clientLng:lng,propertySize:"large",serviceTypes:["driveway","walkway"],price:6000,paymentMethod:"card",paymentStatus:"pending",scheduleMode:"asap",scheduledTime:"ASAP",createdAt:new Date(Date.now()-minutesAgo*60000)}) as unknown as Job;
const paid=(id:string,daysAgo:number,amount:number)=>({id,jobId:`job-${id}`,clientId:"client",operatorId:"operator",amount,paymentMethod:"cash",status:"paid",description:"",serviceTypes:["driveway"],address:"",createdAt:new Date(Date.now()-daysAgo*86400000),completedAt:new Date(Date.now()-daysAgo*86400000)}) as unknown as Transaction;
const transactions=[paid("t1",40,4500),paid("t2",33,6000),paid("t3",30,3500),paid("t4",21,8000),paid("t5",14,5500),paid("t6",9,12000),paid("t7",4,6500),paid("t8",1,9000)];
const accepted={...offer("visit-1","40 King Street East",43.649,-79.375,90),status:"accepted",paymentMethod:"cash",scheduleMode:"scheduled",scheduledTime:"7:00 AM",scheduledDate:new Date(Date.now()+86400000).toISOString()} as unknown as Job;
const declined=()=>({...offer("declined-1","5 Bay Street",43.642,-79.377,3),status:"cancelled",declinedBy:"operator",cancelledBy:"operator",cancelledAt:new Date(),cancellationNotice:true}) as unknown as Job;
// ?single shows one order on its own; the default shows several grouped, plus one just declined (gone after 5 s).
export default function OperatorReview(){
 const single=typeof window!=="undefined"&&new URLSearchParams(window.location.search).has("single");
 if(single) return <main style={{padding:16,maxWidth:1100,margin:"auto"}}><OperatorHomeView operator={operator} jobs={[offer("offer-0","12 Home Street",43.6503,-79.3806,0)]} clientNames={{client:"Dana Whitfield"}} loading={false} loadError={false} transactions={transactions} earningsLoading={false} earningsError={false} /></main>;
 return <main style={{padding:16,maxWidth:1100,margin:"auto"}}><p>Local review · sample operator with pending offers, a confirmed visit and a declined request</p>
  <OperatorHomeView operator={operator} jobs={[declined(),accepted,offer("offer-1","25 Other Road",43.66,-79.39,5),offer("offer-0","12 Home Street",43.6503,-79.3806,0),offer("offer-2","300 Front Street West",43.643,-79.388,1),{...offer("offer-3","88 Queens Quay West",43.640,-79.380,2),scheduleMode:"scheduled",scheduledTime:"9:00 AM",scheduledDate:new Date(Date.now()+5*86400000).toISOString()} as unknown as Job]} clientNames={{client:"Dana Whitfield"}} loading={false} loadError={false} transactions={transactions} earningsLoading={false} earningsError={false} />
 </main>;
}

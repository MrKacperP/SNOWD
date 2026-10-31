"use client";
import {OperatorHomeView} from "@/components/dashboard/OperatorDashboard";
import type {Job,OperatorProfile} from "@/lib/types";
const operator={uid:"operator",role:"operator",address:"10 Home Street",city:"Toronto",province:"ON",postalCode:"M5V 2T6",lat:43.65,lng:-79.38,idVerified:true} as unknown as OperatorProfile;
const offer=(id:string,address:string,lat:number,lng:number,minutesAgo:number)=>({id,status:"pending",operatorId:"operator",clientId:"client",address,city:"Toronto",province:"ON",postalCode:"M4B 1B3",clientLat:lat,clientLng:lng,propertySize:"large",serviceTypes:["driveway","walkway"],price:6000,paymentMethod:"card",paymentStatus:"pending",scheduleMode:"asap",scheduledTime:"ASAP",createdAt:{toMillis:()=>Date.now()-minutesAgo*60000}}) as unknown as Job;
export default function OperatorReview(){
 return <main style={{padding:16,maxWidth:1100,margin:"auto"}}><p>Local review · sample operator with two pending offers</p>
  <OperatorHomeView operator={operator} jobs={[offer("offer-1","25 Other Road",43.66,-79.39,5),offer("offer-2","300 Front Street West",43.643,-79.388,1)]} clientNames={{client:"Dana Whitfield"}} loading={false} loadError={false} transactions={[]} earningsLoading={false} earningsError={false} />
 </main>;
}

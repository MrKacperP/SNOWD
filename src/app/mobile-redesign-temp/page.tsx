"use client";
import { useState } from "react";
import { ClientHomeView } from "@/components/dashboard/ClientDashboard";
import MobileNavigation from "@/components/dashboard/MobileNavigation";
import JobFilters from "@/components/work-orders/JobFilters";
import Modal from "@/components/ui/Modal";
import { HomeActions } from "@/components/dashboard/HomeActions";
import type { Job } from "@/lib/types";
const jobs = [{ id: "sample", operatorId: "sample-operator", status: "accepted", serviceTypes: ["driveway", "walkway"], scheduledTime: "9:00 AM", scheduledDate: new Date(2026,11,10) }] as Job[];
export default function Review() {
 const [menu,setMenu]=useState(false),[filter,setFilter]=useState("attention"),[screen,setScreen]=useState("home");
 return <div className="dashboard-shell min-h-dvh bg-[var(--bg-primary)]">
 <header className="flex items-center justify-between border-b bg-white px-4 py-3"><strong className="text-2xl">snowd.</strong><select aria-label="Preview screen" value={screen} onChange={e=>setScreen(e.target.value)}><option value="home">Example home</option><option value="jobs">Example jobs</option><option value="empty">Empty home</option></select></header>
 <main className="container-app py-6 pb-32">{screen!=="jobs" ? <ClientHomeView firstName="Alex" greeting="Good morning" locationLabel="Ottawa, ON" activeJobs={screen==="empty"?[]:jobs} operatorNames={{"sample-operator":"Neighbourhood Snow Clearing"}} loading={false} loadError={false} /> : <><h1 className="text-3xl mb-5">Jobs</h1><JobFilters value={filter} onChange={setFilter} counts={{attention:2,upcoming:1,progress:0,history:4}} /><p className="mt-5" role="status">Selected: {filter}</p></>}</main>
 <MobileNavigation pathname={screen==="jobs"?"/dashboard/jobs":"/dashboard"} unreadMessages={2} menuOpen={menu} onOpenMenu={()=>setMenu(true)} />
 <Modal isOpen={menu} onClose={()=>setMenu(false)} title="More"><div id="mobile-account-menu"><HomeActions /></div></Modal>
 </div>;
}

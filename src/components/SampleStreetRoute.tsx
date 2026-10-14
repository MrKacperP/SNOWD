"use client";

import { useState } from "react";
import { House, Shovel, Plus, Minus } from "lucide-react";
import styles from "./SampleStreetRoute.module.css";

const route = "M48 170 L105 170 Q120 170 120 155 L120 112 Q120 100 135 100 L240 100 Q255 100 255 85 L255 59";
const homes = [[42,42],[83,42],[169,42],[210,42],[301,42],[42,115],[78,115],[166,143],[207,143],[300,139],[170,191],[216,191],[297,192]];

export default function SampleStreetRoute({ journey = true }: { journey?: boolean }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  return <div className={styles.map}>
    <svg viewBox="0 0 340 230" role="img" aria-label={journey ? "A shovel clears a snowy path to your fictional house in Maple Hollow" : "Your fictional house in the snowy Maple Hollow neighborhood"}
      onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) setPan(p => ({ x: Math.max(-70, Math.min(70, p.x + event.movementX / zoom)), y: Math.max(-45, Math.min(45, p.y + event.movementY / zoom)) })); }}>
      <rect width="340" height="230" fill="#edf3f1" />
      <g transform={`translate(170 115) scale(${zoom}) translate(${-170 + pan.x} ${-115 + pan.y})`}>
        <rect x="-100" y="-100" width="540" height="430" fill="#edf3f1" />
        <path d="M-30 78H365M120 -40V260M-30 170H120M255 -40V260" fill="none" stroke="#d9e4e5" strokeWidth="26" strokeLinejoin="round" />
        <path d="M-30 78H365M120 -40V260M-30 170H120M255 -40V260" fill="none" stroke="#fafcfd" strokeWidth="21" strokeLinejoin="round" />
        <path d="M135 100H255M255 59V78" fill="none" stroke="#fff" strokeWidth="16" />
        {homes.map(([x,y],i) => <g key={i} transform={`translate(${x} ${y})`}><rect x="-16" y="-15" width="32" height="35" rx="8" fill="#e0eae5" /><path d="M-10 -1L0 -10L10 -1V12H-10Z" fill={i % 3 === 0 ? "#c5d5dd" : "#d0dcdd"} stroke="#b6c9cd" strokeWidth="1" /><path d="M-12 -1L0 -12L12 -1" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" /></g>)}
        {[[20,205],[70,207],[315,100],[181,115],[19,20],[320,16]].map(([x,y],i) => <g key={i}><circle cx={x} cy={y} r="9" fill="#c9ddd4" /><circle cx={x-2} cy={y-3} r="6" fill="#e2eee8" /></g>)}
        {journey && <><path d={route} fill="none" stroke="#d7e4ea" strokeWidth="15" strokeLinecap="round" /><path className={styles.cleared} d={route} pathLength="1" fill="none" stroke="#7398ad" strokeWidth="12" strokeLinecap="round" /><path className={styles.cleared} d={route} pathLength="1" fill="none" stroke="#b8cdd7" strokeWidth="8" strokeLinecap="round" /></>}
        <g transform="translate(255 42)"><circle className={styles.halo} r="26" fill="#d8e9ee" /><circle r="20" fill="#28516b" stroke="white" strokeWidth="3" /><House x="-12" y="-13" width="24" height="24" color="white" strokeWidth="1.8" /></g>
        {journey && <g className={styles.walker}><animateMotion dur="9s" repeatCount="indefinite" path={route} keyPoints="0;1;1" keyTimes="0;.82;1" calcMode="linear" /><g className={styles.shovel}><circle r="15" fill="white" stroke="#d3e1e7" /><Shovel x="-10" y="-11" width="20" height="20" color="#28516b" strokeWidth="2" /></g></g>}
      </g>
    </svg>
    <div className={styles.zoom}><button type="button" aria-label="Zoom in on sample map" disabled={zoom >= 1.6} onClick={() => setZoom(z => Math.min(1.6,z + .2))}><Plus size={13} /></button><button type="button" aria-label="Zoom out on sample map" disabled={zoom <= 1} onClick={() => { setZoom(z => Math.max(1,z - .2)); setPan({x:0,y:0}); }}><Minus size={13} /></button></div>
  </div>;
}

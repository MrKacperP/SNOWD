"use client";

import ServiceAreaCityPicker from "./ServiceAreaCityPicker";
import ServiceRadiusMap from "./ServiceRadiusMap";
import type { OperatorServiceArea } from "@/lib/types";
import type { OnboardingLocation } from "./OnboardingAddress";

export default function ServiceAreaEditor({ location, mode, radius, cities, onChange }: {
  location: OnboardingLocation;
  mode: "radius" | "cities";
  radius: number;
  cities: OperatorServiceArea[];
  onChange: (patch: { serviceAreaMode?: "radius" | "cities"; serviceRadius?: number; serviceAreas?: OperatorServiceArea[] }) => void;
}) {
  return <section className="space-y-4 rounded-[22px] border border-[#dce6eb] bg-white p-[18px] shadow-[0_5px_24px_#17344306]">
    <h3 className="text-base font-semibold">Where will you shovel?</h3>
    <div className="grid grid-cols-2 gap-2" aria-label="Service area method">
      {([['radius', 'Around my address'], ['cities', 'Selected cities']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => onChange({ serviceAreaMode: value })} className={`min-h-12 rounded-[14px] border px-3 text-sm font-semibold transition hover:-translate-y-px hover:border-[#b9c9d2] ${mode === value ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-dark)]' : 'border-[var(--border-color)] bg-white'}`}>{label}</button>)}
    </div>
    {mode === "radius" ? <label className="block text-sm font-semibold">
      Travel radius: {radius} km
      <input type="range" aria-label="Service radius in kilometres" aria-valuetext={`${radius} kilometres`} min={1} max={50} value={radius} onChange={event => onChange({ serviceRadius: Number(event.target.value) })} className="mt-2 h-12 w-full accent-[var(--accent)]" />
      <span className="flex justify-between text-xs"><span>1 km</span><span>50 km</span></span>
    </label> : <>
      <p className="text-sm text-[var(--text-secondary)]">Customers in your selected cities can find you. Your home radius is turned off.</p>
      <ServiceAreaCityPicker value={cities} onChange={serviceAreas => onChange({ serviceAreas })} />
      {!cities.length && <p className="text-sm">Add at least one city to continue.</p>}
    </>}
    <ServiceRadiusMap {...location} radiusKm={radius} serviceAreas={cities} serviceAreaMode={mode} />
  </section>;
}

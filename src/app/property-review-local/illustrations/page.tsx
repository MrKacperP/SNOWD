"use client";
import SidebarWeather from "@/components/dashboard/SidebarWeather";
import TimeBack, { type SceneName } from "@/components/dashboard/TimeBack";
import type { WeatherData } from "@/context/WeatherContext";
import * as art from "@/components/illustrations";
import type { WeatherKind } from "@/components/illustrations";

const kinds: WeatherKind[] = ["clear", "partly", "cloudy", "fog", "rain", "snow", "storm"];
const scenes: SceneName[] = ["sheep", "cocoa", "angel", "nap", "snowman", "pancake"];
const props = { Sheep: <art.Sheep />, "Sheep (shorn)": <art.Sheep shorn />, Barn: <art.Barn />, WoolPuff: <art.WoolPuff />, Mug: <art.Mug />, Steam: <art.Steam />, Marshmallow: <art.Marshmallow />, SnowAngelKid: <art.SnowAngelKid />, AngelImprint: <art.AngelImprint />, Snowflake: <art.Snowflake />, SleepingCat: <art.SleepingCat />, Yarn: <art.Yarn />, Snowball: <art.Snowball />, SnowmanFace: <art.SnowmanFace />, TopHat: <art.TopHat />, Pan: <art.Pan />, Pancake: <art.Pancake />, Plate: <art.Plate /> };

const day = (offset: number) => { const date = new Date(); date.setDate(date.getDate() + offset); return date.toLocaleDateString("en-CA"); };
const sample = (patch: Partial<WeatherData>): WeatherData => ({ temp: -4, feelsLike: -9, condition: "Snow", icon: "", city: "Toronto", humidity: 80, windSpeed: 12, snowfallAmount: 0, snowfallUnit: "cm", code: 73, isDay: true, nextSnowDate: null, ...patch });
const sidebarSamples = [sample({ snowfallAmount: 6.3 }), sample({ temp: 2, condition: "Partly cloudy", code: 2, nextSnowDate: day(1) }), sample({ temp: 5, condition: "Clear", code: 0, isDay: false, nextSnowDate: day(5) }), sample({ temp: 9, condition: "Rain", code: 63 })];

// Local gallery of every illustration asset and Time back scene.
export default function IllustrationGallery() {
  return <main className="dashboard-home" style={{ padding: 24, maxWidth: 1000, margin: "auto", display: "grid", gap: 28 }}>
    <h1 style={{ fontSize: 24, fontWeight: 700 }}>Illustrations</h1>
    <section><h2 style={{ fontWeight: 700, marginBottom: 12 }}>Weather</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>{kinds.flatMap(kind => [true, false].filter(day => day || kind === "clear" || kind === "partly").map(day => <figure key={`${kind}${day}`} style={{ textAlign: "center", fontSize: 12 }}><art.WeatherArt kind={kind} isDay={day} className="sidebar-weather-art" /><figcaption>{kind}{day ? "" : " · night"}</figcaption></figure>))}</div>
    </section>
    <section><h2 style={{ fontWeight: 700, marginBottom: 12 }}>Sidebar weather</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,208px)", gap: 16 }}>{sidebarSamples.map((weather, index) => <SidebarWeather key={index} weather={weather} />)}</div>
    </section>
    <section><h2 style={{ fontWeight: 700, marginBottom: 12 }}>Props</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 16 }}>{Object.entries(props).map(([name, node]) => <figure key={name} style={{ display: "grid", gap: 6, padding: 10, border: "1px solid var(--border-color)", borderRadius: 12, fontSize: 12, textAlign: "center" }}><div style={{ height: 70, display: "grid", placeItems: "center" }}><div style={{ width: 80, maxHeight: 70, display: "grid", placeItems: "center", overflow: "hidden" }}>{node}</div></div><figcaption>{name}</figcaption></figure>)}</div>
    </section>
    <section style={{ display: "grid", gap: 16 }}><h2 style={{ fontWeight: 700 }}>Time back scenes</h2>
      {scenes.map(scene => <TimeBack key={scene} scene={scene} minutes={135} loading={false} loadError={false} />)}
    </section>
  </main>;
}

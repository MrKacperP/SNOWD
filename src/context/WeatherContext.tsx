"use client";

import { useAuth } from "@/context/AuthContext";

import React, { useState, useEffect, createContext, useContext } from "react";

export interface WeatherData {
  temp: number;
  feelsLike: number;
  condition: string;
  icon: string;
  city: string;
  humidity: number;
  windSpeed: number;
  snowfallAmount: number;
  snowfallUnit: string;
  /** WMO weather code from Open-Meteo. */
  code: number;
  isDay: boolean;
  /** First day after today with snow in the 16-day forecast (YYYY-MM-DD), if any. */
  nextSnowDate: string | null;
}

interface WeatherContextType {
  weather: WeatherData | null;
  loading: boolean;
  locationPromptOpen: boolean;
}

const WeatherContext = createContext<WeatherContextType>({ weather: null, loading: true, locationPromptOpen: false });

export const useWeather = () => useContext(WeatherContext);

// Free API: Open-Meteo (no API key required)
async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    // Get current weather from Open-Meteo
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&daily=snowfall_sum&timezone=auto&forecast_days=16`
    );
    const data = await res.json();
    
    if (!data.current) return null;
    
    const code = data.current.weather_code;
    const temp = Math.round(data.current.temperature_2m);
    const feelsLike = Math.round(data.current.apparent_temperature);
    const humidity = data.current.relative_humidity_2m;
    const windSpeed = Math.round(data.current.wind_speed_10m);
    const dailySnow: number[] = data.daily?.snowfall_sum || [];
    const snowfall = dailySnow[0] || 0;
    const nextSnowIndex = dailySnow.findIndex((amount, index) => index > 0 && amount > 0);
    const nextSnowDate = nextSnowIndex > 0 ? data.daily?.time?.[nextSnowIndex] ?? null : null;

    // Map weather codes to conditions and icons
    const { condition, icon } = mapWeatherCode(code);
    
    // Reverse geocode for city name
    let city = "Your Area";
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`);
      const geoData = await geoRes.json();
      city = geoData.address?.city || geoData.address?.town || geoData.address?.village || "Your Area";
    } catch {}

    return {
      temp,
      feelsLike,
      condition,
      icon,
      city,
      humidity,
      windSpeed,
      snowfallAmount: Number.isFinite(snowfall) ? snowfall : 0,
      snowfallUnit: typeof data.daily_units?.snowfall_sum === "string" ? data.daily_units.snowfall_sum : "",
      code,
      isDay: data.current.is_day !== 0,
      nextSnowDate,
    };
  } catch (error) {
    console.error("Weather fetch error:", error);
    return null;
  }
}

function mapWeatherCode(code: number): { condition: string; icon: string } {
  if (code === 0) return { condition: "Clear", icon: "☀️" };
  if (code <= 2) return { condition: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { condition: "Cloudy", icon: "☁️" };
  if (code <= 48) return { condition: "Fog", icon: "🌫️" };
  if (code <= 57) return { condition: "Drizzle", icon: "🌧️" };
  if (code <= 67) return { condition: "Rain", icon: "🌧️" };
  if (code <= 77) return { condition: "Snow", icon: "🌨️" };
  if (code <= 82) return { condition: "Showers", icon: "🌦️" };
  if (code <= 86) return { condition: "Snow Showers", icon: "❄️" };
  if (code <= 99) return { condition: "Thunderstorm", icon: "⛈️" };
  return { condition: "Unknown", icon: "🌤️" };
}

export function WeatherProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const latitude = profile?.lat, longitude = profile?.lng;
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const frame = requestAnimationFrame(() => {
      if (typeof latitude !== "number" || typeof longitude !== "number" || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        setWeather(null);
        setLoading(false);
        return;
      }
      setWeather(null);
      setLoading(true);
      fetchWeather(latitude, longitude).then(data => {
        if (active) { setWeather(data); setLoading(false); }
      });
    });
    return () => { active = false; cancelAnimationFrame(frame); };
  }, [latitude, longitude]);

  return <WeatherContext.Provider value={{ weather, loading, locationPromptOpen: false }}>{children}</WeatherContext.Provider>;
}

// Compact weather widget for Navbar
export function WeatherBadge() {
  const { weather, loading } = useWeather();

  if (loading || !weather) return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur rounded-lg text-xs">
      <span>{weather.icon}</span>
      <span className="font-semibold">{weather.temp}°C</span>
      {weather.snowfallAmount > 0 && weather.snowfallUnit && (
        <span className="text-blue-200">❄️ {weather.snowfallAmount} {weather.snowfallUnit} today</span>
      )}
    </div>
  );
}

// Full weather card for dashboard
export function WeatherCard() {
  const { weather, loading } = useWeather();

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
        <div className="h-16 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center text-sm text-gray-400">
        Weather unavailable.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="bg-[#2350FF] px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70">{weather.city}</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-bold">{weather.temp}°C</span>
              <span className="text-sm text-white/80">Feels {weather.feelsLike}°</span>
            </div>
            <p className="text-sm text-white/80 mt-0.5">{weather.condition}</p>
          </div>
          <span className="text-4xl">{weather.icon}</span>
        </div>
      </div>
      <div className="px-5 py-3 flex items-center gap-4 text-xs text-gray-600">
        <span>💨 {weather.windSpeed} km/h</span>
        <span>💧 {weather.humidity}%</span>
        {weather.snowfallAmount > 0 && weather.snowfallUnit && (
          <span className="text-[#2350FF] font-semibold">❄️ {weather.snowfallAmount} {weather.snowfallUnit} snow today</span>
        )}
      </div>
    </div>
  );
}

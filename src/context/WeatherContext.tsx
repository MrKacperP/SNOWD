"use client";

import React, { useState, useEffect, createContext, useContext } from "react";

interface WeatherData {
  temp: number;
  feelsLike: number;
  condition: string;
  icon: string;
  city: string;
  humidity: number;
  windSpeed: number;
  snowChance: number;
}

interface WeatherContextType {
  weather: WeatherData | null;
  loading: boolean;
}

const WeatherContext = createContext<WeatherContextType>({ weather: null, loading: true });

export const useWeather = () => useContext(WeatherContext);

// Free API: Open-Meteo (no API key required)
async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    // Get current weather from Open-Meteo
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=snowfall_sum&timezone=auto&forecast_days=1`
    );
    const data = await res.json();
    
    if (!data.current) return null;
    
    const code = data.current.weather_code;
    const temp = Math.round(data.current.temperature_2m);
    const feelsLike = Math.round(data.current.apparent_temperature);
    const humidity = data.current.relative_humidity_2m;
    const windSpeed = Math.round(data.current.wind_speed_10m);
    const snowfall = data.daily?.snowfall_sum?.[0] || 0;

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
      snowChance: snowfall > 0 ? Math.min(100, Math.round(snowfall * 10)) : 0,
    };
  } catch (error) {
    console.error("Weather fetch error:", error);
    return null;
  }
}

function mapWeatherCode(code: number): { condition: string; icon: string } {
  if (code === 0) return { condition: "Clear", icon: "☀️" };
  if (code <= 3) return { condition: "Cloudy", icon: "⛅" };
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
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const data = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
        setWeather(data);
        setLoading(false);
      },
      () => {
        // Default to Toronto if geolocation denied
        fetchWeather(43.65, -79.38).then((data) => {
          setWeather(data);
          setLoading(false);
        });
      },
      { timeout: 5000 }
    );
  }, []);

  return (
    <WeatherContext.Provider value={{ weather, loading }}>
      {children}
    </WeatherContext.Provider>
  );
}

// Compact weather widget for Navbar
export function WeatherBadge() {
  const { weather, loading } = useWeather();

  if (loading || !weather) return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur rounded-lg text-xs">
      <span>{weather.icon}</span>
      <span className="font-semibold">{weather.temp}°C</span>
      {weather.snowChance > 0 && (
        <span className="text-blue-200">❄️{weather.snowChance}%</span>
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
        Weather unavailable. Enable location to see weather.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="bg-[#4361EE] px-5 py-4 text-white">
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
        {weather.snowChance > 0 && (
          <span className="text-[#4361EE] font-semibold">❄️ {weather.snowChance}% snow</span>
        )}
      </div>
    </div>
  );
}

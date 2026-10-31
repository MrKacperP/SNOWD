import { WeatherArt, weatherKind } from "@/components/illustrations";
import type { WeatherData } from "@/context/WeatherContext";

// Today's snow, or the first snow day in the forecast.
function snowOutlook(weather: WeatherData) {
  if (weather.snowfallAmount > 0) return { today: true, text: weather.snowfallUnit ? `Snow today · ${weather.snowfallAmount} ${weather.snowfallUnit}` : "Snow expected today" };
  if (weather.nextSnowDate) {
    const [year, month, day] = weather.nextSnowDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const label = date.toDateString() === tomorrow.toDateString() ? "tomorrow" : new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric" }).format(date);
    return { today: false, text: `Next snow ${label}` };
  }
  return { today: false, text: "No snow in the 16-day forecast" };
}

export default function SidebarWeather({ weather }: { weather: WeatherData }) {
  const snow = snowOutlook(weather);
  return (
    <section className="sidebar-weather" aria-label={`Weather: ${weather.temp}°C, ${weather.condition}. ${snow.text}`}>
      <WeatherArt kind={weatherKind(weather.code)} isDay={weather.isDay} className="sidebar-weather-art" />
      <div className="min-w-0">
        <strong>{weather.temp}°C</strong>
        <span>{weather.condition}</span>
      </div>
      <p className="sidebar-weather-snow" data-today={snow.today}>{snow.text}</p>
    </section>
  );
}

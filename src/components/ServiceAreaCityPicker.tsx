"use client";

import { useJsApiLoader } from "@react-google-maps/api";
import { MapPin, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES, hasGoogleMapsApiKey } from "@/lib/googleMaps";
import type { OperatorServiceArea } from "@/lib/types";

type Props = {
  value: OperatorServiceArea[];
  onChange: (areas: OperatorServiceArea[]) => void;
};

function addressPart(place: google.maps.places.PlaceResult, type: string, short = false) {
  const part = place.address_components?.find(component => component.types.includes(type));
  return part ? (short ? part.short_name : part.long_name) : "";
}

export default function ServiceAreaCityPicker(props: Props) {
  if (!hasGoogleMapsApiKey) {
    return <p className="text-sm text-[var(--text-muted)]">City selection needs the Google Maps key configured for this site.</p>;
  }
  return <PickerWithMaps {...props} />;
}

function PickerWithMaps({ value, onChange }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: GOOGLE_MAPS_LIBRARIES });
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<google.maps.places.PlaceResult | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "ca" },
      fields: ["address_components", "formatted_address", "geometry", "name", "place_id"],
      types: ["(cities)"],
    });
    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      selectedRef.current = place;
      setQuery(place.formatted_address || place.name || "");
      setError("");
    });
    return () => {
      listener.remove();
      google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [isLoaded]);

  const addCity = () => {
    const place = selectedRef.current;
    const city = place && (addressPart(place, "locality") || addressPart(place, "postal_town") || place.name || "");
    const province = place && addressPart(place, "administrative_area_level_1");
    const provinceCode = (place && addressPart(place, "administrative_area_level_1", true)) || "";
    const country = place && addressPart(place, "country");
    const location = place?.geometry?.location;
    if (!place?.place_id || !city || !province || country !== "Canada" || !location) {
      setError("Choose a Canadian city from the suggestions before adding it.");
      return;
    }
    if (value.some(area => area.placeId === place.place_id)) {
      setError(`${city} is already in your service area.`);
      return;
    }
    const viewport = place.geometry?.viewport;
    onChange([...value, {
      placeId: place.place_id,
      city,
      province,
      provinceCode,
      country: "Canada",
      lat: location.lat(),
      lng: location.lng(),
      ...(viewport ? { bounds: viewport.toJSON() } : {}),
    }]);
    selectedRef.current = null;
    setQuery("");
    setError("");
  };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          value={query}
          onChange={event => { setQuery(event.target.value); selectedRef.current = null; setError(""); }}
          onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addCity(); } }}
          placeholder={isLoaded ? "Search a Canadian city" : "Loading city search…"}
          aria-label="Canadian service city"
          disabled={!isLoaded || Boolean(loadError)}
          className="flex-1 border px-4"
        />
        <button type="button" onClick={addCity} disabled={!isLoaded} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 font-semibold disabled:opacity-50">
          <Plus className="h-4 w-4" /> Add city
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      {loadError && <p role="alert" className="mt-2 text-sm text-red-700">City search could not load. Refresh the page and try again.</p>}
      {value.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Selected service cities">
          {value.map(area => (
            <li key={area.placeId} className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-[var(--sky)] px-4 text-sm font-semibold">
              <MapPin className="h-4 w-4" /> {area.city}, {area.provinceCode}
              <button type="button" aria-label={`Remove ${area.city}`} onClick={() => onChange(value.filter(item => item.placeId !== area.placeId))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--card)]">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

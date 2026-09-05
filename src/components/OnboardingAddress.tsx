"use client";

import { useEffect, useRef, useState } from "react";
import AddressAutocomplete from "./AddressAutocomplete";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import {
  hasGoogleMapsApiKey,
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_LIBRARIES,
} from "@/lib/googleMaps";
import { CANADIAN_PROVINCES } from "@/lib/types";
import { MapPin, CheckCircle2 } from "lucide-react";

export type OnboardingLocation = {
  address: string;
  city: string;
  province: string;
  postalCode: string;
  lat?: number;
  lng?: number;
  provider?: "google" | "mapbox" | "manual";
};
const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
const field =
  "w-full min-h-12 rounded-2xl border-[3px] border-[#061321] bg-white px-4 text-base font-bold outline-none focus-visible:ring-4 focus-visible:ring-[#ff820e]/40";
type MapboxFeature = {
  id: string;
  geometry: { coordinates: [number, number] };
  properties: {
    full_address: string;
    context: {
      place?: { name: string };
      region?: { region_code: string };
      postcode?: { name: string };
    };
  };
};

function GoogleLocationMap({ lat, lng }: { lat: number; lng: number }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  if (loadError)
    return (
      <p className="p-4 text-sm font-semibold">
        Your address is selected. The map preview couldn’t load.
      </p>
    );
  if (!isLoaded)
    return (
      <div
        className="flex h-[210px] items-center justify-center text-sm"
        role="status"
      >
        Loading your map…
      </div>
    );
  const center = { lat, lng };
  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "210px" }}
      center={center}
      zoom={16}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "cooperative",
      }}
    >
      <Marker position={center} title="Your selected address" />
    </GoogleMap>
  );
}

export default function OnboardingAddress({
  value,
  onChange,
}: {
  value: OnboardingLocation;
  onChange: (value: OnboardingLocation) => void;
}) {
  const [provider, setProvider] = useState<"google" | "mapbox">(
    hasGoogleMapsApiKey ? "google" : token ? "mapbox" : "google",
  );
  const [manual, setManual] = useState(!hasGoogleMapsApiKey && !token);
  const [results, setResults] = useState<MapboxFeature[]>([]);
  const [status, setStatus] = useState("");
  const [mapFailed, setMapFailed] = useState(false);
  const revision = useRef(0);
  const selected = Boolean(
    value.city && value.province && value.postalCode && value.provider,
  );

  useEffect(() => {
    if (
      provider !== "mapbox" ||
      manual ||
      selected ||
      value.address.trim().length < 4
    )
      return;
    const controller = new AbortController();
    const current = revision.current;
    const timer = setTimeout(async () => {
      setStatus("Finding your address…");
      try {
        const query = new URLSearchParams({
          q: value.address,
          country: "ca",
          types: "address",
          limit: "5",
          autocomplete: "true",
          permanent: "true",
          access_token: token,
        });
        const response = await fetch(
          `https://api.mapbox.com/search/geocode/v6/forward?${query}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Address search unavailable");
        const data = await response.json();
        if (controller.signal.aborted || current !== revision.current) return;
        setResults(data.features || []);
        setStatus(
          data.features?.length
            ? "Choose your address below."
            : "No matches yet. Try a street number and city, or enter your address manually.",
        );
      } catch {
        if (!controller.signal.aborted)
          setStatus(
            "Search is unavailable. You can enter your address manually below.",
          );
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value.address, provider, manual, selected]);

  const edit = (address: string) => {
    revision.current += 1;
    setResults([]);
    setStatus("");
    setMapFailed(false);
    onChange({ address, city: "", province: "", postalCode: "" });
  };
  return (
    <div className="space-y-4">
      <label className="block text-sm font-black">
        {manual ? "Street address" : "Your address"}
        <div className="mt-2">
          {provider === "google" && !manual ? (
            <AddressAutocomplete
              value={value.address}
              onChange={edit}
              className={field}
              placeholder="Start typing your street address"
              onPlaceSelected={(place) => {
                const component = (type: string, short = false) => {
                  const item = place.address_components?.find((c) =>
                    c.types.includes(type),
                  );
                  return (short ? item?.short_name : item?.long_name) || "";
                };
                onChange({
                  address: place.formatted_address || "",
                  city:
                    component("locality") ||
                    component("postal_town") ||
                    component("sublocality_level_1"),
                  province: component("administrative_area_level_1", true),
                  postalCode: component("postal_code"),
                  lat: place.geometry?.location?.lat(),
                  lng: place.geometry?.location?.lng(),
                  provider: "google",
                });
              }}
            />
          ) : (
            <input
              className={field}
              autoComplete="street-address"
              value={value.address}
              onChange={(e) =>
                manual
                  ? onChange({
                      ...value,
                      address: e.target.value,
                      lat: undefined,
                      lng: undefined,
                      provider: "manual",
                    })
                  : edit(e.target.value)
              }
              placeholder="123 Maple Street"
            />
          )}
        </div>
      </label>
      {status && (
        <p role="status" className="text-sm font-semibold">
          {status}
        </p>
      )}
      {results.length > 0 && (
        <ul
          aria-label="Address suggestions"
          className="overflow-hidden rounded-2xl border-[3px] border-[#061321] bg-white"
        >
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                className="min-h-12 w-full border-b border-[#061321]/10 p-3 text-left text-sm font-bold hover:bg-[#dfeef8] focus-visible:bg-[#dfeef8]"
                onClick={() => {
                  revision.current += 1;
                  const { context } = result.properties;
                  onChange({
                    address: result.properties.full_address,
                    city: context.place?.name || "",
                    province: context.region?.region_code || "",
                    postalCode: context.postcode?.name || "",
                    lng: result.geometry.coordinates[0],
                    lat: result.geometry.coordinates[1],
                    provider: "mapbox",
                  });
                  setResults([]);
                  setStatus("");
                }}
              >
                {result.properties.full_address}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!manual && (
        <p className="text-xs font-semibold text-[#061321]/65">
          Select a suggestion to fill in your city, province, and postal code.
        </p>
      )}
      {selected && !manual ? (
        <div className="overflow-hidden rounded-2xl border-[3px] border-[#061321] bg-[#dfeef8]">
          {value.provider === "mapbox" &&
          value.lat !== undefined &&
          value.lng !== undefined &&
          !mapFailed ? (
            // Mapbox's static map includes its logo and attribution by default.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`Map of ${value.address}`}
              className="h-[210px] w-full object-cover"
              onError={() => setMapFailed(true)}
              src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ff820e(${value.lng},${value.lat})/${value.lng},${value.lat},15/600x260?access_token=${encodeURIComponent(token)}`}
            />
          ) : value.provider === "google" &&
            value.lat !== undefined &&
            value.lng !== undefined ? (
            <GoogleLocationMap lat={value.lat} lng={value.lng} />
          ) : null}
          <p className="flex items-center gap-2 p-3 text-sm font-bold">
            <CheckCircle2 size={18} />
            {mapFailed
              ? "Address selected. Map preview unavailable."
              : "Looking good! Check that this is your address."}
          </p>
        </div>
      ) : (
        !manual && (
          <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#061321]/25 bg-[#dfeef8]/50 px-4 text-center">
            <MapPin className="text-[#ff820e]" size={32} />
            <p className="text-sm font-bold">Your location will appear here</p>
          </div>
        )
      )}
      <button
        type="button"
        className="min-h-11 text-sm font-bold underline underline-offset-4"
        onClick={() => {
          setManual(!manual);
          setResults([]);
          setStatus("");
          revision.current += 1;
        }}
      >
        {manual
          ? "Back to address search"
          : "Can’t find it? Enter address manually"}
      </button>
      {manual && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold">
            City
            <input
              className={`${field} mt-1`}
              autoComplete="address-level2"
              value={value.city}
              onChange={(e) =>
                onChange({
                  ...value,
                  city: e.target.value,
                  lat: undefined,
                  lng: undefined,
                  provider: "manual",
                })
              }
            />
          </label>
          <label className="text-sm font-bold">
            Province
            <select
              className={`${field} mt-1`}
              autoComplete="address-level1"
              value={value.province}
              onChange={(e) =>
                onChange({
                  ...value,
                  province: e.target.value,
                  lat: undefined,
                  lng: undefined,
                  provider: "manual",
                })
              }
            >
              <option value="">Choose province</option>
              {CANADIAN_PROVINCES.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            Postal code
            <input
              className={`${field} mt-1`}
              autoComplete="postal-code"
              maxLength={7}
              value={value.postalCode}
              onChange={(e) =>
                onChange({
                  ...value,
                  postalCode: e.target.value.toUpperCase(),
                  lat: undefined,
                  lng: undefined,
                  provider: "manual",
                })
              }
              placeholder="K1A 0B1"
            />
          </label>
        </div>
      )}
      {hasGoogleMapsApiKey && token && !manual && (
        <button
          type="button"
          className="block min-h-11 text-xs font-bold underline"
          onClick={() => {
            setProvider(provider === "google" ? "mapbox" : "google");
            edit("");
          }}
        >
          Try {provider === "google" ? "Mapbox" : "Google"} search
        </button>
      )}
      <p className="text-xs leading-5 text-[#061321]/65">
        {value.provider === "mapbox" || provider === "mapbox"
          ? "Search powered by Mapbox. "
          : ""}
        We use your location to find nearby help and jobs.
      </p>
    </div>
  );
}

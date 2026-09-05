"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, Circle, useJsApiLoader } from "@react-google-maps/api";
import {
  GOOGLE_MAPS_LIBRARIES,
  GOOGLE_MAPS_API_KEY,
  hasGoogleMapsApiKey,
  buildGoogleMapsEmbedUrl,
} from "@/lib/googleMaps";

interface ServiceRadiusMapProps {
  address: string;
  city: string;
  province: string;
  postalCode: string;
  radiusKm: number;
  lat?: number;
  lng?: number;
}

const mapContainerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "12px",
};

export default function ServiceRadiusMap({
  address,
  city,
  province,
  postalCode,
  radiusKm,
  lat,
  lng,
}: ServiceRadiusMapProps) {
  const fullAddress = `${address}, ${city}, ${province}, ${postalCode}, Canada`;

  if (!hasGoogleMapsApiKey) {
    return (
      <div className="relative">
        <iframe
          title="Service area map"
          width="100%"
          height="400"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={buildGoogleMapsEmbedUrl(fullAddress, 12)}
        />
        <div className="mt-2 text-xs text-gray-500 text-center">
          Service area: {radiusKm} km radius
          {!address && " • Approximate service area"}
        </div>
      </div>
    );
  }

  return (
    <ServiceRadiusMapWithApi
      address={address}
      city={city}
      province={province}
      postalCode={postalCode}
      lat={lat}
      lng={lng}
      radiusKm={radiusKm}
    />
  );
}

function ServiceRadiusMapWithApi({
  address,
  city,
  province,
  postalCode,
  radiusKm,
  lat,
  lng,
}: ServiceRadiusMapProps) {
  const fullAddress = `${address}, ${city}, ${province}, ${postalCode}, Canada`;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  const geocodeAddress = useCallback(async () => {
    if (!isLoaded) return;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setCenter({ lat: lat!, lng: lng! });
      return;
    }
    if (!city || !province) return;

    setIsGeocoding(true);
    setLocationError(false);
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address: fullAddress });

      if (result.results[0]) {
        const location = result.results[0].geometry.location;
        const newCenter = { lat: location.lat(), lng: location.lng() };
        setCenter(newCenter);
      }
    } catch (error) {
      setCenter(null);
      setLocationError(true);
      console.error("Geocoding error:", error);
    } finally {
      setIsGeocoding(false);
    }
  }, [isLoaded, city, province, fullAddress, lat, lng]);

  useEffect(() => {
    geocodeAddress();
  }, [geocodeAddress]);

  // Auto-zoom to fit the radius circle
  useEffect(() => {
    if (!mapRef.current || !isLoaded || !center) return;
    
    const radiusMeters = radiusKm * 1000;
    const circle = new google.maps.Circle({
      center: center,
      radius: radiusMeters,
    });
    const bounds = circle.getBounds();
    if (bounds) {
      mapRef.current.fitBounds(bounds);
    }
  }, [center, radiusKm, isLoaded]);

  if (loadError) {
    return (
      <div className="w-full h-[400px] bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-red-500">Error loading map</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[400px] bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  if (!center) return <div className="flex h-[400px] items-center justify-center rounded-xl bg-gray-100 p-6 text-center text-sm text-gray-600">{locationError ? `Map unavailable. Service area: ${radiusKm} km around ${city}, ${province}.` : "Locating service area..."}</div>;

  const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    styles: [
      { featureType: "poi", stylers: [{ visibility: "off" }] },
      { featureType: "transit", stylers: [{ visibility: "off" }] },
    ],
  };

  const circleOptions = {
    strokeColor: "#061321",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "#061321",
    fillOpacity: 0.1,
  };

  return (
    <div className="relative">
      {isGeocoding && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white backdrop-blur-sm px-4 py-2 rounded-lg shadow-[var(--surface-shadow)] z-10">
          <p className="text-sm text-gray-600">Locating address...</p>
        </div>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={11}
        options={mapOptions}
        onLoad={(map) => {
          mapRef.current = map;
          const bounds = new google.maps.Circle({ center, radius: radiusKm * 1000 }).getBounds();
          if (bounds) map.fitBounds(bounds);
        }}
      >
        <Circle
          center={center}
          radius={radiusKm * 1000}
          options={circleOptions}
        />
      </GoogleMap>

      <div className="mt-2 text-xs text-gray-500 text-center">
        Service area: {radiusKm} km radius
        {!address && " • Approximate service area"}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, Circle, useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from "@/lib/googleMaps";

interface ServiceRadiusMapProps {
  address: string;
  city: string;
  province: string;
  postalCode: string;
  radiusKm: number;
}

const mapContainerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "12px",
};

const defaultCenter = {
  lat: 43.6532,
  lng: -79.3832,
};

// Custom snowflake marker using SVG
const snowflakeIcon = (map: google.maps.Map | null) => {
  if (!map || !google?.maps) return undefined;
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%234361EE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="11" fill="%234361EE" stroke="white" stroke-width="2"/>
        <line x1="12" y1="2" x2="12" y2="22" stroke="white" stroke-width="1.5"/>
        <line x1="2" y1="12" x2="22" y2="12" stroke="white" stroke-width="1.5"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="white" stroke-width="1.5"/>
        <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" stroke="white" stroke-width="1.5"/>
        <line x1="12" y1="5" x2="10" y2="7" stroke="white" stroke-width="1"/>
        <line x1="12" y1="5" x2="14" y2="7" stroke="white" stroke-width="1"/>
        <line x1="12" y1="19" x2="10" y2="17" stroke="white" stroke-width="1"/>
        <line x1="12" y1="19" x2="14" y2="17" stroke="white" stroke-width="1"/>
      </svg>
    `),
    scaledSize: new google.maps.Size(40, 40),
    anchor: new google.maps.Point(20, 20),
  };
};

export default function ServiceRadiusMap({
  address,
  city,
  province,
  postalCode,
  radiusKm,
}: ServiceRadiusMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [center, setCenter] = useState(defaultCenter);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const geocodeAddress = useCallback(async () => {
    if (!isLoaded || !address || !city || !province) return;

    setIsGeocoding(true);
    try {
      const geocoder = new google.maps.Geocoder();
      const fullAddress = `${address}, ${city}, ${province}, ${postalCode}, Canada`;
      const result = await geocoder.geocode({ address: fullAddress });

      if (result.results[0]) {
        const location = result.results[0].geometry.location;
        const newCenter = { lat: location.lat(), lng: location.lng() };
        setCenter(newCenter);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setIsGeocoding(false);
    }
  }, [isLoaded, address, city, province, postalCode]);

  useEffect(() => {
    geocodeAddress();
  }, [geocodeAddress]);

  // Auto-zoom to fit the radius circle
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    
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

  // Update marker when center changes
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    // Remove old marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    // Create new marker with snowflake icon
    const icon = snowflakeIcon(mapRef.current);
    markerRef.current = new google.maps.Marker({
      position: center,
      map: mapRef.current,
      title: "Your Location",
      icon: icon,
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, [center, isLoaded]);

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
    strokeColor: "#4361EE",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "#4361EE",
    fillOpacity: 0.1,
  };

  return (
    <div className="relative">
      {isGeocoding && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg z-10">
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
        {!address && " • Enter your address to see location"}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from "@/lib/googleMaps";

interface AddressMapProps {
  address: string;
  city: string;
  province: string;
  postalCode: string;
}

const mapContainerStyle = {
  width: "100%",
  height: "250px",
  borderRadius: "12px",
};

const defaultCenter = {
  lat: 43.6532,
  lng: -79.3832,
};

export default function AddressMap({
  address,
  city,
  province,
  postalCode,
}: AddressMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [center, setCenter] = useState(defaultCenter);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const geocodeAddress = useCallback(async () => {
    if (!isLoaded || !address || !city) return;

    setIsGeocoding(true);
    try {
      const geocoder = new google.maps.Geocoder();
      const fullAddress = `${address}, ${city}, ${province}, ${postalCode}, Canada`;

      const result = await geocoder.geocode({ address: fullAddress });

      if (result.results[0]) {
        const location = result.results[0].geometry.location;
        setCenter({
          lat: location.lat(),
          lng: location.lng(),
        });
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setIsGeocoding(false);
    }
  }, [isLoaded, address, city, province, postalCode]);

  useEffect(() => {
    const timeout = setTimeout(geocodeAddress, 500);
    return () => clearTimeout(timeout);
  }, [geocodeAddress]);

  if (loadError) {
    return (
      <div className="w-full h-[250px] bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-red-500 text-sm">Error loading map</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[250px] bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {isGeocoding && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-lg shadow-lg z-10">
          <p className="text-xs text-gray-600">Locating...</p>
        </div>
      )}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={15}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        <Marker
          position={center}
          title="Your Property"
          icon={{
            url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%232F80ED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><line x1="20" x2="4" y1="4" y2="20"/><line x1="20" x2="4" y1="20" y2="4"/><line x1="12" x2="12" y1="2" y2="22"/><line x1="2" x2="22" y1="12" y2="12"/></svg>'
            ),
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20),
          }}
        />
      </GoogleMap>
      <div className="mt-1.5 text-xs text-gray-500 text-center">
        {address ? `${address}, ${city}` : "Enter your address to see location"}
      </div>
    </div>
  );
}

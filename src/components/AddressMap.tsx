"use client";

import React, { useCallback, useEffect, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import {
  GOOGLE_MAPS_LIBRARIES,
  GOOGLE_MAPS_API_KEY,
  hasGoogleMapsApiKey,
  buildGoogleMapsEmbedUrl,
} from "@/lib/googleMaps";

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

export default function AddressMap(props: AddressMapProps) {
  if (!hasGoogleMapsApiKey) {
    const fullAddress = `${props.address}, ${props.city}, ${props.province}, ${props.postalCode}, Canada`;
    return (
      <div className="relative">
        <iframe
          title="Address map"
          width="100%"
          height="250"
          style={{ border: 0, borderRadius: "12px" }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={buildGoogleMapsEmbedUrl(fullAddress, 15)}
        />
        <div className="mt-1.5 text-center text-xs text-gray-500">
          {props.address ? `${props.address}, ${props.city}` : "Enter your address to see location"}
        </div>
      </div>
    );
  }

  return <AddressMapWithApi {...props} />;
}

function AddressMapWithApi({ address, city, province, postalCode }: AddressMapProps) {
  const fullAddress = `${address}, ${city}, ${province}, ${postalCode}, Canada`;
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
  }, [isLoaded, address, city, fullAddress]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void geocodeAddress();
    }, 300);
    return () => clearTimeout(timeout);
  }, [geocodeAddress]);

  if (loadError) {
    return (
      <div className="flex h-[250px] w-full items-center justify-center rounded-xl bg-gray-100">
        <p className="text-sm text-red-500">Error loading map</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[250px] w-full items-center justify-center rounded-xl bg-gray-100">
        <p className="text-sm text-gray-500">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {isGeocoding ? (
        <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-lg bg-white px-3 py-1.5 shadow-lg">
          <p className="text-xs text-gray-600">Locating...</p>
        </div>
      ) : null}
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
            url:
              "data:image/svg+xml;charset=UTF-8," +
              encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%23121212" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" fill="white"/><path d="M12 6v12"/><path d="M6 12h12"/><path d="m8.5 8.5 7 7"/><path d="m15.5 8.5-7 7"/></svg>'
              ),
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20),
          }}
        />
      </GoogleMap>
      <div className="mt-1.5 text-center text-xs text-gray-500">
        {address ? `${address}, ${city}` : "Enter your address to see location"}
      </div>
    </div>
  );
}

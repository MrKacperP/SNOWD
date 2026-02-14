"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from "@/lib/googleMaps";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected?: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder = "123 Main St",
  className = "",
}: AddressAutocompleteProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const handlePlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (place && place.formatted_address) {
      onChange(place.formatted_address);
      if (onPlaceSelected) {
        onPlaceSelected(place);
      }
    }
  }, [onChange, onPlaceSelected]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    try {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "ca" },
        fields: ["address_components", "formatted_address", "geometry"],
        types: ["address"],
      });

      autocompleteRef.current = autocomplete;

      const listener = autocomplete.addListener("place_changed", handlePlaceChanged);

      return () => {
        google.maps.event.removeListener(listener);
      };
    } catch (error) {
      console.error("Error initializing autocomplete:", error);
    }
  }, [isLoaded, handlePlaceChanged]);

  return (
    <div ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
}

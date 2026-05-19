"use client";

import React, { useEffect, useRef } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import {
  GOOGLE_MAPS_LIBRARIES,
  GOOGLE_MAPS_API_KEY,
  hasGoogleMapsApiKey,
} from "@/lib/googleMaps";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected?: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete(props: AddressAutocompleteProps) {
  if (!hasGoogleMapsApiKey) {
    return (
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder || "123 Main St"}
        className={props.className || ""}
        autoComplete="street-address"
      />
    );
  }

  return <AddressAutocompleteWithApi {...props} />;
}

function AddressAutocompleteWithApi({
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
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onPlaceSelectedRef.current = onPlaceSelected;
  }, [onPlaceSelected]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }

    try {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "ca" },
        fields: ["address_components", "formatted_address", "geometry"],
        types: ["address"],
      });

      autocompleteRef.current = autocomplete;

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place && place.formatted_address) {
          onChangeRef.current(place.formatted_address);
          onPlaceSelectedRef.current?.(place);
        }
      });
    } catch (error) {
      console.error("Error initializing autocomplete:", error);
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isLoaded]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
}

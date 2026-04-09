// Shared Google Maps configuration
// All components MUST use this same libraries array to avoid loader conflicts
export const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry" | "marker")[] = [
  "places",
  "geometry",
  "marker",
];

export const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export const hasGoogleMapsApiKey = GOOGLE_MAPS_API_KEY.trim().length > 0;

export const buildGoogleMapsEmbedUrl = (
  query: string,
  zoom = 15
): string => {
  const encodedQuery = encodeURIComponent(query);

  if (hasGoogleMapsApiKey) {
    return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodedQuery}&zoom=${zoom}`;
  }

  // Fallback embed that does not require an API key.
  return `https://maps.google.com/maps?q=${encodedQuery}&z=${zoom}&output=embed`;
};

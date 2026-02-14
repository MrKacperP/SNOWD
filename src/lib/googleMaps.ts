// Shared Google Maps configuration
// All components MUST use this same libraries array to avoid loader conflicts
export const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry" | "marker")[] = [
  "places",
  "geometry",
  "marker",
];

export const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

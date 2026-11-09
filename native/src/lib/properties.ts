import { useCallback, useEffect, useState } from "react";
import type { PropertyDetails, PropertyState, SavedProperty, ServiceLocation } from "@/lib/serviceLocations";
import { api } from "./api";

export type PropertyUpdate = {
  location?: ServiceLocation;
  label?: string;
  saveFavorite?: boolean;
  makeHome?: boolean;
  restoreHome?: boolean;
  confirmDifferent?: boolean;
  select?: boolean;
  propertyId?: string;
  removePropertyId?: string;
  details?: PropertyDetails;
};

/** A client's saved properties, through the same /api/properties route the website uses. */
export function useProperties(enabled: boolean) {
  const [state, setState] = useState<PropertyState>({ properties: [], selectedLocation: null });
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      setState(await api<PropertyState>("/api/properties"));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load your properties.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);
  useEffect(() => {
    void reload();
  }, [reload]);
  const update = useCallback(async (body: PropertyUpdate) => {
    const next = await api<PropertyState>("/api/properties", body as Record<string, unknown>);
    setState(next);
    return next;
  }, []);
  return { ...state, loading, error, reload, update };
}

export type { SavedProperty };

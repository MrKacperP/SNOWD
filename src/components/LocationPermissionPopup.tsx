"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import { Navigation, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from "@/lib/googleMaps";

interface LocationPermissionPopupProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

// Snowflake SVG marker rendered as a DOM overlay on the map
function SnowflakeMarker({ map, position }: { map: google.maps.Map | null; position: google.maps.LatLngLiteral }) {
  const [overlay, setOverlay] = React.useState<google.maps.OverlayView | null>(null);

  React.useEffect(() => {
    if (!map) return;

    class SnowOverlay extends google.maps.OverlayView {
      private div: HTMLDivElement | null = null;
      draw() {
        if (!this.div) return;
        const projection = this.getProjection();
        const pt = projection.fromLatLngToDivPixel(new google.maps.LatLng(position.lat, position.lng));
        if (pt) {
          this.div.style.left = `${pt.x - 24}px`;
          this.div.style.top = `${pt.y - 24}px`;
        }
      }
      onAdd() {
        this.div = document.createElement("div");
        this.div.style.position = "absolute";
        this.div.style.width = "48px";
        this.div.style.height = "48px";
        this.div.style.display = "flex";
        this.div.style.alignItems = "center";
        this.div.style.justifyContent = "center";
        this.div.innerHTML = `
          <div style="
            background: #2F6FED;
            border-radius: 50%;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 16px rgba(47,111,237,0.45);
            border: 3px solid white;
            animation: pulse-snowflake 2s infinite;
          ">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="2" x2="22" y1="12" y2="12"/>
              <line x1="12" x2="12" y1="2" y2="22"/>
              <line x1="20" x2="4" y1="4" y2="20"/>
              <line x1="20" x2="4" y1="20" y2="4"/>
            </svg>
          </div>`;
        const style = document.createElement("style");
        style.textContent = `@keyframes pulse-snowflake { 0%,100%{transform:scale(1);} 50%{transform:scale(1.15);} }`;
        this.div.appendChild(style);
        const panes = this.getPanes();
        panes?.overlayMouseTarget.appendChild(this.div);
      }
      onRemove() {
        this.div?.parentNode?.removeChild(this.div);
        this.div = null;
      }
    }

    const ov = new SnowOverlay();
    ov.setMap(map);
    setOverlay(ov);
    return () => { ov.setMap(null); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

const DEFAULT_CENTER = { lat: 43.6532, lng: -79.3832 }; // Toronto

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  styles: [
    { featureType: "all", elementType: "geometry", stylers: [{ color: "#e8f4fd" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9e8f9" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#f0f8ff" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#d4edda" }] },
    { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#ddeeff" }] },
    { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#2F6FED" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6B7C8F" }] },
  ],
};

export default function LocationPermissionPopup({ isOpen, onAllow, onDeny }: LocationPermissionPopupProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const onMapLoad = useCallback((m: google.maps.Map) => setMap(m), []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <motion.div
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Google Map */}
            <div className="relative h-44 w-full bg-[#e8f4fd]">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: "100%", height: "100%" }}
                  center={DEFAULT_CENTER}
                  zoom={13}
                  options={MAP_OPTIONS}
                  onLoad={onMapLoad}
                >
                  {map && <SnowflakeMarker map={map} position={DEFAULT_CENTER} />}
                </GoogleMap>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#e8f4fd]">
                  <div className="w-6 h-6 rounded-full border-2 border-[#2F6FED] border-t-transparent animate-spin" />
                </div>
              )}
              {/* Gradient overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
            </div>

            <div className="px-6 pt-1 pb-6">
              {/* Logo + heading */}
              <div className="flex items-center gap-3 mb-3">
                <motion.div
                  animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
                  transition={{ delay: 0.5, duration: 0.7 }}
                >
                  <Image src="/logo.png" alt="Snowd mascot" width={44} height={44} className="drop-shadow" />
                </motion.div>
                <div>
                  <h2 className="text-lg font-bold text-[#0B1F33] leading-tight">Allow location access</h2>
                  <p className="text-xs text-[#6B7C8F] mt-0.5">So I can find operators near you! ❄️</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {["Find operators near you", "Get local weather updates", "See better timing estimates"].map((item) => (
                  <div key={item} className="flex items-center gap-3 px-3 py-2 bg-[#F0F7FF] rounded-xl">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2F6FED] shrink-0" />
                    <span className="text-sm text-[var(--text-primary)]">{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-5">
                <Shield className="w-3 h-3 text-[#6B7C8F]" />
                <span className="text-xs text-[#6B7C8F]">Your location stays private and secure.</span>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={onAllow}
                  className="w-full py-3.5 bg-[#2F6FED] hover:bg-[#2158C7] text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[rgba(47,111,237,0.3)]"
                >
                  <Navigation className="w-4 h-4" />
                  Allow location
                </button>
                <button
                  onClick={onDeny}
                  className="w-full py-2.5 text-[#6B7C8F] hover:text-[#0B1F33] text-sm font-medium transition"
                >
                  Not right now
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

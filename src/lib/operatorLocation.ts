/** Quantize before persistence: exact device coordinates never enter a shared job. */
export function approximateOperatorLocation(lat: number, lng: number, accuracy: number) {
  if (![lat, lng, accuracy].every(Number.isFinite) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || accuracy < 0 || accuracy > 10000) throw new Error("Invalid location");
  const latStep = 100 / 111320;
  const lngStep = 100 / (111320 * Math.max(0.01, Math.cos(lat * Math.PI / 180)));
  return {
    operatorApproxLat: Math.max(-90, Math.min(90, Math.round(lat / latStep) * latStep)),
    operatorApproxLng: Math.max(-180, Math.min(180, Math.round(lng / lngStep) * lngStep)),
    operatorLocationRadiusKm: Math.max(0.1, Math.ceil((accuracy + 71) / 100) / 10),
  };
}

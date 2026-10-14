export default function PropertyMap({ address, origin, title = "Service location" }: { address: string; origin?: string; title?: string }) {
  const destination = encodeURIComponent(address);
  const source = origin ? `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${destination}&t=m&output=embed` : `https://maps.google.com/maps?q=${destination}&z=17&t=m&output=embed`;
  const link = origin ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${destination}` : `https://www.google.com/maps/search/?api=1&query=${destination}`;
  return <div className="property-map"><iframe title={title} src={source} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /><a href={link} target="_blank" rel="noreferrer">{origin ? "Open directions ↗" : "Open map ↗"}</a></div>;
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SNOWD",
    short_name: "SNOWD",
    description: "Book a nearby shoveler or earn clearing snow in your neighborhood.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f8fb",
    theme_color: "#f4f7fa",
    icons: [
      { src: "/icons/snowd-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/snowd-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}

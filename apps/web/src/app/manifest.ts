import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hospica — Patient Portal",
    short_name: "Hospica",
    description: "Book appointments, view results and manage your care.",
    start_url: "/portal",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a6e70",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}

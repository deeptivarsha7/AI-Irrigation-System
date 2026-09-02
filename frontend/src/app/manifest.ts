import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Irrigation Management System",
    short_name: "Irrigation",
    description: "Predictive water scheduling and crop optimization for smallholder farmers",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#FBF7EE",
    theme_color: "#2F5233",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512-any.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
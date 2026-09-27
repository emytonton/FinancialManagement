import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bolso",
    short_name: "Bolso",
    description: "Quanto eu ainda posso gastar?",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3f1",
    theme_color: "#8a2f5c",
    lang: "pt-BR",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}

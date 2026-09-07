import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CAFS DryChain",
    short_name: "CAFS",
    description:
      "End to end traceability for solar dried produce, every batch verified and secured on the blockchain.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a2c12",
    theme_color: "#47a81d",
    orientation: "portrait",
    scope: "/",
    icons: [
      {
        src: "/img/drychain-logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/img/drychain-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

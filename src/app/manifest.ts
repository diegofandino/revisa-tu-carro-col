import type { MetadataRoute } from "next";
import { APP_LOCALE, APP_NAME, BRAND_COLOR } from "@/constants/app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Lleva el mantenimiento de tu carro y tu moto, y sabe cuándo toca el próximo servicio.",
    lang: APP_LOCALE,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BRAND_COLOR,
    theme_color: BRAND_COLOR,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

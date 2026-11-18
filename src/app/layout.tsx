import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_LOCALE, APP_NAME, BRAND_COLOR } from "@/constants/app";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Mantenimiento de carros y motos: sabe cuándo toca el próximo servicio.",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  // Opt in to OS text scaling where supported (layout is rem-based; root font-size is never set).
  other: { "text-scale": "scale" },
};

export const viewport: Viewport = {
  themeColor: BRAND_COLOR,
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={APP_LOCALE}>
      <body>{children}</body>
    </html>
  );
}

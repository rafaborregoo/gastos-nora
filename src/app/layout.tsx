import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";

import { PwaProvider } from "@/components/pwa/pwa-provider";
import { AppToaster } from "@/components/ui/app-toaster";
import { getCurrentUserThemePreference } from "@/lib/queries/theme-queries";
import { getDefaultThemeTokens, themeVariablesToStyle } from "@/lib/theme";
import "@/app/globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "NORA Gastos",
  description: "Finanzas domesticas compartidas con Next.js y Supabase.",
  applicationName: "NORA Gastos",
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NORA Gastos"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"]
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const preference = await getCurrentUserThemePreference();
  const mode = preference?.mode ?? "light";
  const tokens = preference?.tokens ?? getDefaultThemeTokens(mode);

  return (
    <html lang="es" className={mode === "dark" ? "dark" : undefined} style={themeVariablesToStyle(tokens)}>
      <body className={`${manrope.variable} ${plexMono.variable} font-sans`}>
        <PwaProvider />
        {children}
        <AppToaster />
      </body>
    </html>
  );
}

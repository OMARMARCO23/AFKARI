// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Afkari",
    template: "%s · Afkari",
  },
  description: "Afkari — privacy-first AI decision coach.",
  applicationName: "Afkari",
  manifest: "/manifest.json",
  themeColor: "#111111",
};

export const viewport: Viewport = { themeColor: "#111111" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#111111" />
      </head>
      <body className="min-h-screen bg-white text-gray-900">
        {children}
      </body>
    </html>
  );
}

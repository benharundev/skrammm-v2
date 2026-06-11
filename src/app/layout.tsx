import type { Metadata, Viewport } from "next";
import { Inter, Lexend } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Skrammm",
  description: "Rugby Pitch Utility — match management for referees, coaches, and league administrators.",
  icons: {
    icon: "/logos/logo-icon-green.png",
    apple: "/logos/logo-icon-yellow.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#00241a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${lexend.variable}`}>
      <body>{children}</body>
    </html>
  );
}

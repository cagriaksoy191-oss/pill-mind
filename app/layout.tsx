import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PillMind — Akıllı İlaç Güvenliği Asistanı",
  description:
    "Kullandığınız ilaçlar arasındaki bilinen etkileşimleri kontrol edin. Sade Türkçe açıklamalar alın. PillMind bir bilgilendirme aracıdır, tıbbi tavsiye niteliği taşımaz.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script id="theme-script" strategy="beforeInteractive">{`
          try {
            const saved = localStorage.getItem("pillmind_theme");
            const system = window.matchMedia("(prefers-color-scheme: dark)").matches;
            const isDark = saved === "dark" || (!saved && system);
            if (isDark) {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
          } catch (_) {}
        `}</Script>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

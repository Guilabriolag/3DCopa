import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Copa Button 3D — Simulador de futebol de botão físico",
  description:
    "Jogo 3D de futebol de botão onde cada atleta é uma entidade física editável: atributo → geometria → física → comportamento em campo.",
};

export const viewport: Viewport = {
  themeColor: "#04060c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800;900&family=Barlow:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <TopBar />
        <main className="pb-24 md:pb-10">{children}</main>
      </body>
    </html>
  );
}

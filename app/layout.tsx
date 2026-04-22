import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import "./styles/colors_and_type.css";

// Legacy (still used by pages not yet migrated to the Portiqa design system)
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Portiqa design system — Inter / Source Serif 4 / JetBrains Mono.
// Exposed as --font-sans / --font-serif / --font-mono for use inside
// .portiqa-theme scopes (see app/styles/colors_and_type.css).
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Command Center",
  description: "Gestor visual de projectos, tarefas & relação com clientes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVars = [
    geistSans.variable,
    geistMono.variable,
    inter.variable,
    sourceSerif.variable,
    jetbrainsMono.variable,
  ].join(" ");

  return (
    <html lang="pt" className={fontVars}>
      <body>
        {children}
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}

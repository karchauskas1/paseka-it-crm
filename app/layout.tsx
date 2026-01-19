import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "sonner";
import { CommandPalette } from "@/components/search";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "PASEKA IT CRM",
  description: "CRM система для управления проектами и клиентами",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <Providers>
          {children}
          <CommandPalette />
        </Providers>
        <Toaster />
        <Sonner />
      </body>
    </html>
  );
}

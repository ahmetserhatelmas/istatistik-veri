import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oran Merkezi — İddaa Veri Platformu",
  description: "İddaa oran analizi, filtreleme ve tümdengelim aracı",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  );
}

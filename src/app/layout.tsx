import type { Metadata } from "next";
import "./globals.css";
import { SessionRevGuard } from "./SessionRevGuard";

export const metadata: Metadata = {
  title: "Oranexcel — İddaa veri ve filtreleme",
  description: "İddaa oran analizi, filtreleme ve tümdengelim aracı",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="antialiased">
        <SessionRevGuard />
        {children}
      </body>
    </html>
  );
}

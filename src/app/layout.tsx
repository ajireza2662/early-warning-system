import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EWS Banjir — Kabupaten Malinau",
  description: "Dashboard pemantauan water level sungai di Kabupaten Malinau",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen text-slate-900">{children}</body>
    </html>
  );
}

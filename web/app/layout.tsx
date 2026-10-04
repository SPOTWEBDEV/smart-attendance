import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Attendance | ESUT",
  description: "Fingerprint attendance verified by Bluetooth proximity.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
// Shared with the Flask app so both versions look identical.
import "../../static/style.css";

export const metadata: Metadata = {
  title: "MarsCrypt – Hide encrypted messages in images",
  description: "MarsCrypt hides AES-256 encrypted messages inside images using LSB steganography.",
};

export const viewport: Viewport = {
  themeColor: "#0a090d",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body id="top">{children}</body>
    </html>
  );
}

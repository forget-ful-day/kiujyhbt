import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoboChat",
  description: "RoboChat — чат в стиле Telegram, готовый к деплою на Vercel"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

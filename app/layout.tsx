import type { Metadata } from "next";
import {headers} from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "motion-dungeon.dclarke1005.chatgpt.site";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const image = new URL("/og.png", `${protocol}://${host}`).toString();
  return {
    title: "Motion Dungeon · Venice",
    description: "Enter Venice's private generative voice room inside Motion Dungeon.",
    icons: {icon: "/favicon.svg", shortcut: "/favicon.svg"},
    openGraph: {title: "Venice", description: "The room with a key.", images: [{url: image, width: 1732, height: 910}]},
    twitter: {card: "summary_large_image", title: "Venice", description: "The room with a key.", images: [image]},
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

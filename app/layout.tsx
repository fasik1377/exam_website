import type { Metadata, Viewport } from "next";
import { Noto_Sans_Ethiopic, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./theme-dark.css";
import { THEME_SCRIPT } from "@/lib/theme";
import MotionProvider from "@/app/components/MotionProvider";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const ethiopic = Noto_Sans_Ethiopic({
  variable: "--font-ethiopic",
  subsets: ["ethiopic"],
  weight: ["500", "700", "800"],
});

// Browser-tab and home-screen icons come from app/icon.png and app/apple-icon.png (file conventions).
export const metadata: Metadata = {
  title: "እውቀትNET | Ethiopian Exam Preparation",
  description: "እውቀትNET exam preparation for Ethiopian students, teachers, and schools.",
  applicationName: "እውቀትNET",
};

export const viewport: Viewport = {
  themeColor: "#0B1F3A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${ethiopic.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Sets light/dark before the first paint, so the page never flashes the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col"><MotionProvider>{children}</MotionProvider></body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmModal";
import PageTransition from "@/components/PageTransition";
import { getAccessibilityBootScript } from "@/lib/accessibility";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClassY - AI Ders Asistanı",
  description: "PDF ders notlarınızdan özet, flashcard ve quiz oluşturun",
  other: {
    "google": "notranslate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" translate="no" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen flex flex-col overflow-hidden bg-[#09090b]`}
      >
        <Script
          id="classy-accessibility-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: getAccessibilityBootScript() }}
        />
        <AccessibilityProvider>
          <AuthProvider>
            <ToastProvider>
              <ConfirmProvider>
                <Navbar />
                <PageTransition>{children}</PageTransition>
              </ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}

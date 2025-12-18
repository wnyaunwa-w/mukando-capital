import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AuthProvider } from "@/components/auth-provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mukando Capital | Modern Community Savings",
  description: "Join the digital revolution in community saving. Secure, transparent, and easy to manage group contributions.",
  metadataBase: new URL("https://www.mukandocapital.com"),
  openGraph: {
    title: "Mukando Capital - Transform Your Savings",
    description: "Secure, transparent, and easy to manage group contributions. Join the revolution today.",
    url: "https://www.mukandocapital.com",
    siteName: "Mukando Capital",
    images: [
      {
        url: "/images/home.png", // Ensure this image exists in your public folder
        width: 1200,
        height: 630,
        alt: "Mukando Capital App Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mukando Capital",
    description: "The digital revolution in community savings.",
    images: ["/images/home.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* The AuthProvider must wrap the whole app so login works everywhere */}
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
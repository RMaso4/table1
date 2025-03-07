// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import { ThemeProvider } from "@/components/ThemeProvider";
import ThemeDebug from "@/components/ThemeDebug";
import "./globals.css";

// Load fonts with preload
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Updated metadata (without viewport, themeColor, and colorScheme)
export const metadata: Metadata = {
  title: "Parthos Order Management System",
  description: "Manufacturing workflow management and real-time order tracking system",
  keywords: ["manufacturing", "order management", "workflow", "Parthos", "real-time"],
  authors: [{ name: "Parthos", url: "https://parthos.com" }],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

// Separate viewport export
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#003D73", // Match Parthos brand blue
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans bg-background text-foreground`}
      >
        <ThemeProvider>
          {/* Add this during development to debug theme issues */}
          {process.env.NODE_ENV === 'development' && <ThemeDebug />}
          
          {/* Notification container for toast messages */}
          <div id="toast-container" className="fixed top-4 right-4 z-50"></div>

          {/* Main content */}
          <Providers>
            <main className="flex-grow flex flex-col">
              {children}
            </main>
          </Providers>

          {/* Footer with minimal info */}
          <footer className="py-2 px-4 text-xs text-center text-muted-foreground border-t border-border">
            <p>© {new Date().getFullYear()} Parthos Order Management System</p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
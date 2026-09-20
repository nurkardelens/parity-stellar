"use client";

import { useCallback } from "react";
import localFont from "next/font/local";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Handshake,
  Settings2,
  Activity,
} from "lucide-react";
import WalletConnect from "@/components/WalletConnect";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/positions", label: "Positions", icon: BarChart3 },
  { href: "/maker", label: "Maker", icon: Handshake },
  { href: "/admin", label: "Admin", icon: Settings2 },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const handleWalletConnect = useCallback((address: string | null) => {
    // Store in window for child pages to access
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__parity_wallet = address;
    }
  }, []);

  return (
    <html lang="en" className="dark">
      <head>
        <title>Parity - Stellar FX Forward Market</title>
        <meta name="description" content="Two-sided FX forward market on Stellar" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-gray-100 min-h-screen`}
      >
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo + Nav */}
              <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <Activity className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-bold text-white tracking-tight">
                    Parity
                  </span>
                  <span className="text-xs text-gray-500 font-mono hidden sm:inline">
                    FX Forwards
                  </span>
                </Link>

                <nav className="hidden md:flex items-center gap-1">
                  {NAV_ITEMS.map((item) => {
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-gray-800 text-white"
                            : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Wallet */}
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
                  Stellar Testnet
                </div>
                <WalletConnect onConnect={handleWalletConnect} />
              </div>
            </div>
          </div>

          {/* Mobile nav */}
          <div className="md:hidden border-t border-gray-800">
            <div className="flex">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? "text-emerald-400"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-800 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Parity Protocol -- Stellar FX Forwards</span>
              <span className="font-mono">Covered Interest Rate Parity</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider, SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import AnimatedBackground from "@/components/common/AnimatedBackground";
import Footer from "@/components/common/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IntelliMCP Studio",
  description: "Create, Validate, and Deploy Model Context Protocols",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased flex flex-col min-h-screen relative`}
          suppressHydrationWarning={true}
        >
          <AnimatedBackground />
          <header className="p-4 flex justify-between items-center border-b border-gray-700 bg-black sticky top-0 z-10">
            <Link href="/">
              <span className="text-xl font-semibold text-white">Intelli MCP</span>
            </Link>
            <div className="flex items-center gap-4">
              <SignedOut>
                <SignInButton mode="modal">
                   <Button variant="ghost" className="text-white hover:bg-gray-800">Sign in</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                   <Button>Sign up</Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard">
                   <Button variant="ghost" className="text-white hover:bg-gray-800">
                       Dashboard
                   </Button>
                </Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </header>
          <main className="flex-grow flex flex-col z-0 min-h-[calc(100vh-10rem)]">
          {children}
          </main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}

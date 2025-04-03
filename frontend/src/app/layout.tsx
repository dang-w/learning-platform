'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/lib/providers/query-provider";
import { AuthProvider } from "@/lib/providers/auth-provider";
import { AuthInitializer } from "@/lib/providers/auth-initializer";
import MainLayout from "@/components/layout/main-layout";
const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <AuthInitializer>
              <MainLayout>
                {children}
              </MainLayout>
            </AuthInitializer>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "N-Queens Problem",
  description:
    "N-Queens 퍼즐을 직접 플레이해 볼 수 있는 반응형 웹 게임입니다.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col bg-bg text-fg">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-6 sm:px-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

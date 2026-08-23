import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "동네 큐레이터",
  description: "일상 경로를 AI가 로컬 여행 코스로 만들어주는 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- root layout wraps every page, not a single one; matches MVP_DESIGN/README.md's Google Fonts link */}
        <link
          href="https://fonts.googleapis.com/css2?family=Gothic+A1:wght@300;400;500;700&family=Archivo:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

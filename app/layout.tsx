import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "VSPHERE | SOOP VTuber Support Project",
  description: "SOOP 버튜버 콘텐츠, 클립, 일정, 커뮤니티를 모으는 VSPHERE MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

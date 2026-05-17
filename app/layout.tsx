import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 视频提示词工作台",
  description: "为 AI 视频与图像生成工具优化 positive / negative prompt",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

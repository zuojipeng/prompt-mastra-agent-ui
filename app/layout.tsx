import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 视频分镜 Prompt 工作台",
  description: "为 AI 视频生成工具产出分镜时间轴、positive prompt、negative prompt 和平台适配版本",
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

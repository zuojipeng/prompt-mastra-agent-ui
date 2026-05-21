import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "镜词 · AI 视频提示词工坊 | 输入创意，秒出中文画面描述",
  description:
    "专为中文 AI 视频创作者设计。输入一句创意，自动生成多镜头中文画面描述，支持 Seedance、小云雀、可灵 Kling、Runway、Pika、Sora 等主流平台一键导出。",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
  },
  other: {
    "theme-color": "#059669",
    "apple-mobile-web-app-capable": "yes",
  },
  openGraph: {
    title: "镜词 · AI 视频提示词工坊",
    description:
      "输入创意，秒出专业中文画面描述。多镜头叙事、导演模式、一键导出到各大 AI 视频平台。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}

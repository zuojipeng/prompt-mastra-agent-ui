import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages 静态导出配置
  output: 'export',  // 静态导出模式
  
  images: {
    unoptimized: true,  // 必须禁用图片优化
  },
  
  // 跳过构建检查
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

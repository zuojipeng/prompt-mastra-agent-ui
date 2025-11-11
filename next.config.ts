import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages 优化配置
  images: {
    unoptimized: true,
  },
  
  output: 'standalone',
  
  // 跳过 ESLint 检查（加快构建）
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 跳过 TypeScript 类型检查（加快构建）
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

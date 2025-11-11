import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages 优化配置
  images: {
    unoptimized: true, // Cloudflare Pages 不支持 Next.js Image Optimization
  },
  
  // 确保输出兼容 Cloudflare Pages
  output: 'standalone',
};

export default nextConfig;

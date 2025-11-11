import type { NextConfig } from "next";

const isCloudflare = process.env.DEPLOY_TARGET === 'cloudflare';

const nextConfig: NextConfig = {
  // Cloudflare Pages 静态导出配置
  ...(isCloudflare ? {
    output: 'export',
    images: {
      unoptimized: true,
    },
  } : {}),
  
  // 允许跨域请求（开发环境）
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};

export default nextConfig;

import cloudflareAccessPlugin from '@cloudflare/pages-plugin-cloudflare-access';

interface AccessEnv {
  CF_ACCESS_AUD?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
}

interface FunctionContext {
  env: AccessEnv;
  request: Request;
  next: () => Promise<Response>;
  data: Record<string, unknown>;
}

export async function onRequest(context: FunctionContext) {
  const domain = context.env.CF_ACCESS_TEAM_DOMAIN;
  const aud = context.env.CF_ACCESS_AUD;
  if (!domain || !aud || !domain.startsWith('https://') || !domain.endsWith('.cloudflareaccess.com')) {
    return new Response('Access policy is not configured', { status: 503 });
  }
  return cloudflareAccessPlugin({
    domain: domain as `https://${string}.cloudflareaccess.com`,
    aud,
  })(context as never);
}

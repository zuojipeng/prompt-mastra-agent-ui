# Release Runbook · V2 DirectorKit

Date: 2026-06-03
Owner: DevOps Agent
Scope: V2 release gate, deployment, rollback, and production verification

## Release Gate

Required command:

```bash
npm run release:v2:check
```

The release gate passes only when all of these pass in order:

1. Static export build
2. TypeScript check
3. ESLint check
4. V2 QA gate

## Environments

Frontend:

```text
Cloudflare Pages
Node 20+
Build command: npm run build
Output directory: out
```

Backend:

```text
Cloudflare Worker
Health: /api/health
V2 API: /api/v2/director-kit
D1 binding: DB
```

## Secrets

Required backend secrets:

```text
DEEPSEEK_API_KEY
```

Optional backend secrets/config:

```text
API_KEY
DEBUG_ERRORS=false
ALLOWED_ORIGINS=<production frontend origins>
```

Secrets must be configured through Cloudflare, not committed to git.

## Deployment

Frontend deploy:

```bash
git push origin main
```

Backend deploy:

```bash
npx wrangler deploy
```

For backend D1 schema changes, apply schema before exposing new frontend behavior.

Fallback when Wrangler cannot reach Cloudflare API but direct `curl` works:

```bash
npx wrangler deploy --dry-run --outdir /private/tmp/prompt-optimizer-worker-dry-run
```

Upload the generated module worker through the Cloudflare Workers REST API with metadata that includes:

```json
{
  "main_module": "workers-entry-d1.js",
  "compatibility_date": "2024-09-23",
  "compatibility_flags": ["nodejs_compat"],
  "bindings": [
    {
      "type": "d1",
      "name": "DB",
      "id": "f02d2d29-2553-4fd9-bb5b-acf29abd6a42"
    }
  ]
}
```

This fallback is for deploy-channel recovery only. It does not replace normal Wrangler deployment.

## Production Verification

After deploy:

```bash
curl --silent https://prompt-optimizer.hahazuo460.workers.dev/api/health
```

Then verify the browser journey:

```text
input -> diagnosis -> reconstruct -> result
```

Minimum acceptance:
- User can complete the V2 flow.
- Recoverable API failure does not erase input.
- Mobile flow is usable.
- No blocking browser console error.

## Rollback

Rollback frontend from Cloudflare Pages Deployments to the previous healthy production deployment.

Rollback backend from Cloudflare Workers Deployments, or redeploy the previous healthy backend commit.

Rollback is required when:
- Frontend production page is unavailable.
- `/api/health` fails.
- `/api/v2/director-kit` cannot produce a contract-valid response.
- `/api/v2/director-kit` returns sustained model upstream 502.
- CORS blocks the production frontend.
- V2 core flow cannot complete.

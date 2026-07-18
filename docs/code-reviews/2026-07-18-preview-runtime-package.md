# Code Review: Preview Runtime Package

Status: PASS FOR LOCAL CONTAINER HANDOFF; CLOUD DEPLOYMENT BLOCKED
Producer: Architecture Agent + Engineering Agent + DevOps Agent
Reviewer: Security Agent + Code Review Agent

## Scope

- Railway composition root and configuration-as-code.
- Pinned non-root Docker image and Python dependency lock.
- Runtime configuration, lifecycle logging, and signal handling.
- Runtime plan validator and deterministic local container smoke.

## Findings Closed

1. **BLOCKER - command-line defaults were unsafe for Railway.** The existing developer CLI defaulted to loopback and port 8788. A separate runtime entrypoint now requires the injected `PORT`, binds all container interfaces, and validates the public-preview policy before creating the server.
2. **BLOCKER - shutdown from a Python signal handler could deadlock.** `HTTPServer.shutdown()` must be called outside the `serve_forever()` thread. The handler now starts one bounded daemon shutdown thread and ignores duplicate signals.
3. **BLOCKER - transitive dependencies floated.** The image now installs an exact-version lock and pins the Python patch image. The original top-level requirements remain for spike development only.
4. **BLOCKER - root container process.** Package installation occurs during build, then the service runs as the unprivileged `jingci` user.
5. **REWORK - first localhost curls failed inside the restricted command sandbox.** The container remained healthy; the same checks succeeded from the approved host boundary. The committed smoke reproduces the host-side path and cleans its container on every exit.
6. **IMPROVEMENT - manual verification was not durable.** Added one command that builds, checks health/auth/success, sends SIGTERM, and removes temporary responses and the container.

## Security Properties Reviewed

- No production environment file or value is read by the validator or smoke.
- The runtime plan records variable names and classifications only, with every external authorization false.
- Invalid configuration logs only a generic event and exits before bind.
- Startup events omit the allowed origin and bearer token.
- The Dockerfile declares no token, key, secret, password, build argument, or public port.
- The success smoke returns only deterministic `memory://` evidence and cannot contact B2 or Runway.

## Residual Risks

- Railway root-directory selection, variables, domain, and deployment have not been tested on Railway.
- Cloudflare Access and distributed rate limiting remain external configuration.
- The deployed service will need a deployment-scoped B2 key and post-deploy abuse, rollback, log, desktop, and mobile evidence.
- Exact package pins improve repeatability but are not a hash-locked supply-chain guarantee.

## Verdict

The runtime package is proportionate, locally reproducible, and fail-closed. It is ready for a separately authorized deployment operation, not public release.

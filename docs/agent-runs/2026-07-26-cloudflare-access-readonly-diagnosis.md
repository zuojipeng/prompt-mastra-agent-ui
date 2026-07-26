# Agent Run: Cloudflare Access Read-Only Diagnosis

Date: 2026-07-26

Task: C-049 / JC-T005

Orchestrator: Hermes

Agents: Security Agent, DevOps Agent, Test Agent, Code Review Agent, Claims Review Agent

## Goal

Explain the failed identity-only health preflight without creating credentials,
changing Cloudflare configuration, or sending another request to the preview.

## Read-Only Inspection

- Removed the new Access log view's default `Service authentication = Exclude`
  filter.
- Inspected both new and legacy Access authentication logs across the preflight
  time window.
- Inspected the two Access application targets and the wildcard application's
  authentication settings.
- Compared the observed configuration with Cloudflare's documented service-token
  and application-path behavior.

## Evidence

- The preflight hash hostname matches only
  `*.jingci-genmedia-preview-2026.pages.dev`.
- The separate apex application protects only
  `jingci-genmedia-preview-2026.pages.dev`; it cannot override the hash hostname.
- The wildcard application uses the standard service-token header mode. No
  custom single-header source is configured.
- Failed service authentication is configured for Cloudflare's default behavior,
  not an explicit HTTP 401 response.
- Both log views contained only two completed owner-session authentication
  events. Neither view contained a service-authentication event at the identity
  preflight time.

## Classification

The evidence rejects application overlap and custom-header-mode mismatch. It
supports a narrower classification: Access did not accept the request as the
selected service token, so it followed the default interactive-login redirect
path.

The deleted temporary token and deleted request material prevent a defensible
distinction between:

1. missing or malformed service-token header values; and
2. a Client ID / Client Secret pair that did not match the token selected by the
   attached Service Auth policy.

No stronger root-cause claim is permitted.

## Decision

Keep the business POST blocked. A future, separately approved identity-only
preflight must create a fresh token, capture each credential by its explicit
label, bind the same token identity to the policy and request attestation, and
stop again unless the health endpoint returns exact HTTP 200 JSON.

No preview request, Cloudflare mutation, B2 operation, deployment, Runway call,
publication, or Devpost submission occurred during this diagnosis.

# Public Judge Demo Deployment Report

Date: 2026-07-31

Status: DEPLOYED / ANONYMOUS SMOKE PASSED

## Release

- Project: `jingci-genmedia-judge-demo-2026`
- Stable URL: `https://jingci-genmedia-judge-demo-2026.pages.dev`
- Immutable deployment: `https://a4ad2165.jingci-genmedia-judge-demo-2026.pages.dev`
- Source commit: `c73388de6515086c00c6c7af8b4db2c87f3c532f`
- Branch: `spike/backblaze-provenance`
- Input: 27-file verified static package
- Secrets and environment bindings uploaded: none

## Anonymous Evidence

- Stable `GET /`: HTTP 200.
- Desktop and mobile Playwright: 2/2 passed.
- Complete diagnosis, reconstruction, DirectorKit, and Fixture provenance path passed.
- Requests outside the Pages host: 0.
- Browser console errors: 0.
- Private bucket prefix and secret binding names visible in UI: 0.
- Public manifest reports fixture mode, zero Functions, zero cloud writes, and zero external API calls.
- `_routes.json`: HTTP 404.

## Diagnostic Boundary

A direct diagnostic GET to the unused `/api/provenance` path returned HTTP 503 rather than 404. The browser made zero requests to that path, the deployed input contains no API/Function/Worker file, and the UI labels the action as Fixture. This response is retained as residual edge behavior and is not evidence of a working API.

## Rollback Decision

Rollback was not triggered because the approved stop conditions did not occur: the application made no external request and exposed no misleading live-provider or B2 claim. The separate protected preview remains unchanged.

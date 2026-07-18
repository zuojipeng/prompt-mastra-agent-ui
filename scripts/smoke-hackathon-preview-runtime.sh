#!/usr/bin/env bash
set -euo pipefail

readonly IMAGE="jingci-provenance-preview:local"
readonly CONTAINER="jingci-provenance-smoke"
readonly HOST_PORT="${JINGCI_SMOKE_PORT:-18788}"
readonly ORIGIN="https://preview.jingci.example"
readonly TOKEN="local-smoke-token-only-0000000000000000"
readonly SERVICE_ROOT="spikes/genblaze-provenance"
readonly RESPONSE_DIR="$(mktemp -d)"

cleanup() {
  docker rm --force "${CONTAINER}" >/dev/null 2>&1 || true
  rm -rf "${RESPONSE_DIR}"
}
trap cleanup EXIT

docker build --tag "${IMAGE}" "${SERVICE_ROOT}"
docker run --rm --detach \
  --name "${CONTAINER}" \
  --publish "127.0.0.1:${HOST_PORT}:8788" \
  --env PORT=8788 \
  --env JINGCI_PUBLIC_PREVIEW_MODE=YES \
  --env JINGCI_PREVIEW_ALLOWED_ORIGIN="${ORIGIN}" \
  --env JINGCI_PREVIEW_BEARER_TOKEN="${TOKEN}" \
  --env JINGCI_PREVIEW_MAX_CONCURRENCY=2 \
  --env JINGCI_PROVENANCE_ENABLED=YES \
  --env JINGCI_PROVENANCE_STORAGE_MODE=MEMORY \
  "${IMAGE}" >/dev/null

for _ in {1..30}; do
  if curl --silent --fail "http://127.0.0.1:${HOST_PORT}/health" >"${RESPONSE_DIR}/health.json"; then
    break
  fi
  sleep 1
done

python3 - "${RESPONSE_DIR}/health.json" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as source:
    payload = json.load(source)
assert payload == {"status": "ok", "mode": "preview"}, payload
PY

unauthorized_status="$(curl --silent --output "${RESPONSE_DIR}/unauthorized.json" --write-out '%{http_code}' \
  --request POST "http://127.0.0.1:${HOST_PORT}/v1/provenance-runs" \
  --header "Origin: ${ORIGIN}" \
  --header 'Content-Type: application/json' \
  --data '{"schema_version":"jingci.provenance-run-request.v1"}')"
test "${unauthorized_status}" = "401"

curl --silent --fail --output "${RESPONSE_DIR}/authorized.json" \
  --request POST "http://127.0.0.1:${HOST_PORT}/v1/provenance-runs" \
  --header "Origin: ${ORIGIN}" \
  --header "Authorization: Bearer ${TOKEN}" \
  --header 'Content-Type: application/json' \
  --data '{"schema_version":"jingci.provenance-run-request.v1","project_id":"container-smoke","shot_id":1,"parent_job_id":null,"attempt":1,"prompt":"deterministic local fixture","negative_prompt":"flicker","provider":"genblaze-local","model":"local-proof","modality":"video"}'

python3 - "${RESPONSE_DIR}/authorized.json" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as source:
    payload = json.load(source)
assert payload["status"] == "succeeded", payload
assert payload["result"]["manifest"]["verified"] is True, payload
assert payload["result"]["asset"]["url"].startswith("memory://"), payload
PY

docker stop --timeout 10 "${CONTAINER}" >/dev/null
echo "Preview runtime container smoke passed: health=200 unauthorized=401 fixture=verified graceful_stop=passed"

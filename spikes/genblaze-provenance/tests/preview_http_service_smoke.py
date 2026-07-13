from __future__ import annotations

import json
import threading
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from jingci_spike.http_service import PreviewSecurityPolicy, ProvenanceHTTPServer


ORIGIN = "https://preview.jingci.example"
TOKEN = "smoke-service-token-that-is-long-enough"


def _payload() -> bytes:
    return json.dumps(
        {
            "schema_version": "jingci.provenance-run-request.v1",
            "project_id": "preview-smoke-project",
            "shot_id": 1,
            "parent_job_id": None,
            "attempt": 1,
            "prompt": "credential-free preview boundary smoke",
            "negative_prompt": "",
            "provider": "genblaze-local",
            "model": "local-proof",
            "modality": "video",
        }
    ).encode()


def main() -> int:
    policy = PreviewSecurityPolicy(ORIGIN, TOKEN, True, 2)
    server = ProvenanceHTTPServer(("127.0.0.1", 0), policy)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    endpoint = f"http://127.0.0.1:{server.server_port}/v1/provenance-runs"
    try:
        unauthorized = Request(
            endpoint,
            data=_payload(),
            headers={"Content-Type": "application/json", "Origin": ORIGIN},
            method="POST",
        )
        try:
            urlopen(unauthorized, timeout=5)
            raise AssertionError("unauthorized preview request unexpectedly succeeded")
        except HTTPError as error:
            assert error.code == 401
            assert json.load(error)["error"]["code"] == "unauthorized"

        authorized = Request(
            endpoint,
            data=_payload(),
            headers={
                "Authorization": f"Bearer {TOKEN}",
                "Content-Type": "application/json",
                "Origin": ORIGIN,
            },
            method="POST",
        )
        with urlopen(authorized, timeout=10) as response:
            result = json.load(response)
            assert response.status == 200
            assert response.headers["Access-Control-Allow-Origin"] == ORIGIN
            assert response.headers["X-Request-Id"]
            assert result["status"] == "succeeded"
            assert result["result"]["manifest"]["verified"] is True
        print("PASS preview security boundary smoke")
        return 0
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


if __name__ == "__main__":
    raise SystemExit(main())

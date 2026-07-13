from __future__ import annotations

import json
import threading
from urllib.request import Request, urlopen

from jingci_spike.http_service import create_local_server


def main() -> int:
    server = create_local_server(0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f"http://127.0.0.1:{server.server_port}"
    try:
        with urlopen(f"{base_url}/health", timeout=5) as response:
            assert response.status == 200
            assert json.load(response)["mode"] == "local-fixture"
        payload = {
            "schema_version": "jingci.provenance-run-request.v1",
            "project_id": "smoke-project",
            "shot_id": 1,
            "parent_job_id": None,
            "attempt": 1,
            "prompt": "credential-free local smoke",
            "negative_prompt": "",
            "provider": "genblaze-local",
            "model": "local-proof",
            "modality": "video",
        }
        request = Request(
            f"{base_url}/v1/provenance-runs",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json", "Origin": "http://127.0.0.1:3000"},
            method="POST",
        )
        with urlopen(request, timeout=10) as response:
            result = json.load(response)
            assert response.status == 200
            assert result["status"] == "succeeded"
            assert result["result"]["manifest"]["verified"] is True
            assert result["result"]["asset"]["url"].startswith("memory://")
        print(f"PASS local provenance HTTP smoke port={server.server_port}")
        return 0
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import json
import os
import signal
import sys
import threading
from dataclasses import dataclass
from typing import Mapping

from .http_service import PreviewSecurityPolicy, create_server


PUBLIC_HOST = "0.0.0.0"


@dataclass(frozen=True)
class RuntimeConfig:
    host: str
    port: int
    policy: PreviewSecurityPolicy

    @classmethod
    def from_environment(cls, environment: Mapping[str, str]) -> "RuntimeConfig":
        raw_port = environment.get("PORT", "")
        try:
            port = int(raw_port)
        except ValueError as error:
            raise ValueError("PORT must be an integer between 1 and 65535") from error
        if not 1 <= port <= 65_535:
            raise ValueError("PORT must be an integer between 1 and 65535")
        policy = PreviewSecurityPolicy.from_environment(environment)
        return cls(host=PUBLIC_HOST, port=port, policy=policy)

    def startup_event(self) -> dict[str, object]:
        return {
            "event": "provenance_runtime_starting",
            "host": self.host,
            "port": self.port,
            "mode": "preview",
            "enabled": self.policy.enabled,
            "max_concurrency": self.policy.max_concurrency,
        }


def _write_event(event: dict[str, object]) -> None:
    print(json.dumps(event, separators=(",", ":")), file=sys.stderr, flush=True)


def serve(environment: Mapping[str, str]) -> int:
    try:
        config = RuntimeConfig.from_environment(environment)
    except ValueError:
        _write_event({"event": "provenance_runtime_config_invalid"})
        return 2

    server = create_server(config.host, config.port, environment)
    shutdown_started = threading.Event()

    def request_shutdown(signum: int, _frame: object) -> None:
        if shutdown_started.is_set():
            return
        shutdown_started.set()
        _write_event({"event": "provenance_runtime_stopping", "signal": signum})
        threading.Thread(target=server.shutdown, name="runtime-shutdown", daemon=True).start()

    previous_handlers = {
        signum: signal.signal(signum, request_shutdown)
        for signum in (signal.SIGTERM, signal.SIGINT)
    }
    _write_event(config.startup_event())
    try:
        server.serve_forever()
    finally:
        server.server_close()
        for signum, handler in previous_handlers.items():
            signal.signal(signum, handler)
        _write_event({"event": "provenance_runtime_stopped"})
    return 0


def main() -> int:
    return serve(os.environ)


if __name__ == "__main__":
    raise SystemExit(main())

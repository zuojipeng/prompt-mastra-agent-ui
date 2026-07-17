from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from urllib.parse import unquote, urlparse

from jingci_spike.live_genblaze_b2_smoke import build_smoke_prefix
from jingci_spike.live_runway_smoke import VideoProbe
from jingci_spike.local_pipeline import InMemoryStorageBackend
from jingci_spike.recovered_runway_b2_transaction import run_recovered_runway_b2_transaction


MEDIA = b"\x00\x00\x00\x18ftypisomrecovered-runway-video"
TASK_ID = "17f20503-6c24-4c16-946b-35dbbce2af2f"


class DurableHttpsMemoryBackend(InMemoryStorageBackend):
    def get_durable_url(self, key: str) -> str:
        return f"https://storage.example.test/{key}"

    def key_from_url(self, url: str) -> str | None:
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.netloc != "storage.example.test" or parsed.query:
            return None
        return unquote(parsed.path.lstrip("/"))


class RecoveredRunwayB2TransactionTest(unittest.TestCase):
    def task(self, **changes: object) -> dict[str, object]:
        value: dict[str, object] = {
            "id": TASK_ID,
            "status": "SUCCEEDED",
            "output": ["https://media.runway.test/output.mp4?token=private"],
        }
        value.update(changes)
        return value

    @staticmethod
    def probe(path: Path) -> VideoProbe:
        if path.read_bytes() != MEDIA:
            raise AssertionError("unexpected media")
        return VideoProbe("h264", 1280, 720, 5.0)

    def test_recovered_task_preserves_lineage_without_provider_create(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            media = Path(directory) / "output.mp4"
            media.write_bytes(MEDIA)
            backend = DurableHttpsMemoryBackend()
            result = run_recovered_runway_b2_transaction(
                task_record=self.task(),
                media_path=media,
                backend=backend,
                probe=self.probe,
                prefix=build_smoke_prefix(run_id="1" * 32),
                output_host="media.runway.test",
            )

            self.assertEqual(result.status, "passed")
            self.assertEqual(result.task_id, TASK_ID)
            self.assertEqual(result.provider_create_count, 0)
            self.assertTrue(result.storage_cleanup)
            self.assertTrue(result.local_media_preserved)
            self.assertEqual(backend.objects, {})
            self.assertTrue(media.exists())

    def test_invalid_task_or_output_host_fails_before_storage(self) -> None:
        cases = (
            self.task(status="RUNNING"),
            self.task(output=["https://other.runway.test/output.mp4"]),
            self.task(id="not-a-task"),
        )
        with tempfile.TemporaryDirectory() as directory:
            media = Path(directory) / "output.mp4"
            media.write_bytes(MEDIA)
            for task in cases:
                backend = InMemoryStorageBackend()
                with self.subTest(task=task):
                    with self.assertRaises(ValueError):
                        run_recovered_runway_b2_transaction(
                            task_record=task,
                            media_path=media,
                            backend=backend,
                            probe=self.probe,
                            prefix=build_smoke_prefix(run_id="2" * 32),
                            output_host="media.runway.test",
                        )
                    self.assertEqual(backend.objects, {})

    def test_symlinked_media_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / "target.mp4"
            target.write_bytes(MEDIA)
            alias = root / "alias.mp4"
            alias.symlink_to(target)
            backend = InMemoryStorageBackend()
            with self.assertRaisesRegex(ValueError, "regular file"):
                run_recovered_runway_b2_transaction(
                    task_record=self.task(),
                    media_path=alias,
                    backend=backend,
                    probe=self.probe,
                    prefix=build_smoke_prefix(run_id="3" * 32),
                    output_host="media.runway.test",
                )
            self.assertEqual(backend.objects, {})


if __name__ == "__main__":
    unittest.main()

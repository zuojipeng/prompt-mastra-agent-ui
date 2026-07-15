from __future__ import annotations

import fcntl
import os
import re
import secrets
import stat
from pathlib import Path


def durable_sync(descriptor: int) -> None:
    full_sync = getattr(fcntl, "F_FULLFSYNC", None)
    if full_sync is not None:
        fcntl.fcntl(descriptor, full_sync)
    os.fsync(descriptor)


_SENSITIVE = (
    re.compile(rb"AKIA[0-9A-Z]{16}"),
    re.compile(rb"key_[A-Za-z0-9_-]{64,}"),
    re.compile(rb"(?:https?://|[?&](?:token|sig|signature|X-Amz-Signature)=)", re.IGNORECASE),
    re.compile(rb"Bearer\s+[A-Za-z0-9._~+/-]{16,}", re.IGNORECASE),
    re.compile(rb"sk-[A-Za-z0-9_-]{20,}"),
)


def reject_sensitive_payload(payload: bytes) -> None:
    if any(pattern.search(payload) for pattern in _SENSITIVE):
        raise ValueError("private record contains forbidden sensitive material")


def open_owner_directory(path: Path, *, create: bool = True) -> int:
    if not path.is_absolute() or ".." in path.parts or path == Path("/"):
        raise ValueError("private directory must be an absolute non-root path")
    flags = (
        os.O_RDONLY
        | os.O_DIRECTORY
        | getattr(os, "O_NOFOLLOW", 0)
        | getattr(os, "O_CLOEXEC", 0)
    )
    descriptor = os.open("/", flags)
    try:
        components = path.parts[1:]
        for index, component in enumerate(components):
            if create and index == len(components) - 1:
                try:
                    os.mkdir(component, mode=0o700, dir_fd=descriptor)
                except FileExistsError:
                    pass
            child = os.open(component, flags, dir_fd=descriptor)
            os.close(descriptor)
            descriptor = child
        metadata = os.fstat(descriptor)
        if (
            not stat.S_ISDIR(metadata.st_mode)
            or metadata.st_uid != os.geteuid()
            or stat.S_IMODE(metadata.st_mode) != 0o700
        ):
            raise PermissionError("private directory must be owner-only")
        return descriptor
    except BaseException:
        os.close(descriptor)
        raise


def publish_immutable(directory_descriptor: int, final_name: str, payload: bytes) -> None:
    reject_sensitive_payload(payload)
    temporary_name = f".{final_name}.{os.getpid()}.{secrets.token_hex(12)}.tmp"
    temporary_descriptor: int | None = None
    published = False
    try:
        temporary_descriptor = os.open(
            temporary_name,
            os.O_WRONLY
            | os.O_CREAT
            | os.O_EXCL
            | getattr(os, "O_NOFOLLOW", 0)
            | getattr(os, "O_CLOEXEC", 0),
            0o600,
            dir_fd=directory_descriptor,
        )
        offset = 0
        while offset < len(payload):
            written = os.write(temporary_descriptor, payload[offset:])
            if written <= 0:
                raise RuntimeError("private record write was incomplete")
            offset += written
        durable_sync(temporary_descriptor)
        os.close(temporary_descriptor)
        temporary_descriptor = None
        os.link(
            temporary_name,
            final_name,
            src_dir_fd=directory_descriptor,
            dst_dir_fd=directory_descriptor,
            follow_symlinks=False,
        )
        published = True
        os.unlink(temporary_name, dir_fd=directory_descriptor)
        durable_sync(directory_descriptor)
    finally:
        if temporary_descriptor is not None:
            os.close(temporary_descriptor)
        if not published:
            try:
                os.unlink(temporary_name, dir_fd=directory_descriptor)
            except FileNotFoundError:
                pass


def read_private_file(path: Path, *, maximum_bytes: int = 256_000) -> bytes:
    directory_descriptor = open_owner_directory(path.parent, create=False)
    try:
        descriptor = os.open(
            path.name,
            os.O_RDONLY
            | getattr(os, "O_NONBLOCK", 0)
            | getattr(os, "O_NOFOLLOW", 0)
            | getattr(os, "O_CLOEXEC", 0),
            dir_fd=directory_descriptor,
        )
        try:
            metadata = os.fstat(descriptor)
            if (
                not stat.S_ISREG(metadata.st_mode)
                or metadata.st_uid != os.geteuid()
                or metadata.st_nlink != 1
                or stat.S_IMODE(metadata.st_mode) != 0o600
                or metadata.st_size <= 0
                or metadata.st_size > maximum_bytes
            ):
                raise PermissionError("private record file is unsafe")
            chunks: list[bytes] = []
            remaining = maximum_bytes + 1
            while remaining > 0:
                chunk = os.read(descriptor, min(64 * 1024, remaining))
                if not chunk:
                    break
                chunks.append(chunk)
                remaining -= len(chunk)
            payload = b"".join(chunks)
            if len(payload) > maximum_bytes:
                raise ValueError("private record exceeds its size limit")
            return payload
        finally:
            os.close(descriptor)
    finally:
        os.close(directory_descriptor)

"""File save, read, and cleanup utilities for uploaded resumes."""

from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path
from typing import Tuple

from dotenv import load_dotenv

load_dotenv()

_DEFAULT_UPLOAD_DIR = "./temp_uploads"
_DEFAULT_MAX_MB = 5

ALLOWED_EXTENSIONS = {".pdf", ".docx"}


def get_upload_dir() -> Path:
    """Return the configured upload directory, creating it if needed."""
    path = Path(os.getenv("UPLOAD_DIR", _DEFAULT_UPLOAD_DIR)).resolve()
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_max_file_size_bytes() -> int:
    """Maximum upload size in bytes from MAX_FILE_SIZE_MB."""
    mb = float(os.getenv("MAX_FILE_SIZE_MB", str(_DEFAULT_MAX_MB)))
    return int(mb * 1024 * 1024)


def validate_extension(filename: str) -> None:
    """
    Ensure the filename has an allowed extension.

    Raises:
        ValueError: If extension is not PDF or DOCX.
    """
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type '{suffix}'. Only PDF and DOCX are allowed."
        )


def validate_size(size_bytes: int) -> None:
    """
    Reject uploads larger than the configured maximum.

    Raises:
        ValueError: If file exceeds max size.
    """
    max_bytes = get_max_file_size_bytes()
    if size_bytes > max_bytes:
        max_mb = max_bytes / (1024 * 1024)
        raise ValueError(
            f"File too large ({size_bytes / (1024 * 1024):.2f} MB). "
            f"Maximum allowed is {max_mb:.0f} MB."
        )


def save_upload(filename: str, data: bytes) -> Tuple[str, Path]:
    """
    Save upload bytes to a unique path under the upload directory.

    Returns:
        Tuple of (stored_filename, absolute_path).
    """
    validate_extension(filename)
    validate_size(len(data))
    upload_dir = get_upload_dir()
    stem = Path(filename).stem
    suffix = Path(filename).suffix.lower()
    unique = f"{stem}_{uuid.uuid4().hex}{suffix}"
    dest = upload_dir / unique
    dest.write_bytes(data)
    return unique, dest.resolve()


def delete_file(path: Path) -> None:
    """Remove a file if it exists."""
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass


def cleanup_old_uploads(upload_dir: Path | None = None, max_age_seconds: int = 86400) -> None:
    """
    Optionally remove stale files in the upload directory (best-effort).

    Not used by default routes; available for scheduled cleanup.
    """
    import time

    base = upload_dir or get_upload_dir()
    now = time.time()
    for p in base.iterdir():
        if p.is_file() and now - p.stat().st_mtime > max_age_seconds:
            try:
                p.unlink()
            except OSError:
                pass


def clear_upload_dir() -> None:
    """Remove all files in the upload directory (e.g. for tests)."""
    d = get_upload_dir()
    if d.exists():
        shutil.rmtree(d)
        d.mkdir(parents=True, exist_ok=True)

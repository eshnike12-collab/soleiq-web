#!/usr/bin/env python3
"""Run the FastAPI inference service."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

# Load secrets from .env BEFORE importing the app — otherwise the
# LLMJudge constructor at startup() reads the env before dotenv has
# populated ANTHROPIC_API_KEY.
try:
    from dotenv import load_dotenv
    load_dotenv(REPO_ROOT / ".env")
except ImportError:
    pass  # dotenv is optional; ANTHROPIC_API_KEY can still come from the shell

import uvicorn  # noqa: E402

from src.config import load_config  # noqa: E402
from src.serve.app import app, startup  # noqa: E402


def _env_port() -> int | None:
    """$PORT, when the host sets one. Ignored if it is not a number."""
    raw = os.environ.get("PORT", "").strip()
    try:
        return int(raw) if raw else None
    except ValueError:
        return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.yaml")
    # Containers are told which port to bind at runtime, not in a checked-in
    # file: most hosts inject $PORT and route to it, and a service that
    # hardcodes 8000 is simply unreachable there. config.yaml already binds
    # 0.0.0.0, so only the port really needs overriding — --host is accepted
    # for symmetry. Precedence is flag > environment > config, so local
    # `make serve` behaves exactly as before.
    ap.add_argument("--host", default=os.environ.get("SOLEIQ_HOST"))
    ap.add_argument("--port", type=int, default=_env_port())
    args = ap.parse_args()
    cfg = load_config(args.config)
    startup(args.config)
    uvicorn.run(
        app,
        host=args.host or str(cfg["serve"]["host"]),
        port=args.port or int(cfg["serve"]["port"]),
        log_level="info",
    )


if __name__ == "__main__":
    main()

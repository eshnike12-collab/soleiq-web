# Reconstruction service for SoleIQ.
#
# Nothing here is optional decoration: this file exists because the service ran
# only on one laptop, and a container build is exactly the "clean machine" that
# exposed the four unpinned dependencies (pycolmap, open3d, trimesh,
# transformers) that `make setup` silently omitted.
FROM python:3.11-slim-bookworm

# System libraries the wheels do not carry.
#   libgl1 / libglib2.0-0 — OpenCV and Open3D both dlopen these at import.
#   libgomp1              — OpenMP runtime pycolmap and faiss link against.
#   ffmpeg                — OpenCV's VideoCapture demuxes the uploaded sweep
#                           with it; without it every scan fails at extraction
#                           with an unhelpful "could not open the video".
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgl1 \
      libglib2.0-0 \
      libgomp1 \
      ffmpeg \
      curl \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# PyTorch, FAISS and libomp each want their own thread pool, and on a small
# container they fight: the Makefile pins exactly these for the same reason and
# says model load can crash outright without them. One thread per library is
# also simply correct on a 1-2 vCPU box.
ENV OMP_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    KMP_DUPLICATE_LIB_OK=TRUE

# Where the depth model is baked. Set before the download so the weights land
# in an image layer rather than in a home directory that is never copied.
ENV HF_HOME=/opt/hf

WORKDIR /app

# Dependencies first so a source-only change does not re-resolve the whole
# ML stack — torch alone is most of the build time.
COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# Bake the depth model into the image.
#
# src/recon/depth.py pulls Depth-Anything-V2-Small from Hugging Face on first
# use behind an @lru_cache. On a cold container that download — roughly 100MB —
# happens in the middle of a patient's scan request, and times it out. Fetching
# it at build time turns a first-request stall into a build-time cost, and
# HF_HUB_OFFLINE below then guarantees no runtime call to huggingface.co at
# all: a scan must not depend on a third party being up.
RUN python -c "\
from transformers import AutoImageProcessor, AutoModelForDepthEstimation; \
m='depth-anything/Depth-Anything-V2-Small-hf'; \
AutoImageProcessor.from_pretrained(m); \
AutoModelForDepthEstimation.from_pretrained(m); \
print('depth model cached')"

COPY src/ ./src/
COPY config.yaml ./

# Scan videos, extracted frames and the SQLite index live here. Mount a volume
# at this path in production: these are patient photographs, and a container
# filesystem is neither durable nor a place to leave PHI.
ENV SOLEIQ_DATA_DIR=/data \
    SOLEIQ_DB_PATH=/data/soleiq.db

# Never reach out to huggingface.co at runtime: the weights are already in the
# image, and a scan must not fail because someone else's CDN is having a bad
# day.
ENV HF_HUB_OFFLINE=1

RUN mkdir -p /data

# Never run as root. A service that decodes untrusted video from the internet
# is precisely the one you do not want holding uid 0.
RUN useradd --create-home --uid 10001 soleiq \
 && chown -R soleiq:soleiq /app /data /opt/hf
USER soleiq

# Most hosts inject $PORT; 8000 matches the local `make serve`.
ENV PORT=8000
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1

# SOLEIQ_SCAN_SECRET is deliberately NOT given a default. Without it the
# service refuses every non-loopback request (src/serve/scan_auth.py), which
# is the correct behaviour for a container that would otherwise publish
# patient foot photographs on an open endpoint.
# scripts/serve.py, NOT `uvicorn src.serve.app:app` directly: serve.py calls
# startup() first, which loads the model and applies config.yaml (including
# the CORS origins). Bypassing it yields a server that answers /health and
# fails every real request.
CMD ["sh", "-c", "exec python scripts/serve.py --config config.yaml --host 0.0.0.0 --port ${PORT}"]

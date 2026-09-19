# SoleIQ foot-AI — single-command surface.
# All real work lives under src/ + scripts/; this file just wires it up.

PY ?= python3.11
VENV := .venv
PIP := $(VENV)/bin/pip
# Force single-threaded OpenMP/MKL. PyTorch + FAISS + macOS libomp can crash
# at model-load time when each library spawns its own thread pool. One thread
# is plenty for the inference loads this project runs.
PYTHON := OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 KMP_DUPLICATE_LIB_OK=TRUE $(VENV)/bin/python
CONFIG ?= config.yaml

.PHONY: help setup sample-data train eval serve export test clean

help:
	@echo "SoleIQ foot-AI — make targets"
	@echo "  setup        Create venv and install pinned dependencies"
	@echo "  sample-data  Generate synthetic foot images so the pipeline runs day 1"
	@echo "  train        Run k-fold training using the configured data source"
	@echo "  eval         Evaluate the held-out test set and write the HTML report"
	@echo "  serve        Start the FastAPI inference service on \$$PORT (default 8000)"
	@echo "  export       Export the trained model to ONNX with parity check"
	@echo "  test         Run pytest test suite"
	@echo "  perfusion    Run the Phase 0 rPPG harness on CLIP=<file|dir>"
	@echo "  perfusion-selftest  Synthesise known-pulse clips and verify the harness"
	@echo "  clean        Wipe venv, artifacts, sample data"

setup: $(VENV)/.installed
$(VENV)/.installed: requirements.txt
	$(PY) -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	@touch $@

sample-data: setup
	$(PYTHON) scripts/generate_sample_data.py --config $(CONFIG)

train: setup
	$(PYTHON) scripts/train.py --config $(CONFIG)

eval: setup
	$(PYTHON) scripts/evaluate.py --config $(CONFIG)

serve: setup
	$(PYTHON) scripts/serve.py --config $(CONFIG)

export: setup
	$(PYTHON) scripts/export_onnx.py --config $(CONFIG)

test: setup
	$(VENV)/bin/pytest -q tests/

build-similarity-index: setup
	$(PYTHON) scripts/build_similarity_index.py --config $(CONFIG)

# Phase 0 perfusion harness. CLIP may be a single video or a directory.
#   make perfusion CLIP=clips/03_dorsum_left.mov REF_BPM=72
CLIP ?= data/sample/perfusion
REF_BPM ?=
perfusion: setup
	$(PYTHON) -m src.perfusion.cli --video $(CLIP) --config $(CONFIG) --tiles \
		$(if $(REF_BPM),--reference-bpm $(REF_BPM),)

# End-to-end check with ground truth: a clip that HAS a 72 bpm pulse must be
# accepted, and one that has no pulse at all must be rejected.
perfusion-selftest: setup
	$(PYTHON) scripts/make_synthetic_perfusion_clip.py \
		--out data/sample/perfusion/synth_72 --bpm 72 --modulation 0.02
	$(PYTHON) scripts/make_synthetic_perfusion_clip.py \
		--out data/sample/perfusion/synth_nopulse --modulation 0.0
	$(PYTHON) -m src.perfusion.cli --video data/sample/perfusion \
		--config $(CONFIG) --reference-bpm 72

clean:
	rm -rf $(VENV) artifacts data/sample

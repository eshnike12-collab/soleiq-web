"""Wound segmentation: pixel masks, which is what measurement needs.

Separate from src/models (the 2-way classifier). A classifier answers "is
there an ulcer"; only a mask answers "how big is it", and the millimetre
figures in src/recon and lib/wound are computed from a boundary, not a label.
"""

/**
 * Signal-processing primitives ported from MetaPhys
 * (github.com/xliucs/MetaPhys — "MetaPhys: Few-Shot Adaptation for Non-Contact
 * Physiological Measurement", ACM CHIL 2021), specifically `utils.py`
 * (Tarvainen detrend, mag2db) and `post_process.py` (Butterworth bandpass,
 * periodogram, heart rate, SNR).
 *
 * The numbers here are deliberately faithful to the reference implementation —
 * same filter design, same detrend regularisation, same spectral grid — so a
 * TS-CAN checkpoint dropped into `tscan.ts` produces heart rates comparable to
 * the published results rather than to a re-invented pipeline.
 */

export interface Filter {
  /** Numerator coefficients, b[0..2]. */
  b: [number, number, number];
  /** Denominator coefficients, a[0] normalised to 1. */
  a: [number, number, number];
}

export function mean(x: ArrayLike<number>): number {
  let total = 0;
  for (let i = 0; i < x.length; i++) total += x[i];
  return x.length ? total / x.length : 0;
}

export function standardDeviation(x: ArrayLike<number>): number {
  if (x.length < 2) return 0;
  const mu = mean(x);
  let acc = 0;
  for (let i = 0; i < x.length; i++) acc += (x[i] - mu) ** 2;
  return Math.sqrt(acc / x.length);
}

/** `20 * log10(mag)` — utils.py:mag2db. */
export function mag2db(mag: number): number {
  return 20 * Math.log10(mag);
}

/**
 * Running sum. MetaPhys' network predicts the *derivative* of the pulse
 * (labels are diff-normalised), so post-processing integrates before
 * estimating rate — post_process.py:`detrend(np.cumsum(pred_window), 100)`.
 */
export function cumulativeSum(x: ArrayLike<number>): Float64Array {
  const out = new Float64Array(x.length);
  let acc = 0;
  for (let i = 0; i < x.length; i++) {
    acc += x[i];
    out[i] = acc;
  }
  return out;
}

/**
 * Detrending filter of Tarvainen et al. (2002), "An advanced detrending method
 * with application to HRV analysis" — utils.py:detrend.
 *
 * Reference builds the dense N×N system and inverts it. This solves the
 * identical system `(I + λ²DᵀD) z = signal` with a banded Cholesky instead:
 * DᵀD is symmetric pentadiagonal, so the factorisation is O(N) rather than
 * O(N³) — the same answer, fast enough to run per window on a phone.
 */
export function detrend(signal: ArrayLike<number>, lambda: number): Float64Array {
  const n = signal.length;
  const out = new Float64Array(n);
  if (n < 3) {
    for (let i = 0; i < n; i++) out[i] = signal[i];
    return out;
  }

  // Banded representation of M = I + λ²·DᵀD, where D is the (N-2)×N
  // second-difference operator with stencil [1, -2, 1].
  const d0 = new Float64Array(n).fill(1);
  const d1 = new Float64Array(Math.max(n - 1, 0));
  const d2 = new Float64Array(Math.max(n - 2, 0));
  const l2 = lambda * lambda;
  const stencil = [1, -2, 1];
  for (let k = 0; k <= n - 3; k++) {
    for (let p = 0; p < 3; p++) {
      for (let q = 0; q < 3; q++) {
        const i = k + p;
        const j = k + q;
        const value = l2 * stencil[p] * stencil[q];
        if (i === j) d0[i] += value;
        else if (j === i + 1) d1[i] += value;
        else if (j === i + 2) d2[i] += value;
      }
    }
  }

  // Banded Cholesky, bandwidth 2: M = L·Lᵀ with L lower-triangular.
  const c0 = new Float64Array(n);
  const c1 = new Float64Array(Math.max(n - 1, 0));
  const c2 = new Float64Array(Math.max(n - 2, 0));
  for (let i = 0; i < n; i++) {
    const m2 = i >= 2 ? d2[i - 2] : 0;
    const m1 = i >= 1 ? d1[i - 1] : 0;
    const lower2 = i >= 2 ? m2 / c0[i - 2] : 0;
    const lower1 =
      i >= 1 ? (m1 - (i >= 2 ? lower2 * c1[i - 2] : 0)) / c0[i - 1] : 0;
    const diag = d0[i] - lower1 * lower1 - lower2 * lower2;
    c0[i] = Math.sqrt(Math.max(diag, 1e-12));
    if (i >= 1) c1[i - 1] = lower1;
    if (i >= 2) c2[i - 2] = lower2;
  }

  // Forward substitution L·y = signal, then back substitution Lᵀ·z = y.
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let acc = signal[i];
    if (i >= 1) acc -= c1[i - 1] * y[i - 1];
    if (i >= 2) acc -= c2[i - 2] * y[i - 2];
    y[i] = acc / c0[i];
  }
  const z = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let acc = y[i];
    if (i + 1 < n) acc -= c1[i] * z[i + 1];
    if (i + 2 < n) acc -= c2[i] * z[i + 2];
    z[i] = acc / c0[i];
  }

  // utils.py returns (H − (H + λ²DᵀD)⁻¹)·signal with H = I.
  for (let i = 0; i < n; i++) out[i] = signal[i] - z[i];
  return out;
}

/**
 * First-order Butterworth bandpass, matching
 * `scipy.signal.butter(1, [low/fs*2, high/fs*2], btype="bandpass")`.
 *
 * Derived analytically rather than numerically: the 1st-order lowpass
 * prototype 1/(s+1) under the bandpass substitution and the bilinear transform
 * collapses to a single biquad, so no polynomial root-finding is needed.
 */
export function butterBandpass(lowHz: number, highHz: number, fs: number): Filter {
  const w1 = Math.tan((Math.PI * lowHz) / fs);
  const w2 = Math.tan((Math.PI * highHz) / fs);
  const bandwidth = w2 - w1;
  const centreSq = w1 * w2;
  const a0 = 1 + bandwidth + centreSq;
  return {
    b: [bandwidth / a0, 0, -bandwidth / a0],
    a: [1, (2 * centreSq - 2) / a0, (1 - bandwidth + centreSq) / a0],
  };
}

/** Transposed direct-form II single pass, seeded with `zi`. */
function lfilter(
  filter: Filter,
  x: ArrayLike<number>,
  zi: [number, number]
): Float64Array {
  const { b, a } = filter;
  const out = new Float64Array(x.length);
  let z0 = zi[0];
  let z1 = zi[1];
  for (let n = 0; n < x.length; n++) {
    const xn = x[n];
    const yn = b[0] * xn + z0;
    z0 = b[1] * xn + z1 - a[1] * yn;
    z1 = b[2] * xn - a[2] * yn;
    out[n] = yn;
  }
  return out;
}

/** Steady-state initial conditions — the biquad case of `scipy.signal.lfilter_zi`. */
function lfilterZi(filter: Filter): [number, number] {
  const { b, a } = filter;
  const B0 = b[1] - a[1] * b[0];
  const B1 = b[2] - a[2] * b[0];
  const det = 1 + a[1] + a[2];
  const z0 = Math.abs(det) < 1e-12 ? 0 : (B0 + B1) / det;
  const z1 = B1 - a[2] * z0;
  return [z0, z1];
}

function reversed(x: ArrayLike<number>): Float64Array {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[x.length - 1 - i];
  return out;
}

/**
 * Zero-phase forward-backward filtering — `scipy.signal.filtfilt` with its
 * default odd padding (padlen = 3·(max(len(a), len(b)) − 1) = 6 for a biquad)
 * and steady-state initial conditions.
 */
export function filtfilt(filter: Filter, x: ArrayLike<number>): Float64Array {
  const padlen = 6;
  const n = x.length;
  if (n <= padlen) {
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = x[i];
    return out;
  }

  // Odd extension: mirror through the endpoint value.
  const padded = new Float64Array(n + 2 * padlen);
  for (let i = 0; i < padlen; i++) padded[i] = 2 * x[0] - x[padlen - i];
  for (let i = 0; i < n; i++) padded[padlen + i] = x[i];
  for (let i = 0; i < padlen; i++) {
    padded[padlen + n + i] = 2 * x[n - 1] - x[n - 2 - i];
  }

  const zi = lfilterZi(filter);
  const forward = lfilter(filter, padded, [zi[0] * padded[0], zi[1] * padded[0]]);
  const flipped = reversed(forward);
  const backward = lfilter(filter, flipped, [
    zi[0] * flipped[0],
    zi[1] * flipped[0],
  ]);
  const restored = reversed(backward);

  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = restored[padlen + i];
  return out;
}

export interface Spectrum {
  /** Frequencies in Hz. */
  freqs: Float64Array;
  /** One-sided power spectral density at those frequencies. */
  pxx: Float64Array;
}

/**
 * One-sided periodogram over a frequency band, matching
 * `scipy.signal.periodogram(x, fs, nfft=..., detrend=False)` on the bins it
 * returns (boxcar window, density scaling, one-sided doubling).
 *
 * Evaluated as a direct DFT over just the requested band. MetaPhys uses
 * nfft = 4·window_size (1440 bins for a 12 s window), which is not a power of
 * two; computing ~170 in-band bins directly keeps the exact frequency grid
 * without a mixed-radix FFT.
 */
export function periodogramBand(
  x: ArrayLike<number>,
  fs: number,
  nfft: number,
  lowHz: number,
  highHz: number
): Spectrum {
  const n = x.length;
  const kMin = Math.max(1, Math.ceil((lowHz * nfft) / fs));
  const kMax = Math.min(Math.floor(nfft / 2), Math.floor((highHz * nfft) / fs));
  const count = Math.max(kMax - kMin + 1, 0);
  const freqs = new Float64Array(count);
  const pxx = new Float64Array(count);
  const scale = 1 / (fs * n);
  for (let k = kMin; k <= kMax; k++) {
    const omega = (-2 * Math.PI * k) / nfft;
    let re = 0;
    let im = 0;
    for (let t = 0; t < n; t++) {
      const angle = omega * t;
      re += x[t] * Math.cos(angle);
      im += x[t] * Math.sin(angle);
    }
    const index = k - kMin;
    freqs[index] = (k * fs) / nfft;
    // One-sided: every bin below Nyquist carries twice the power.
    pxx[index] = (re * re + im * im) * scale * (k === nfft / 2 ? 1 : 2);
  }
  return { freqs, pxx };
}

/** Index of the largest value in `values`, or -1 when empty. */
export function argmax(values: ArrayLike<number>): number {
  let best = -1;
  let bestValue = -Infinity;
  for (let i = 0; i < values.length; i++) {
    if (values[i] > bestValue) {
      bestValue = values[i];
      best = i;
    }
  }
  return best;
}

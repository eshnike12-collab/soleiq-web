"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSoleiqStore } from "@/lib/store";
import { SCAN_DURATION_MS, SCAN_LABELS } from "@/lib/simulators/scanCapture";
import { ScanCoverageBar } from "@/components/capture/ScanCoverageBar";
import {
  emptyHeightmap,
  reconstructFromVideo,
  type FootHeightmap,
} from "@/lib/footReconstruct";
import {
  DETECTION_THRESHOLD,
  detectFootInVideo,
  summarizeReasons,
  type DetectionMetrics,
} from "@/lib/footDetection";
import { countFacesInVideo } from "@/lib/faceDetection";
import * as THREE from "three";

const GRID = 48;
const FRAME_INTERVAL_MS = 250;

export function ScanAnimation({ side }: { side: "left" | "right" }) {
  const scanPath = useSoleiqStore((s) => s.scanPath);
  const addMesh = useSoleiqStore((s) => s.addMesh);
  const goNext = useSoleiqStore((s) => s.goNext);

  const [coverage, setCoverage] = useState(0);
  const [streamReady, setStreamReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [heightmap, setHeightmap] = useState<FootHeightmap>(() =>
    emptyHeightmap(GRID)
  );
  const [reconstructedAt, setReconstructedAt] = useState(0);
  const [latestMetrics, setLatestMetrics] = useState<DetectionMetrics | null>(
    null
  );
  const bestMetrics = useRef<DetectionMetrics | null>(null);
  const detectedFrameCount = useRef(0);
  const faceDetected = useRef(false);
  const lastFaceCheck = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const advanced = useRef(false);

  const totalMs = SCAN_DURATION_MS[scanPath];

  // Live webcam stream — both for the visual backdrop and the frame source
  // we sample for foot mesh reconstruction.
  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | undefined;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStreamReady(true);
        }
      } catch {
        setFallback(true);
        setStreamReady(true);
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Sample frames during the scan window. Each successful reconstruction
  // becomes the latest heightmap which drives the 3D mesh. We also accumulate
  // a running maximum so the displayed mesh tends toward the best view.
  useEffect(() => {
    if (!streamReady) return;
    const start = Date.now();
    const sampleTimer = setInterval(() => {
      if (fallback) return;
      const v = videoRef.current;
      if (!v) return;

      // Parallel face-detector probe on a slower cadence.
      if (Date.now() - lastFaceCheck.current > 500) {
        lastFaceCheck.current = Date.now();
        countFacesInVideo(v).then((n) => {
          if (n !== null) faceDetected.current = n > 0;
        });
      }

      // Gate every reconstruction on real foot detection AND no-face.
      const m = detectFootInVideo(v);
      if (m) {
        if (faceDetected.current && !m.reasons.includes("face_detected")) {
          m.reasons = ["face_detected", ...m.reasons];
        }
        setLatestMetrics(m);
        if (
          m.detected &&
          m.confidence >= DETECTION_THRESHOLD &&
          !faceDetected.current
        ) {
          detectedFrameCount.current += 1;
          if (
            !bestMetrics.current ||
            m.confidence > bestMetrics.current.confidence
          ) {
            bestMetrics.current = m;
          }
        }
      }

      // Only update the mesh from frames with a foot AND no face.
      if (
        !m ||
        !m.detected ||
        m.confidence < DETECTION_THRESHOLD ||
        faceDetected.current
      )
        return;

      const next = reconstructFromVideo(v, GRID);
      if (!next) return;
      setHeightmap((prev) => mergeMax(prev, next));
      setReconstructedAt(Date.now());
    }, FRAME_INTERVAL_MS);

    const coverageTimer = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(95, (elapsed / totalMs) * 95);
      setCoverage(pct);
      if (pct >= 95 && !advanced.current) {
        advanced.current = true;
        clearInterval(sampleTimer);
        clearInterval(coverageTimer);
        const best = bestMetrics.current;
        const meshValid =
          !!best &&
          best.detected &&
          best.confidence >= DETECTION_THRESHOLD &&
          detectedFrameCount.current >= 3;
        // Persist mesh ONLY when a foot was actually detected during the scan.
        // Empty / failed scans must not silently turn into a placeholder mesh —
        // downstream analysis must see they failed and route to retry.
        setHeightmap((finalMap) => {
          addMesh({
            side,
            coveragePct: meshValid ? 95 : 0,
            seedSignature: `seed_${Date.now()}_${side}`,
            capturedAt: Date.now(),
            heightmap: meshValid
              ? {
                  width: finalMap.width,
                  height: finalMap.height,
                  heights: finalMap.heights,
                  silhouettePx: finalMap.silhouettePx,
                }
              : undefined,
            detection: best
              ? {
                  detected: best.detected,
                  confidence: best.confidence,
                  silhouettePx: best.silhouettePx,
                  brightness: best.brightness,
                  blur: best.blur,
                  reasons: best.reasons,
                }
              : {
                  detected: false,
                  confidence: 0,
                  silhouettePx: 0,
                  reasons: ["no_foot"],
                },
          });
          return finalMap;
        });
        setTimeout(goNext, 700);
      }
    }, 100);

    return () => {
      clearInterval(sampleTimer);
      clearInterval(coverageTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamReady, fallback, scanPath, side]);

  return (
    <div className="flex h-full flex-col gap-3">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
          {side === "right" ? "Right foot" : "Left foot"} — 3D scan
        </p>
        <h1 className="mt-0.5 text-lg font-semibold text-warmGray-800">
          {SCAN_LABELS[scanPath]}
        </h1>
        <p className="text-xs text-warmGray-600">
          Slowly arc the device around the foot. The mesh builds from the
          camera as you move.
        </p>
      </header>

      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-warmGray-800">
        {fallback ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/sample-foot.svg"
            alt="Sample"
            className="h-full w-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        )}
        <div className="pointer-events-none absolute inset-0">
          <Canvas
            camera={{ position: [0, 2.6, 3.5], fov: 40 }}
            gl={{ alpha: true, antialias: true }}
            style={{ background: "transparent" }}
          >
            <ambientLight intensity={0.55} />
            <directionalLight position={[3, 4, 5]} intensity={0.9} />
            <directionalLight position={[-3, 2, -2]} intensity={0.4} />
            <FootMesh heightmap={heightmap} coverage={coverage} />
          </Canvas>
        </div>
        <ScanGrid coverage={coverage} />
        <DiagnosticPill
          metrics={latestMetrics}
          updatedAt={reconstructedAt}
        />
      </div>

      <ScanCoverageBar value={coverage} />
    </div>
  );
}

/**
 * Reconstructed foot mesh. The heightmap drives plane vertex z, and the mesh
 * gently rotates so the clinician can see the depth profile while scanning.
 */
function FootMesh({
  heightmap,
  coverage,
}: {
  heightmap: FootHeightmap;
  coverage: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const w = heightmap.width;
    const h = heightmap.height;
    const geom = new THREE.PlaneGeometry(2.0, 2.6, w - 1, h - 1);
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const heightScale = 0.55;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const vIdx = y * w + x;
        const hv = heightmap.heights[vIdx] ?? 0;
        pos.setZ(vIdx, hv * heightScale);
      }
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();
    return geom;
  }, [heightmap]);

  // Slowly rotate so the depth profile reads from multiple angles.
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.z = Math.sin(t * 0.45) * 0.2;
    meshRef.current.rotation.x = -Math.PI / 2.6 + Math.sin(t * 0.6) * 0.06;
  });

  // Material opacity ramps with coverage so the mesh fades in as scan progresses.
  const opacity = Math.max(0.35, Math.min(0.95, coverage / 95));

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 0.2, 0]}>
      <meshStandardMaterial
        color="#9FE1CB"
        roughness={0.45}
        metalness={0.1}
        transparent
        opacity={opacity}
        emissive="#0F6E56"
        emissiveIntensity={0.25}
        side={THREE.DoubleSide}
        wireframe={coverage < 30}
      />
    </mesh>
  );
}

function ScanGrid({ coverage }: { coverage: number }) {
  const y = (coverage / 95) * 100;
  return (
    <>
      <div
        className="pointer-events-none absolute left-0 right-0 h-[2px] bg-teal-100/80 shadow-[0_0_12px_2px_rgba(159,225,203,0.6)]"
        style={{ top: `${y}%` }}
      />
      <div className="pointer-events-none absolute inset-0 mix-blend-screen opacity-25 bg-[linear-gradient(transparent_95%,rgba(159,225,203,0.4)_95%)] bg-[length:100%_8px]" />
    </>
  );
}

function DiagnosticPill({
  metrics,
  updatedAt,
}: {
  metrics: DetectionMetrics | null;
  updatedAt: number;
}) {
  if (!metrics) {
    return (
      <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2 py-1 text-[10px] font-medium text-warmGray-100 backdrop-blur-sm">
        Acquiring…
      </span>
    );
  }
  const detected = metrics.detected && metrics.confidence >= DETECTION_THRESHOLD;
  const reason = summarizeReasons(metrics.reasons);
  return (
    <span
      className={`absolute right-3 top-3 rounded-full px-2 py-1 text-[10px] font-medium backdrop-blur-sm ${
        detected
          ? "bg-teal-400/85 text-teal-950"
          : "bg-amber-400/85 text-amber-950"
      }`}
      title={`confidence ${(metrics.confidence * 100).toFixed(0)}% · ${updatedAt ? "tracking" : "idle"}`}
    >
      {detected
        ? `Foot detected · ${(metrics.confidence * 100).toFixed(0)}%`
        : reason}
    </span>
  );
}

/**
 * Element-wise max so the final mesh tends to the best (largest) silhouette
 * we observed during the scan — avoids dropouts when the user briefly tilts
 * the device away from the foot.
 */
function mergeMax(a: FootHeightmap, b: FootHeightmap): FootHeightmap {
  if (a.silhouettePx === 0) return b;
  if (b.silhouettePx === 0) return a;
  const out: FootHeightmap = {
    width: b.width,
    height: b.height,
    heights: new Array(b.heights.length),
    capturedAt: b.capturedAt,
    silhouettePx: Math.max(a.silhouettePx, b.silhouettePx),
  };
  for (let i = 0; i < b.heights.length; i++) {
    out.heights[i] = Math.max(a.heights[i] ?? 0, b.heights[i]);
  }
  return out;
}

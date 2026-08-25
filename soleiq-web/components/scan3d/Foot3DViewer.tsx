"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls, useGLTF } from "@react-three/drei";
import { AlertTriangle, Box } from "lucide-react";

/**
 * Renders a reconstructed foot mesh.
 *
 * Every failure state is explicit rather than falling back to a placeholder
 * shape. A procedural or stand-in foot shown where a real reconstruction was
 * expected is indistinguishable from a real one to the person reading it, so
 * this renders nothing at all instead and says why.
 */

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export function Foot3DViewer({
  glbUrl,
  className = "",
}: {
  glbUrl: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!glbUrl) {
    return (
      <div
        className={`flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-3xl bg-surface-sunken px-6 text-center ${className}`}
      >
        <Box className="h-8 w-8 text-ink-faint" />
        <p className="text-sm font-semibold text-ink">No 3D model yet</p>
        <p className="max-w-xs text-xs leading-snug text-ink-soft">
          Complete a scan and the reconstructed foot will appear here.
        </p>
      </div>
    );
  }

  if (failed) {
    return (
      <div
        className={`flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-3xl bg-warn-soft px-6 text-center ${className}`}
      >
        <AlertTriangle className="h-8 w-8 text-warn" />
        <p className="text-sm font-semibold text-ink">Model could not be loaded</p>
        <p className="max-w-xs text-xs leading-snug text-ink-soft">
          The reconstruction finished but the file could not be read. Check the
          scan service is running.
        </p>
      </div>
    );
  }

  return (
    <div className={`aspect-square w-full overflow-hidden rounded-3xl bg-slate-900 ${className}`}>
      <Canvas
        camera={{ position: [0, 0.15, 0.45], fov: 40 }}
        onError={() => setFailed(true)}
      >
        {/* Flat, even lighting. The mesh carries vertex colours from the
            photographs, so dramatic lighting would misrepresent skin tone. */}
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 4, 3]} intensity={0.6} />
        <directionalLight position={[-2, -1, -3]} intensity={0.3} />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.15}>
            <Model url={glbUrl} />
          </Bounds>
        </Suspense>
        <OrbitControls makeDefault enablePan={false} minDistance={0.15} maxDistance={1.2} />
      </Canvas>
    </div>
  );
}

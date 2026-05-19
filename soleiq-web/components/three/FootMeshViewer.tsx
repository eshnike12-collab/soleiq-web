"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import { useSoleiqStore } from "@/lib/store";
import { buildFootGeometry } from "./footMesh";
import * as THREE from "three";

export function FootMeshViewer({ side }: { side: "left" | "right" }) {
  const visit = useSoleiqStore((s) => s.currentVisit);
  const heightmap = useMemo(
    () =>
      visit?.meshes.find((m) => m.side === side)?.heightmap ?? null,
    [visit, side]
  );

  const reconstructedGeom = useMemo(() => {
    if (!heightmap) return null;
    const { width: w, height: h, heights } = heightmap;
    const geom = new THREE.PlaneGeometry(2.0, 2.6, w - 1, h - 1);
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const heightScale = 0.6;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        pos.setZ(idx, (heights[idx] ?? 0) * heightScale);
      }
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();
    return geom;
  }, [heightmap]);

  const fallbackGeom = useMemo(
    () => (reconstructedGeom ? null : buildFootGeometry()),
    [reconstructedGeom]
  );

  return (
    <div className="aspect-square w-full overflow-hidden rounded-2xl bg-warmGray-800">
      <Canvas
        camera={
          reconstructedGeom
            ? { position: [0, 2.5, 3], fov: 40 }
            : { position: [0, 0, 8], fov: 40 }
        }
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <directionalLight position={[-5, -3, 2]} intensity={0.4} />
        {reconstructedGeom ? (
          <mesh
            geometry={reconstructedGeom}
            rotation={[
              -Math.PI / 2.4,
              0,
              side === "left" ? Math.PI : 0,
            ]}
            position={[0, 0.2, 0]}
          >
            <meshStandardMaterial
              color="#9FE1CB"
              roughness={0.5}
              metalness={0.05}
              side={THREE.DoubleSide}
              emissive="#0F6E56"
              emissiveIntensity={0.12}
            />
          </mesh>
        ) : (
          <mesh
            geometry={fallbackGeom!}
            rotation={[0, 0, side === "left" ? Math.PI : 0]}
          >
            <meshStandardMaterial
              color="#9FE1CB"
              roughness={0.55}
              metalness={0.05}
            />
          </mesh>
        )}
        <OrbitControls enablePan={false} enableZoom={false} />
      </Canvas>
    </div>
  );
}

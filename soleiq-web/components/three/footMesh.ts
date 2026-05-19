import * as THREE from "three";

export function buildFootGeometry(): THREE.BufferGeometry {
  // Procedural foot — extruded ellipse with toe bumps. Demo placeholder.
  const shape = new THREE.Shape();
  const segments = 64;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * Math.PI * 2;
    let x = Math.cos(angle) * 1.2;
    let y = Math.sin(angle) * 3.0;
    if (y > 2.4) {
      const lobe = Math.sin((y - 2.4) * 4);
      x += lobe * 0.15 * Math.sign(x || 1);
    }
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.6,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelSegments: 4,
    curveSegments: 24,
  });
  geom.center();
  geom.computeVertexNormals();
  return geom;
}

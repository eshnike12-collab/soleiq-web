/**
 * The particle shader.
 *
 * One draw call, one THREE.Points. Every particle carries its own morph pair
 * (positionA → positionB), its own stagger offset, and its own size, so the
 * cloud flows between shapes instead of snapping in unison.
 *
 * GLSL1 on purpose — THREE.ShaderMaterial defaults to it, and nothing here
 * needs WebGL2.
 */

/** Ashima's simplex noise (MIT), used to build a divergence-free curl field. */
const SIMPLEX = /* glsl */ `
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`

/**
 * Curl of a simplex potential field. Divergence-free, so particles swirl and
 * never bunch up or pump outward the way plain noise displacement does.
 *
 * SIMPLE_NOISE trades the three-axis potential for a single-axis approximation:
 * 3 noise lookups instead of 6, for the mobile/low tier.
 */
const CURL = /* glsl */ `
vec3 curlNoise(vec3 p) {
  const float e = 0.12;

  #ifdef SIMPLE_NOISE
    float n1 = snoise(p + vec3(0.0, e, 0.0));
    float n2 = snoise(p - vec3(0.0, e, 0.0));
    float n3 = snoise(p + vec3(0.0, 0.0, e));
    return normalize(vec3(n1 - n2, n3 - n1, n2 - n3) + 1e-5);
  #else
    float x0 = snoise(vec3(p.x, p.y - e, p.z));
    float x1 = snoise(vec3(p.x, p.y + e, p.z));
    float y0 = snoise(vec3(p.x, p.y, p.z - e));
    float y1 = snoise(vec3(p.x, p.y, p.z + e));
    float z0 = snoise(vec3(p.x - e, p.y, p.z));
    float z1 = snoise(vec3(p.x + e, p.y, p.z));

    float dx = (x1 - x0) - (y1 - y0);
    float dy = (y1 - y0) - (z1 - z0);
    float dz = (z1 - z0) - (x1 - x0);
    return normalize(vec3(dx, dy, dz) + 1e-5);
  #endif
}
`

export const PARTICLE_VERT = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uProgress;     // 0..1 within the current morph
uniform float uSpread;       // how much of the timeline the stagger occupies
uniform float uTurbulence;   // peaks mid-morph, settles to ~0 when formed
uniform float uNoiseScale;
uniform float uDrift;        // idle breathing once a shape has settled
uniform float uSize;
uniform float uPixelRatio;
uniform vec3  uMouse;        // world-space cursor
uniform float uMouseRadius;
uniform float uMouseStrength;
uniform float uDissolve;     // 0 formed, 1 scattered, used by the loader
uniform float uWave;         // 0 off; 1 sends a colour wave across the shape
uniform float uFlight;       // 0 shape held, 1 mid-transition

attribute vec3  positionA;
attribute vec3  positionB;
attribute vec3  aScatter;
attribute float aRandom;
attribute float aSize;
attribute float aDelay;
// x = shade ramp position, y = share of the AI accent. One pair per shape, so
// they morph with the geometry rather than snapping at the scene boundary.
attribute vec2  aShadeA;
attribute vec2  aShadeB;

varying float vGlow;
varying float vRandom;
varying float vDepth;
varying float vWave;
varying float vTone;
varying float vAi;
varying float vFlight;

${SIMPLEX}
${CURL}

void main() {
  // Per-particle stagger: each one starts its journey at aDelay and finishes
  // uSpread later, so the shape flows rather than snapping.
  float t = smoothstep(aDelay, aDelay + uSpread, uProgress);

  vec3 pos = mix(positionA, positionB, t);
  pos = mix(pos, aScatter, uDissolve);

  // How far this particle has to travel, and where it is in that journey.
  float travel = length(positionB - positionA);
  float burst = sin(t * 3.14159265);

  vec3 c = curlNoise(pos * uNoiseScale + vec3(uTime * 0.05));

  // Turbulence spikes mid-morph and settles to nothing when the shape is held.
  pos += c * (uTurbulence * burst * (0.35 + aRandom * 0.9));
  // A formed shape still breathes.
  pos += c * uDrift * (0.4 + aRandom * 0.6);

  // Cursor repulsion, world-space, smooth falloff.
  vec3 away = pos - uMouse;
  float d = length(away);
  float push = smoothstep(uMouseRadius, 0.0, d) * uMouseStrength;
  pos += normalize(away + 1e-4) * push;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // Size attenuation by depth.
  gl_PointSize = uSize * aSize * uPixelRatio * (1.0 / max(0.35, -mv.z));

  // Particles that are moving fastest right now glow — velocity is
  // (distance travelled) x (how mid-journey it is).
  vGlow = clamp(burst * smoothstep(0.05, 1.4, travel), 0.0, 1.0);
  vRandom = aRandom;
  vDepth = clamp((-mv.z - 2.0) / 8.0, 0.0, 1.0);

  // Where this particle sits across the shape, so a wave can travel through it
  // rather than the whole thing changing colour at once.
  vWave = pos.x * 0.75 + pos.y * 0.25;

  // Shade and accent travel with the particle between shapes.
  vec2 shade = mix(aShadeA, aShadeB, t);
  vTone = shade.x;
  vAi = shade.y;

  // How "in flight" this particle is: the scene-wide transition, lifted for the
  // ones actually moving. This is what turns the cloud white while it travels.
  vFlight = clamp(max(uFlight * (0.45 + 0.55 * burst), burst * smoothstep(0.02, 0.9, travel)), 0.0, 1.0);
}
`

export const PARTICLE_FRAG = /* glsl */ `
precision highp float;

uniform vec3  uColorDeep;   // darkest blue in the ramp
uniform vec3  uColorCore;   // mid blue
uniform vec3  uColorHi;     // light blue
uniform vec3  uColorHot;    // white — what the cloud becomes in flight
uniform vec3  uColorAi;     // violet accent, where the model is acting
uniform float uOpacity;
uniform float uAdditive;    // 1 on dark ground, 0 on light
uniform float uWave;        // 0 off; 1 runs the colour wave
uniform float uTime;

varying float vGlow;
varying float vRandom;
varying float vDepth;
varying float vWave;
varying float vTone;
varying float vAi;
varying float vFlight;

void main() {
  // Soft circular sprite.
  float d = length(gl_PointCoord - vec2(0.5));
  float alpha = smoothstep(0.5, 0.06, d);
  if (alpha < 0.01) discard;

  // ── Formed: a three-stop blue ramp driven by the shape's own structure ──
  // Tone comes from which PART of the picture a particle belongs to, so a
  // settled shape has real light and shade — the phone body dark against its
  // lit screen — instead of one flat blue speckled at random.
  float tone = clamp(vTone + (vRandom - 0.5) * 0.06, 0.0, 1.0);
  vec3 col = mix(uColorDeep, uColorCore, smoothstep(0.0, 0.55, tone));
  col = mix(col, uColorHi, smoothstep(0.45, 1.0, tone));

  // Anything the system is doing (the mesh, the findings, the record, the
  // stream between them) is the accent colour outright, not tinted with it.
  // The body of the picture stays on the purple ramp above.
  col = mix(col, uColorAi, vAi * 0.96);

  // A wave of the brand colours travelling across the shape. Only the closing
  // logo asks for it. The wordmark sits at the top of the tone ramp, which is
  // white there, so the wave runs through the mark and leaves the word alone.
  if (uWave > 0.001) {
    // Four stops cycling in order, so the wave reads as distinct bands of the
    // brand colours travelling across the mark rather than one blended average.
    float w = fract((vWave * 1.5 - uTime * 0.5) / 6.2831853);
    vec3 deepBlue  = vec3(0.043, 0.086, 0.400);
    vec3 blue      = vec3(0.149, 0.388, 0.921);
    vec3 lightBlue = vec3(0.149, 0.969, 0.992);
    vec3 violet    = vec3(0.643, 0.373, 0.910);
    vec3 waveCol = mix(deepBlue, blue, smoothstep(0.0, 0.25, w));
    waveCol = mix(waveCol, lightBlue, smoothstep(0.25, 0.5, w));
    waveCol = mix(waveCol, violet, smoothstep(0.5, 0.75, w));
    waveCol = mix(waveCol, deepBlue, smoothstep(0.75, 1.0, w));
    // Held off the white end of the ramp, so the wordmark stays white.
    col = mix(col, waveCol, uWave * 0.92 * (1.0 - smoothstep(0.78, 0.97, tone)));
  }

  // ── In flight: white ────────────────────────────────────────────────────
  // Particles crossing between shapes read as light, not as material, so the
  // cloud whitens through the morph and settles back into colour as it lands.
  col = mix(col, uColorHot, smoothstep(0.05, 0.95, vFlight) * 0.92);
  col = mix(col, uColorHot, vGlow * 0.35);

  // Depth fade keeps the far side of the cloud from muddying the near side.
  float depthFade = mix(1.0, 0.45, vDepth);

  // Lighter parts of the picture also read as brighter, which is most of what
  // makes a point cloud look shaded rather than dotted.
  float a = alpha * uOpacity * depthFade * (0.86 + 0.14 * tone) * (0.8 + 0.2 * vRandom);

  // Under additive blending alpha is intensity. Keep a settled shape at full
  // strength — the glow is a lift during the morph, not a dimming the rest of
  // the time. The in-flight lift is what gives the transition its flash.
  a = mix(a, a * (1.0 + 1.1 * vGlow + 0.55 * vFlight), uAdditive);

  gl_FragColor = vec4(col, a);
}
`
